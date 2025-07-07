import React from 'react';

/**
 * APIRestinfo
 *
 * Componente que muestra una guía detallada para que los usuarios envíen datos al backend mediante la API RESTful.
 *
 * Contenido:
 * - Explicación paso a paso para registrar dispositivos y obtener una API Key.
 * - Ejemplo práctico en Python para enviar datos simulados al backend.
 * - Recomendaciones y advertencias sobre el uso de las API Keys y el formato de los datos.
 *
 * Secciones:
 * 1. Crear dispositivo: explica cómo registrar un dispositivo en la plataforma para obtener su ID.
 * 2. Obtener una API Key: explica cómo generar y copiar una clave de acceso con expiración.
 * 3. Enviar datos: incluye un script Python listo para personalizar y ejecutar.
 * 4. Detalles importantes: consideraciones sobre autenticación, expiración de claves y formato esperado.
 *
 * Estilizado con TailwindCSS.
 */

export const APIRestinfo = () => {
  return (
    // Contenedor principal con máximo ancho, centrado y estilos generales
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">

      {/* Título principal */}
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">
        📡 Cómo enviar datos al backend vía API REST
      </h1>

      {/* Introducción breve */}
      <p className="mb-4 text-gray-200">
        Este sistema te permite conectar tus dispositivos o scripts externos y enviar mediciones al backend mediante una API RESTful. Aquí te explicamos paso a paso cómo hacerlo correctamente.
      </p>

      {/* Separador */}
      <hr className="my-6 border-gray-600" />

      {/* Paso 1: Crear dispositivo */}
      <h2 className="text-xl font-semibold text-yellow-400 mb-2">🛠️ Paso 1: Crear un dispositivo</h2>
      <ul className="list-disc ml-6 text-gray-200 mb-4">
        <li>Dirígete a la sección <strong>“Dispositivos”</strong> en el menú principal.</li>
        <li>Haz clic en <strong>“+ Agregar dispositivo”</strong>.</li>
        <li>Llena los datos del dispositivo, como el nombre, descripción y tipo (sensor o actuador).</li>
        <li>Una vez creado, se mostrará una tarjeta con su <strong>ID único</strong>. Este ID es esencial para identificar al dispositivo al momento de enviar datos.</li>
      </ul>

      {/* Paso 2: Obtener API Key */}
      <h2 className="text-xl font-semibold text-yellow-400 mb-2">🔑 Paso 2: Obtener una API Key</h2>
      <ul className="list-disc ml-6 text-gray-200 mb-4">
        <li>Ingresa a la sección <strong>“API Keys”</strong>.</li>
        <li>Selecciona la fecha y hora en que deseas que expire la clave.</li>
        <li>Haz clic en <strong>“Generar nueva API Key”</strong>.</li>
        <li>Copia el valor de la clave. Esta será utilizada en el <code>x-api-key</code> del header de tus peticiones.</li>
      </ul>

      {/* Paso 3: Enviar datos */}
      <h2 className="text-xl font-semibold text-yellow-400 mb-2">🌐 Paso 3: Enviar datos al backend</h2>
      <p className="text-gray-300 mb-4">
        Usa el siguiente script como ejemplo para enviar datos en tiempo real desde tu microcontrolador o aplicación en Python. Recuerda personalizarlo con tus propios <strong>IDs de dispositivo</strong> y <strong>API Key</strong>.
      </p>

      {/* Ejemplo de código Python */}
      <div className="bg-zinc-900 text-sm p-4 rounded-lg overflow-x-auto mb-6 border border-zinc-700">
        <pre className="text-gray-100 whitespace-pre-wrap">
          {`import requests
import random
import time

# Reemplaza con tu propia API Key generada
API_KEY = "TU_API_KEY_AQUI"

# URL del backend para publicar datos
URL = "https://backend-519521736458.us-central1.run.app/api/datos"

# Mapeo de tus dispositivos con sus variables
dispositivos = {
    "ID_1_DISPOSITIVO": "temperatura",
    "ID_2_DISPOSITIVO": "voltaje",
    "ID_3_DISPOSITIVO": "irradiancia"
}

# Generador aleatorio de valores (simulación)
def generar_valor(sensor):
    if sensor == "temperatura":
        return round(random.uniform(15.0, 35.0), 2)
    elif sensor == "voltaje":
        return round(random.uniform(3.0, 412.0), 2)
    elif sensor == "irradiancia":
        return random.randint(100, 1000)
    return 0

# Cabeceras de la petición con API Key
headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

# Envío continuo de datos
try:
    while True:
        mediciones = []

        for dispositivo, variable in dispositivos.items():
            valor = generar_valor(variable)
            mediciones.append({
                "id_dispositivo": dispositivo,
                "datos": { variable: valor }
            })

        # Payload JSON con las mediciones
        payload = { "mediciones": mediciones }

        # Enviar al backend
        response = requests.post(URL, json=payload, headers=headers)

        print("Estado:", response.status_code, response.text)
        time.sleep(1)

except KeyboardInterrupt:
    print("Detenido por el usuario.")`}
        </pre>
      </div>

      {/* Detalles importantes */}
      <h2 className="text-xl font-semibold text-yellow-400 mb-2">📎 Detalles importantes</h2>
      <ul className="list-disc ml-6 text-gray-200 mb-6">
        <li>🔐 Las API Keys tienen fecha de expiración. Una vez vencida, debes generar una nueva.</li>
        <li>🛑 Si la API Key es inválida o caducó, el servidor devolverá <code>401 Unauthorized</code>.</li>
        <li>✅ Los datos enviados se reflejan en el sistema en tiempo real si el ID del dispositivo es válido y corresponde al usuario autenticado.</li>
        <li>📄 El backend espera un <strong>array de objetos</strong> con campos: <code>id_dispositivo</code> y <code>datos</code>.</li>
      </ul>

      {/* Mensaje final */}
      <p className="text-center text-green-400 font-semibold">
        ¡Tu dispositivo ya está listo para enviar datos al sistema Deep SunLy!
      </p>
    </div>
  );
};
