import requests
import random
import time

# Configuración de la API
API_KEY = "u3tRFLZEVpmNTUChOwEcw2WI4ddd0noi"
URL = "https://backend-519521736458.us-central1.run.app/api/datos"

# Mapa de dispositivos
dispositivos = {
    "BmKlncgSZs": "lux",
    "Synqbh4COb": "temperatura",
    "bpCgdAYLaz": "humedad",
    "2IF4P_1AGP": "irradiancia",
    "PnRqoCSPIY": "nubosidad"
}

# Generar valor según tipo
def generar_valor(sensor):
    if sensor == "temperatura":
        return round(random.uniform(9.0, 30.0), 2)
    elif sensor == "humedad":
        return round(random.uniform(0.0, 100.0), 2)
    elif sensor == "irradiancia":
        return random.randint(0, 5000)
    elif sensor == "lux":
        return random.randint(0, 65000)
    elif sensor == "nubosidad":
        return random.randint(0, 100)
    else:
        return 0

# Configuración de las cabeceras
headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

print("Enviando mediciones por dispositivo cada segundo... (Ctrl+C para detener)")

# Bucle para enviar datos continuamente
try:
    while True:
        mediciones = []
        print("Datos enviados:")

        # Generar mediciones para cada dispositivo
        for dispositivo, variable in dispositivos.items():
            valor = generar_valor(variable)
            print(f"  - {dispositivo} | {variable}: {valor}")
            mediciones.append({
                "id_dispositivo": dispositivo,
                "datos": {
                    variable: valor
                }
            })

        # Preparar el payload
        payload = {
            "mediciones": mediciones
        }

        # Enviar la solicitud POST
        response = requests.post(URL, json=payload, headers=headers)

        # Imprimir la respuesta del servidor
        print("Estado:", response.status_code, response.text)
        print("Esperando...\n")
        time.sleep(1)

except KeyboardInterrupt:
    print("Detenido por el usuario.")
