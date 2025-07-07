import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

/**
 * TablaTiempoReal
 *
 * Componente que muestra una tabla con predicciones de potencia, energía generada y ahorro en tiempo real.
 *
 * Funcionalidades:
 * - Se conecta a Firestore para escuchar en tiempo real los valores de sensores especificados en `config.columnas`.
 * - Cada cierto intervalo envía los valores actuales al endpoint de predicción definido en `config.prediccion.endpoint`.
 * - Calcula y muestra para cada registro:
 *    - Predicción (mW)
 *    - Energía generada (mWh)
 *    - Ahorro económico (USD)
 * - Muestra la última lectura actual de cada sensor en una fila destacada.
 * - Acumula un historial de hasta 30 filas y muestra un total acumulado al pie de tabla.
 * - Permite ajustar la frecuencia de actualización (1s, 1min, 5min, etc.) y limpiar los datos.
 *
 * Hooks utilizados:
 * - `useState` para estado local.
 * - `useRef` para almacenar valores de sensores sin desencadenar renders.
 * - `useEffect` para inicializar listeners de Firestore y el intervalo de predicción.
 *
 * Dependencias externas:
 * - `firebase/firestore` para suscripción en tiempo real.
 * - `axios` para la petición al servidor de predicción.
 * - TailwindCSS para estilos.
 *
 * Validación:
 * - Si la prop `config` es inválida, muestra un mensaje de error.
 *
 * Props:
 * - `config` (object): contiene las columnas, el endpoint, el modo tiempo real y parámetros del panel.
 *
 * Consideraciones:
 * - Si `config.modoTiempoReal` o `pausado` están activos, no envía peticiones.
 * - Escala los resultados según las dimensiones y eficiencia del panel.
 */


