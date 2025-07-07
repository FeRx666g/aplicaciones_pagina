/*
Arduino 2, Trabajo de Titulación.
Fecha de inicio: 28 de febrero de 2025.
*/

// Librerías
#include <Ethernet.h> // Para la coneción ethernet.
#include <PubSubClient.h> // Para la comunicación MQTT.
#include <SoftwareSerial.h> // Para la comuncación serial.
#include <TaskScheduler.h> // Para la gestión de tareas.
#include <Adafruit_INA219.h> // Para el sensor de corriente y voltaje.
/* #include <String.h> // Para manejar cadenas de texto. */

// Definir pines para comunicación serial de software
/* #define RX_PIN 4 // Pin para recibir datos (RX)
#define TX_PIN 5 // Pin para transmitir datos (TX) */

#define serialPort Serial1  // Usa RX1 = pin 19, TX1 = pin 18


// Creamos el puerto serial por software globalmente
//SoftwareSerial serialPort(RX_PIN, TX_PIN);

//Clase para el mensaje.
/*class Mensaje {
    char mensaje[125];
    public:
        //Método constructor.
        Mensaje(const char* msg) {
            strncpy(mensaje, msg, sizeof(mensaje) - 1); //Copia el mensaje a la variable.
            mensaje[sizeof(mensaje) - 1] = '\0'; //Termina la cadena.
        }
        //Método para obtener el mensaje.
        const char* getMensaje() const {
            return mensaje;
        }
}; //Fin de la clase Mensaje.*/
/* 
//Clase que construye el mensaje.
class MensajeBuilder{
    private:
        char mensaje[105];
        size_t capacidad = sizeof(mensaje);
        size_t indice = 0;
    public:
        MensajeBuilder() : indice(0){
            mensaje[0] = '\0';
        }
        //Junta los valores de todos los sensores.  
        void agregar(const char* componente, const char* valor) {
            int capacidad = sizeof(mensaje) - indice;

            int espacioDisponible = capacidad - indice;
            int resultado = snprintf(mensaje + indice, espacioDisponible, "%s:%s", componente, valor);

            if (resultado < 0 || (size_t)resultado >= espacioDisponible) {
                Serial.println(F("Error: No hay espacio para componente/valor."));
                return; // Salir
            }
            indice += resultado;
        }
        // Método para construir el mensaje final y devolver un objeto Mensaje.
        void construir() {
            // Solo agregar #; y ;$% si hay contenido en el mensaje
            if (indice > 0) {
                char resultado[105]; // Aumentado para mayor seguridad
                snprintf(resultado, sizeof(resultado), "%s;$%", mensaje);
                snprintf(mensaje, sizeof(mensaje), "%s", resultado);
            }
        }

        const char* getMensaje() const {
            return mensaje;
        }

        // Método para limpiar el mensaje.
        void limpiar() {
            indice = 0;
            mensaje[0] = '\0';
        }

}; //Fin de la clase MensajeBuilder. */

class MensajeBuilder {
private:
    char mensaje[200]; // único buffer
    size_t indice = 0;

public:
    MensajeBuilder() {
        limpiar();
    }

    void agregar(const char* componente, const char* valor) {
        // Agrega separador si no es el primero
        if (indice > 0 && indice < sizeof(mensaje) - 1) {
            mensaje[indice++] = ';';
        }

        int espacio = sizeof(mensaje) - indice;
        int escrito = snprintf(mensaje + indice, espacio, "%s:%s", componente, valor);

        if (escrito < 0 || escrito >= espacio) {
            Serial.println(F("Error: mensaje truncado"));
            mensaje[sizeof(mensaje) - 1] = '\0';
            return;
        }

        indice += escrito;
    }

    void construir() {
        if (indice < sizeof(mensaje) - 4) { // espacio para # y ;$%
            // Mueve el contenido a la derecha y antepone "#;"
            memmove(mensaje + 2, mensaje, indice + 1); // +1 para '\0'
            mensaje[0] = '#';
            mensaje[1] = ';';
            indice += 2;

            snprintf(mensaje + indice, sizeof(mensaje) - indice, ";$%%");
        } else {
            Serial.println(F("Error: mensaje demasiado largo"));
        }
    }

    const char* getMensaje() const {
        return mensaje;
    }

    void limpiar() {
        indice = 0;
        mensaje[0] = '\0';
    }
}; // Fin de la clase MensajeBuilder


// Interfaz para inicializar los componentes
class IInicializador {
public:
    virtual void init() = 0;
    virtual ~IInicializador() {}
}; //Fin de la clase IInicializador.

// Interfaz para el Observador en el patrón Observator.
class Observador {
public:
    virtual void update(const char* sensor, const char* valor) = 0;
    virtual ~Observador() {}
}; //Fin de la clase Observador.


