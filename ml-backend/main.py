from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
import joblib
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

print("Iniciando API FastAPI con modelo Random Forest...")

app = FastAPI(
    title="API de Predicción Solar (Random Forest)",
    description="Predice la potencia solar en mW usando Random Forest",
    version="2.0.0"
)

# CORS (para permitir acceso desde frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Carga del modelo Random Forest y escaladores
# ============================================================

RUTA_MODELO = "modelo/random_forest_model.pkl"
RUTA_SCALER_X = "modelo/scaler_X.pkl"
RUTA_SCALER_Y = "modelo/scaler_y.pkl"

print("Cargando modelo Random Forest y escaladores...")
modelo = joblib.load(RUTA_MODELO)
sc_X = joblib.load(RUTA_SCALER_X)
sc_y = joblib.load(RUTA_SCALER_Y)

# ============================================================
# Esquema de entrada
# ============================================================

class DatosEntrada(BaseModel):
    hora: int
    lux: float
    temperatura: float
    humedad: float
    nubosidad: float

class DatosEntradaMultiple(BaseModel):
    datos: List[DatosEntrada]

# ============================================================
# Endpoints
# ============================================================

@app.post("/predecir", summary="Predicción con un solo registro")
def predecir_potencia(data: DatosEntrada):
    entrada_raw = np.array([
        data.hora,
        data.lux,
        data.temperatura,
        data.humedad,
        data.nubosidad
    ]).reshape(1, -1)

    entrada_escalada = sc_X.transform(entrada_raw)
    pred_esc = modelo.predict(entrada_escalada).reshape(-1, 1)
    pred_mw = sc_y.inverse_transform(pred_esc)

    return {
        "potencia_predicha_mW": round(float(pred_mw[0][0]), 2)
    }

@app.post("/predecir-multiple", summary="Predicción con múltiples registros")
def predecir_multiple(payload: DatosEntradaMultiple):
    matriz_raw = np.array([
        [
            d.hora,
            d.lux,
            d.temperatura,
            d.humedad,
            d.nubosidad
        ]
        for d in payload.datos
    ])

    entradas_escaladas = sc_X.transform(matriz_raw)
    predicciones_esc = modelo.predict(entradas_escaladas).reshape(-1, 1)
    predicciones = sc_y.inverse_transform(predicciones_esc).flatten().tolist()
    predicciones_redondeadas = [round(p, 2) for p in predicciones]

    return {
        "predicciones": predicciones_redondeadas
    }

# ============================================================
# Ejecución local 
# ============================================================

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