export const TablaTiempoReal = ({ config = {} }) => {
  const [filas, setFilas] = useState([]);
  const [pausado, setPausado] = useState(config.pausado ?? false);
  const [valoresTiempoReal, setValoresTiempoReal] = useState({});
  const datosRef = useRef({});
  const [intervaloMs, setIntervaloMs] = useState(60000);

  if (!config || typeof config !== 'object' || !Array.isArray(config.columnas)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600 text-center p-4 bg-red-100 rounded">
          Ingrese la configuración correspondiente para visualizar este componente.
        </div>
      </div>
    );
  }

  const ancho = config.ancho ?? 137;
  const alto = config.alto ?? 85;
  const eficiencia = config.eficiencia ?? 15;
  const costoKWh = config.costoKWh ?? 0.10;

  const areaModelo = 0.137 * 0.085;
  const eficienciaModelo = 15;
  const areaPanel = (ancho / 1000) * (alto / 1000);
  const escala = (areaPanel / areaModelo) * (eficiencia / eficienciaModelo);

  const calcularAhorro = (mW) => (mW / 1000) * (intervaloMs / 3600000) * costoKWh;
  const calcularEnergiaGenerada = (mW) => (mW * intervaloMs) / 3600000; // mWh
  // Este efecto se ejecuta cada vez que cambia el intervalo de actualización (intervaloMs)
  // y limpia las filas actuales para empezar de nuevo con el nuevo intervalo.
  useEffect(() => {
    setFilas([]);
  }, [intervaloMs]);

  // Este efecto principal se encarga de:
  // - suscribirse en tiempo real a Firestore para obtener la última medición de cada dispositivo
  // - enviar los datos al servidor de predicción en intervalos regulares
  useEffect(() => {
    const unsubscribers = []; // aquí se almacenan las funciones para cancelar las suscripciones de Firestore

    // Para cada columna configurada (dispositivo + campo) creamos una suscripción a Firestore
    config.columnas.forEach(({ campo, id_dispositivo }) => {
      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', id_dispositivo), // filtra por id_dispositivo
        orderBy('timestamp', 'desc'), // ordena por la última medición
        limit(1) // solo la más reciente
      );

      // Se suscribe a cambios en tiempo real en Firestore para esta consulta
      const unsubscribe = onSnapshot(q, (snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          const valor = data?.datos?.[campo] ?? null; // obtiene el valor del campo o null si no existe

          datosRef.current[campo] = valor; // guarda el valor en el ref para no disparar renders

          setValoresTiempoReal((prev) => ({
            ...prev,
            [campo]: valor // actualiza estado para mostrar el valor actual en la UI
          }));
        });
      });

      unsubscribers.push(unsubscribe); // guarda el "desuscriptor" para limpiarlo al desmontar
    });

    // Este intervalo ejecuta la predicción periódicamente según intervaloMs
    const intervalo = setInterval(async () => {
      if (pausado || !config?.modoTiempoReal) return; // si está pausado o no es en tiempo real, no hace nada

      // Prepara el objeto de datos actuales con las claves del modelo y los valores actuales
      const datosActuales = config.columnas.reduce((acc, col) => {
        if (!col.clave_modelo) return acc; // si no tiene clave de modelo se omite
        acc[col.clave_modelo] = datosRef.current[col.campo] ?? null;
        return acc;
      }, {});

      // Si hay algún valor nulo (aún no recibido), no envía la predicción
      if (Object.values(datosActuales).some(v => v === null)) return;

      datosActuales.hora = new Date().getHours(); // agrega la hora actual

      try {
        // envía los datos al endpoint de predicción
        const response = await axios.post(config.prediccion?.endpoint, datosActuales);
        const prediccion = response.data.potencia_predicha_mW ?? 0;

        // calcula los valores derivados
        const potenciaAjustada = prediccion * escala;
        const energiaGenerada = calcularEnergiaGenerada(potenciaAjustada);
        const ahorroRealUSD = energiaGenerada / 1000 * costoKWh;
        const potenciaWatts = prediccion / 1000;
        const potenciaAjustadaWatts = potenciaAjustada / 1000;
        const energiaKWh = energiaGenerada / 1000; // ya que energiaGenerada está en mWh


        // actualiza la tabla con la nueva predicción
        setFilas(prev => [
          {
            ...datosActuales,
            prediccion,                     // en mW
            potenciaWatts,                  // en W
            potenciaAjustadaWatts,         // en W ajustada
            energiaGenerada,                // en mWh
            energiaKWh,                     // en kWh
            ahorroRealUSD,
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 29)
        ]);
      } catch (err) {
        console.error('Error al predecir:', err);
      }
    }, intervaloMs);

    // Cleanup: se ejecuta al desmontar o cuando cambian las dependencias
    return () => {
      unsubscribers.forEach(fn => fn()); // detiene las suscripciones a Firestore
      clearInterval(intervalo);          // detiene el intervalo
    };
  }, [config.columnas, config.prediccion, pausado, intervaloMs]);


  // Calcula los totales acumulados de todas las filas mostradas en la tabla
  const totales = filas.reduce(
    (acc, fila) => {
      // Suma la predicción (mW) actual a la acumulada, si existe, si no usa 0
      acc.prediccion += fila.prediccion ?? 0;
      // Suma la energía generada (mWh) actual a la acumulada, si existe, si no usa 0
      acc.energiaGenerada += fila.energiaGenerada ?? 0;
      // Suma el ahorro en USD actual a la acumulada, si existe, si no usa 0
      acc.ahorroRealUSD += fila.ahorroRealUSD ?? 0;
      // Suma los valores de potencia y energía a los acumulados
      acc.potenciaWatts += fila.potenciaWatts ?? 0;
      // Suma la potencia ajustada en Watts a la acumulada, si existe, si no usa 0
      acc.potenciaAjustadaWatts += fila.potenciaAjustadaWatts ?? 0;
      // Suma la energía generada en mWh a la acumulada, si existe, si no usa 0
      acc.energiaKWh += fila.energiaKWh ?? 0;

      return acc; // devuelve el acumulador para la siguiente iteración
    },
    {
      prediccion: 0, // acumulador de predicción en mW
      potenciaWatts: 0, // acumulador de potencia en Watts
      potenciaAjustadaWatts: 0, // acumulador de potencia ajustada en Watts
      energiaGenerada: 0, // acumulador de energía generada en mWh
      energiaKWh: 0, // acumulador de energía generada en kWh
      ahorroRealUSD: 0 // acumulador de ahorro en USD
    }
  );


  return (
    <div className="bg-white shadow-lg rounded-xl p-4 overflow-x-auto">

      <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">
        {config.titulo || 'Predicción en Tiempo Real'}
      </h2>

      {/* Contenedor de la tabla con scroll vertical si excede los 400px */}
      <div className="max-h-[400px] overflow-y-auto">

        {/* Tabla de predicciones y métricas en tiempo real */}
        <table className="table-fixed min-w-full text-sm">

          {/* Cabecera de la tabla */}
          <thead className="sticky top-0 bg-white z-20 shadow">
            <tr className="bg-gray-100 text-center">
              {/* Columna fija para la hora */}
              <th className="px-2 py-1">Hora</th>

              {/* Columnas dinámicas según configuración */}
              {config.columnas.map((col, idx) => (
                <th key={idx} className="px-2 py-1">
                  {/* Nombre y unidad de la columna */}
                  {col.nombre} ({col.unidad})
                </th>
              ))}

              {/* Columnas para resultados calculados */}
              <th>Predicción (mW)</th>
              <th>Potencia (W)</th>
              <th>Potencia ajustada (W)</th>
              <th>Energía (mWh)</th>
              <th>Energía (kWh)</th>
              <th>Ahorro (USD)</th>
            </tr>
          </thead>

          <tbody>
            <tr className="bg-yellow-50 text-center font-semibold">
              <td className="px-2 py-1">Actual</td>

              {/* sensores */}
              {config.columnas.map((col, j) => (
                <td key={j} className="px-2 py-1">
                  {valoresTiempoReal[col.campo] ?? '...'}
                </td>
              ))}

              {/* columnas calculadas */}
              <td className="px-2 py-1">—</td> {/* Predicción */}
              <td className="px-2 py-1">—</td> {/* Potencia W */}
              <td className="px-2 py-1">—</td> {/* Potencia ajustada */}
              <td className="px-2 py-1">—</td> {/* Energía mWh */}
              <td className="px-2 py-1">—</td> {/* Energía kWh */}
              <td className="px-2 py-1">—</td> {/* Ahorro USD */}
            </tr>

            {/* filas históricas */}
            {filas.map((fila, idx) => (
              <tr key={idx} className="text-center">
                <td className="px-2 py-1">{fila.timestamp}</td>

                {config.columnas.map((col, j) => (
                  <td key={j} className="px-2 py-1">{fila[col.campo]}</td>
                ))}

                <td>{fila.prediccion.toFixed(2)}</td>
                <td>{fila.potenciaWatts.toFixed(4)}</td>
                <td>{fila.potenciaAjustadaWatts.toFixed(4)}</td>
                <td>{fila.energiaGenerada.toFixed(4)}</td>
                <td>{fila.energiaKWh.toFixed(6)}</td>
                <td>{fila.ahorroRealUSD.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>

          <tfoot className="sticky bottom-0 bg-white text-center shadow z-10 font-bold">
            <tr>
              {/* Celda que abarca las columnas dinámicas (Hora + sensores) */}
              <td className="px-2 py-1 text-right" colSpan={config.columnas.length + 1}>
                Total acumulado:
              </td>

              {/* Totales en el mismo orden que en el <thead> */}
              <td className="px-2 py-1">{totales.prediccion.toFixed(2)}</td>
              <td className="px-2 py-1">{totales.potenciaWatts.toFixed(4)}</td>
              <td className="px-2 py-1">{totales.potenciaAjustadaWatts.toFixed(4)}</td>
              <td className="px-2 py-1">{totales.energiaGenerada.toFixed(4)}</td>
              <td className="px-2 py-1">{totales.energiaKWh.toFixed(6)}</td>
              <td className="px-2 py-1">{totales.ahorroRealUSD.toFixed(6)}</td>
            </tr>
          </tfoot>

        </table>
      </div>

      {/* Controles de configuración y limpieza debajo de la tabla */}
      <div className="mt-4 flex items-center gap-2">

        {/* Etiqueta para el selector de frecuencia */}
        <label htmlFor="frecuencia" className="text-sm font-medium text-gray-700">
          Frecuencia de actualización:
        </label>

        {/* Selector para elegir cada cuánto tiempo (en milisegundos) se actualiza la predicción */}
        <select
          id="frecuencia"
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          value={intervaloMs} // valor actual del intervalo
          onChange={(e) => setIntervaloMs(parseInt(e.target.value))} // actualizar intervalo
        >
          {/* Opciones de frecuencia predefinidas */}
          <option value={1000}>Cada segundo</option>
          <option value={60000}>Cada minuto</option>
          <option value={300000}>Cada 5 minutos</option>
          <option value={600000}>Cada 10 minutos</option>
          <option value={900000}>Cada 15 minutos</option>
          <option value={1800000}>Cada 30 minutos</option>
          <option value={3600000}>Cada hora</option>
        </select>

        {/* Botón para limpiar las filas actuales y vaciar la tabla */}
        <button
          onClick={() => setFilas([])}
          className="ml-152 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
        >
          Limpiar
        </button>
      </div>

    </div>
  );
};