// Interfaz para el Sujeto en el patrón Observator.
class Sujeto {
private:
    Observador* observadores[5]; // Array de punteros a Observador
    int numObservadores = 0; // Contador de observadores

public:
    //Método para ejecutar la notificación de todos lso componentes.  -- Simplificado
    virtual void componenteNotificar() = 0;
    // Método para agregar un observador.
    void agregarObservador(Observador* observador) {
        if (numObservadores < 10) {
            observadores[numObservadores++] = observador;
        } else {
            Serial.println("Limite de observadores alcanzado.");
        }
    }

    // Método para quitar el observador. (No se usa en esta versión, pero se deja para mantener la estructura)
    void quitarObservador(Observador* observador) {
        for (int i = 0; i < numObservadores; i++) {
            if (observadores[i] == observador) {
                for (int j = i; j < numObservadores - 1; j++) {
                    observadores[j] = observadores[j + 1];
                }
                numObservadores--;
                break;
            }
        }
    }

protected:
    // Método para notificar el valor de los sensores.
    void notificar(const char* sensor, const char* valor) {
        for (int i = 0; i < numObservadores; i++) {
            observadores[i]->update(sensor, valor);
        }
    }
}; //Fin de la clase Sujeto.

// Interfaz para el Actuador.
class IActuador {
public:
    virtual void ejecutarAccion(int valor) = 0;
    virtual ~IActuador() {}
};

// Interfaz para la estrategia de conexión.

//---------------------------------------------------//
//---- Clase para el Componente Sensor de Viento ----//
//---------------------------------------------------//
/*class SensorVientoComponent : public Sujeto, public IInicializador {
    private:
        int pinViento;
    public:
        //Método constructor.
        SensorVientoComponent(int pin) : pinViento(pin) {}
        //Método para inicializar el sensor de viento.
        void init() override {
        }
        //Método para obtener el valor del sensor de viento.
        int getValorViento() {
            float voltaje = (analogRead(pinViento) * 5.0) / 1024.0;
            float kph = (voltaje * 25);
            kph = kph * 3.6;
            return kph;
        }
        //Método para notificar el valor del sensor de viento.
        void componenteNotificar() override {
            char nombreSensor[10];
            char valor[15];
            snprintf(nombreSensor, sizeof(nombreSensor), "Vn:%d", pinViento);
            int valorViento = getValorViento();
            snprintf(valor, sizeof(valor), "%d", valorViento);
            notificar(nombreSensor, valor);
        }
};*/

//----------------------------------------//
//---- Clase para el componente Reloj ----//
//----------------------------------------//
/*class RelojComponent : public Sujeto, public IInicializador {
    private:
        RTC_DS3231& rtc;
    public:
        //Método constructor.
        RelojComponent(RTC_DS3231& _rtc) : rtc(_rtc) {}
        //Método para inicializar el reloj.
        void init() override {
            rtc.begin();
            if(!rtc.begin()){
                
            }
        }
        //Método para obtener la fecha y hora.
        void componenteNotificar() override {
            DateTime now = rtc.now();
            char fechaHora[50];
            snprintf(fechaHora, sizeof(fechaHora), "%04d-%02d-%02dT%02d:%02d:%02d", now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
            Serial.print("Fecha y hora: ");
            Serial.println(fechaHora);
            //notificar("Fecha y hora:", fechaHora);
        }

}; //Fin de la clase RelojComponent.*/


//-----------------------------------------//
//---- Clase para Inicializar Ethernet ----//
//-----------------------------------------//
class EthernetInicializador : public IInicializador {
    private:
        byte mac[6];
        IPAddress ip;
        bool automatico;
        EthernetClient& client;
    public:
        //Método constructor.
        EthernetInicializador(byte macArray[], IPAddress ipAddr, EthernetClient& _client, bool esAutomatico) : client(_client) {
            // Copiar los elementos uno por uno
            for (int i = 0; i < 6; i++) {
                mac[i] = macArray[i];
            }
            ip = ipAddr;
            automatico = esAutomatico;
        }
        //Método para inicializar el Ethernet.
        void init() override {
            if (automatico) {
                Ethernet.begin(mac);
                Serial.println(F("Ethernet iniciado automaticamente: "));
                Serial.println(Ethernet.localIP());
            }else{
                Ethernet.begin(mac, ip);
                Serial.println(F("Ethernet iniciado manualmente: "));
                Serial.println(ip);
            }
            delay(10);
        }

        IPAddress getIP() {
            return ip;
        }
};  


//------------------------------------//
//----- Clase para Sujeto Serial -----//
//------------------------------------//
class SerialMonitorSujeto : public Sujeto, public IInicializador {
    private:
        char buffer[105]; // Buffer para almacenar el mensaje
        int bufferIndex = 0; // Posición actual en el buffer
        bool esperandoMensaje = true; // Si estamos esperando el inicio de un mensaje
        
