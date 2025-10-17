import React, { useState } from "react";
import { HerramientaML } from "../componentes/HerramientaML";
import ReactECharts from "echarts-for-react";

export const PrediccionEstatica = () => {
    const [resultados, setResultados] = useState([]);

    return (
        <div className="min-h-screen bg-white dark:bg-black p-4 m-2 flex flex-col items-center">

            {/* Herramienta */}
            <HerramientaML
                ancho={1200}
                alto={600}
                onResultados={setResultados} // Aquí recogemos los resultados
            />

            {/* Gráfico */}
            {resultados.length > 0 && (

                <div className="mt-8 w-full max-w-7xl shadow-xl rounded-lg bg-white p-4">
                    <ReactECharts
                        option={{
                            backgroundColor: '#fff',
                            title: {
                                text: "Predicciones de Potencia (mW)",
                                left: "center",
                            },
                            tooltip: {
                                trigger: "axis",
                            },
                            grid: {
                                left: 60,
                                right: 30,
                                bottom: 60,
                                top: 80,
                                containLabel: true,
                            },
                            xAxis: {
                                type: "category",
                                data: resultados.map((r) =>
                                    `${r.hora?.toString().padStart(2, '0')}:${r.minuto?.toString().padStart(2, '0')}`
                                ),
                                name: "Hora",
                                nameLocation: "middle",
                                nameGap: 35,
                                axisLabel: {
                                    rotate: 30,
                                },
                                axisLine: {
                                    lineStyle: {
                                        color: "#ccc",
                                    },
                                },
                                nameTextStyle: {
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                },
                            },
                            yAxis: {
                                type: "value",
                                name: "Potencia (mW)",
                                nameLocation: "middle",
                                nameGap: 50,
                                axisLine: {
                                    lineStyle: {
                                        color: "#ccc",
                                    },
                                },
                                nameTextStyle: {
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                },
                            },
                            series: [
                                {
                                    name: "Potencia",
                                    data: resultados.map((r) => r.potencia?.toFixed(2)),
                                    type: "line",
                                    smooth: false,
                                    symbol: "circle",
                                    symbolSize: 8,
                                    lineStyle: {
                                        width: 2,
                                        color: "#3b82f6",
                                    },
                                    itemStyle: {
                                        color: "#3b82f6",
                                    },
                                    /* areaStyle: {
                                        color: 'rgba(59,130,246,0.2)'
                                    }, */
                                },
                            ],
                        }}
                        style={{ height: "500px", width: "100%", margin: "0 auto" }}
                    />

                </div>
            )}
        </div>
    );
};
