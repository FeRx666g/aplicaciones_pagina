import React, { useEffect, useState, useContext } from "react";
import { TablaTiempoReal } from "../componentes/TablaTiempoReal";
import { ModalEditarComponente } from "../componentes/ModalEditarComponente";
import { FaCog, FaPlay, FaPause } from "react-icons/fa";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserContext } from "../providers/UserProvider";
import ReactECharts from "echarts-for-react";

export const PrediccionTiempoReal = () => {
    const { user } = useContext(UserContext);
    const [config, setConfig] = useState(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [seriesDatos, setSeriesDatos] = useState([]);

    // 🔷 Cargar configuración al inicio
    useEffect(() => {
        if (!user?.uid) return;

        const cargarConfig = async () => {
            setCargando(true);
            const ref = doc(db, "usuarios", user.uid, "configuraciones", "prediccionTiempoReal");
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setConfig(snap.data());
            } else {
                setConfig({ columnas: [], modoTiempoReal: true });
            }
            setCargando(false);
        };

        cargarConfig();
    }, [user?.uid]);

    // 🔷 Guardar configuración en Firestore cuando cambia
    useEffect(() => {
        if (!user?.uid || !config) return;

        const guardarConfig = async () => {
            const ref = doc(db, "usuarios", user.uid, "configuraciones", "prediccionTiempoReal");
            await setDoc(ref, config);
        };

        guardarConfig();
    }, [config, user?.uid]);

    const toggleTiempoReal = () => {
        setConfig((prev) => ({
            ...prev,
            modoTiempoReal: !prev.modoTiempoReal,
        }));
    };

    const handleNuevaPrediccion = (timestamp, prediccion) => {
        setSeriesDatos((prev) => [
            ...prev,
            { name: timestamp, value: [timestamp, prediccion] },
        ]);
    };

    if (cargando || !config) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600 text-lg">Cargando configuración...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black p-4 flex flex-col items-center">
            <div className="relative w-full max-w-6xl">
                {/* Botón Configuración */}
                <button
                    onClick={() => setMostrarModal(true)}
                    className="absolute top-0 right-0 m-2 text-gray-600 hover:text-gray-800"
                    title="Editar configuración"
                >
                    <FaCog size={24} />
                </button>

                {/* Botón Pausar/Reanudar */}
                <button
                    onClick={toggleTiempoReal}
                    className={`absolute top-0 right-10 m-1.5 px-2 py-1.5 rounded text-sm flex items-center gap-1 ${config.modoTiempoReal
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                        }`}
                    title={config.modoTiempoReal ? "Pausar" : "Reanudar"}
                >
                    {config.modoTiempoReal ? <FaPause /> : <FaPlay />}
                </button>

                {/* Tabla */}
                <TablaTiempoReal
                    config={config}
                    onNuevaPrediccion={handleNuevaPrediccion}
                    onLimpiar={() => setSeriesDatos([])}
                />
            </div>

            <div className="mt-8 w-full max-w-6xl shadow-lg bg-white p-4 rounded-lg">
                <ReactECharts
                    style={{ height: "300px" }}
                    option={{
                        title: {
                            text: "Predicción en Tiempo Real (mW)",
                            left: "center",
                            textStyle: {
                                fontSize: 16,
                            },
                        },
                        tooltip: { trigger: "axis" },
                        grid: {
                            left: '70px',   // antes tenías '50px'
                            right: '30px',
                            bottom: '50px',
                            top: '50px',
                        },
                        xAxis: {
                            type: "category",
                            data: seriesDatos.map((p) => p.value[0]),
                            name: "Hora",
                            nameLocation: "middle",
                            nameGap: 30,
                            boundaryGap: false,
                            axisLabel: {
                                rotate: 0,
                            },
                        },
                        yAxis: {
                            type: "value",
                            name: "Predicción (mW)",
                            nameLocation: "middle",
                            nameGap: 40,   // antes estaba en 40
                            axisLabel: {
                                rotate: 0,
                            },
                        },
                        series: [
                            {
                                name: "Predicción",
                                type: "line",
                                data: seriesDatos.map((p) => p.value[1]),
                                smooth: true,
                                symbol: "circle",
                                showSymbol: true,
                                /* areaStyle: {},
 */                            },
                        ],
                    }}
                />
            </div>

            {/* Modal */}
            {mostrarModal && (
                <ModalEditarComponente
                    componente={{
                        tipo: "tabla-ml-tiempo-real",
                        config: config,
                    }}
                    onClose={() => setMostrarModal(false)}
                    onGuardar={(nuevaConfig) => {
                        setConfig(nuevaConfig);
                        setMostrarModal(false);
                    }}
                />
            )}
        </div>
    );
};