    public:
        // Constructor
        SerialMonitorSujeto(){
            limpiarBuffer();
        }
        
        // Método para inicializar el sujeto
        void init() override {
            limpiarBuffer();
            // Vaciar cualquier dato residual en el buffer
            while (serialPort.available()) {
                serialPort.read();
            }
        }

        // Limpiar buffer para nuevo mensaje
        void limpiarBuffer() {
            memset(buffer, 0, sizeof(buffer));
            bufferIndex = 0;
            esperandoMensaje = true;
        }

        // Método para leer y mostrar mensaje simplificado
        void componenteNotificar() override {
            // Leer caracteres si hay disponibles
            while (serialPort.available() > 0) {
            char c = serialPort.read();

                if (c == '#') {
                    // Inicio de un nuevo mensaje. Limpiar el buffer.
                    limpiarBuffer();
                    buffer[bufferIndex++] = c;
                } else if (c == '%' && bufferIndex > 0 && buffer[0] == '#') {
                    // Fin del mensaje *si* ya hemos recibido un '#'.
                    buffer[bufferIndex] = '\0'; // Terminar la cadena
                    notificar(buffer, ""); // Notificar
                    limpiarBuffer(); // Limpiar para el siguiente mensaje
                } else if (bufferIndex < sizeof(buffer) - 1) {
                    // Añadir el carácter al buffer si hay espacio.
                    buffer[bufferIndex++] = c;
                } else {
                //Si se supera el tamaño del buffer sin encontrar el caracter de cierre,
                //limpiar buffer y empezar de nuevo.
                limpiarBuffer();
                    }
            }
        }
}; //Fin de la clase SerialMonitorSujeto.


//----------------------------------//
//----- Clase para Sujeto MQTT -----//
//----------------------------------//
class MQTTSujeto : public Sujeto, public IInicializador {
    private:
        const char* topic = "arduino/manual";
        PubSubClient& client;
        IPAddress mqttServer;
        
    public:
        //Método constructor.
        MQTTSujeto(PubSubClient& _client, IPAddress _mqttServer) : client(_client), mqttServer(_mqttServer) {
            client.setCallback(callback);
        }
        //Método para inicializar el sujeto.
        void init() override {
            client.subscribe(topic);
        }

        void componenteNotificar() override {
            client.loop();
        } 
    
        static void callback(char* topic, byte* payload, unsigned int length) {
            String message = "";
            for (int i = 0; i < length; i++) {
                message += (char)payload[i];
            }
            serialPort.println(message);
        }     

}; // Fin de la clase MQTTSujeto.

//---------------------------------------//
//--- INA219 para Corriente y Voltaje ---//
//---------------------------------------//
class INA219Component : public Sujeto, public IInicializador {
private:
    Adafruit_INA219 ina219;

public:
    INA219Component() {}

    void init() override {
        if (!ina219.begin()) {
            Serial.println("Sensor INA219 no encontrado.");
        }
    }

    // Función para obtener el voltaje
    float getVoltaje() {
        return ina219.getBusVoltage_V();
    }

    // Función para obtener la corriente
    float getCorriente() {
        return ina219.getCurrent_mA();
    }

    // Función para obtener la potencia
    float getPotencia() {
        return getVoltaje() * getCorriente(); ; 
    }

    // Método para notificar voltaje, corriente y potencia
    void componenteNotificar() override {
        char valor[20];

        // Voltaje
        dtostrf(getVoltaje(), 4, 2, valor);
        notificar("V", valor); // V: voltaje en voltios

        // Corriente
        dtostrf(getCorriente(), 4, 2, valor);
        notificar("C", valor); // C: corriente en mA

        // Potencia
        dtostrf(getPotencia(), 4, 2, valor);
        notificar("P", valor); // P: potencia en W
    }
}; // Fin de la clase INA219Component.



// Declaramos el builder como variable global
MensajeBuilder mensajeBuilder;

// Clase para publicar mensajes en el broker.
class MQTTObservador : public Observador, public IInicializador {
    private:
        const char* topic = "arduino/controlador";
        const char* clientID = "Arduino2";
        PubSubClient& client;
        IPAddress mqttServer;

    public:
        //Método constructor.
        MQTTObservador(PubSubClient& _client, IPAddress _mqttServer) : client(_client), mqttServer(_mqttServer) {}

        void init() override {
            client.setServer(mqttServer, 1883);
            Serial.println(F("Configurando servidor MQTT"));
            Serial.println(mqttServer);
            if (client.connect(clientID)) {
                Serial.println(F("Conectado al broker MQTT"));
            } else {
                Serial.print(F("falló, rc="));
                Serial.print(client.state());
                Serial.println(F(" Intentando de nuevo en 5 segundos"));
                delay(1000);
            }
        }

            void update(const char* mensaje, const char* valor) override {
            if (client.connected()) {
            client.publish(topic, mensaje);
        }
         
        }

        // Método para procesar mensajes MQTT entrantes
        void procesarMQTT() {
            if (!client.connected()) {
           // reconnect(); // Intenta reconectar si no está conectado
            }
        client.loop(); // SIEMPRE llama a client.loop()
        }
};

// Clase para mostrar mensajes recibidos en el monitor serial
class SerialMonitorObservador : public Observador {
    private:
        MensajeBuilder& builder; // Ahora es una referencia
    public:
        // Constructor que recibe el builder por inyección de dependencias
        SerialMonitorObservador(MensajeBuilder& builder) : builder(builder) {}
        
        // Recibe la notificación del sensor.
        void update(const char* componente, const char* valor) override {
            builder.agregar(componente, valor); // Delega la construcción al builder.
        }
  

        // Método para obtener el mensaje completo (ya formateado).
        /*Mensaje getMensaje() {
            return builder.construir(); // Construye y devuelve el Mensaje.
        }*/
        
}; //Fin de la clase SerialMonitorObservador.

// Instancias
SerialMonitorSujeto sujetoSerial;
INA219Component sensorINA219;
//SensorVientoComponent sensorVientoComponent(A1);
SerialMonitorObservador serialMonitorObservador(mensajeBuilder); 
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
IPAddress ip(192, 168, 31, 100);
IPAddress mqttServer(192, 168, 31, 177);
EthernetClient clientEthernet;
PubSubClient mqttClient(clientEthernet);
EthernetInicializador ethernetComponent(mac, ip, clientEthernet, true);
MQTTObservador mqttObservador(mqttClient, mqttServer);
MQTTSujeto mqttSujeto(mqttClient, mqttServer);
Scheduler scheduler;

//Arreglo de punteros a IInicializador
IInicializador* initObjects[] = {
    &sujetoSerial,
    //&sensorVientoComponent,
    &ethernetComponent,
    &mqttObservador,
    &mqttSujeto,
    &sensorINA219
};

//Arreglo de punteros a ISujeto
Sujeto* sujetoObjects[] = {
    &sujetoSerial,
    //&sensorVientoComponent,
    &mqttSujeto,
    &sensorINA219
};

// Tarea para revisar mensajes seriales.
Task tareaRevisarSerial(10, TASK_FOREVER, []() {
    // Limpiar el builder antes de procesar un nuevo mensaje
    mensajeBuilder.limpiar(); // Ahora podemos acceder directamente al builder
    
    // Iterar sobre el arreglo y llamar al método que notifica a cada componente
    for (int i = 0; i < sizeof(sujetoObjects) / sizeof(sujetoObjects[0]); i++) {
        sujetoObjects[i]->componenteNotificar();
    }

    mensajeBuilder.construir();
    const char* mensaje = mensajeBuilder.getMensaje();
    if (mensaje[0] == '#' && strlen(mensaje) > 50) {
        //Notificar al observador MQTTObservador.
        mqttObservador.update(mensaje, "");
        Serial.println(mensaje);
    }
});

// Tarea para mantener la conexión MQTT
Task tareaMQTT(5000, TASK_FOREVER, []() {
    mqttObservador.procesarMQTT();
});

//-------------------------//
//----- Función Setup -----//
//-------------------------//
void setup() {
    // Inicializar comunicación
    Serial.begin(9600);
    Serial1.begin(9600);
    serialPort.begin(9600);
    
    Serial.println(F("Arduino 2 - Iniciado"));
    
    // Inicializar los componentes con delay entre inicializaciones
    for (int i = 0; i < sizeof(initObjects) / sizeof(initObjects[0]); i++) {
        initObjects[i]->init();
        delay(10); // Delay entre inicializaciones
    }

    // Agregar observadores
    for (int i = 0; i < sizeof(sujetoObjects) / sizeof(sujetoObjects[0]); i++) {
        sujetoObjects[i]->agregarObservador(&serialMonitorObservador);
    }

    // Configurar el scheduler
    scheduler.init();
    // Agregar las tareas al scheduler.
    scheduler.addTask(tareaRevisarSerial);
    //scheduler.addTask(tareaMQTT); // Agregar tarea para mantener MQTT
    // Habilitar las tareas
    tareaRevisarSerial.enable();
    //tareaMQTT.enable(); // Habilitar tarea MQTT
}
//--------------------------------//
//--------- Función Loop ---------//
//--------------------------------//
void loop() {
    scheduler.execute();
}

