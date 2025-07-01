import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export const TablaTiempoReal = ({ config = {} }) => {
  const [filas, setFilas] = useState([]);
  const [pausado, setPausado] = useState(config.pausado ?? false);
  const [valoresTiempoReal, setValoresTiempoReal] = useState({});
  const datosRef = useRef({});
  const [intervaloMs, setIntervaloMs] = useState(60000);

  if (!config || typeof config !== 'object' || !Array.isArray(config.columnas)) {
    return <div className="text-red-500">Configuración inválida</div>;
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

  useEffect(() => {
    setFilas([]);
  }, [intervaloMs]);

  useEffect(() => {
    const unsubscribers = [];

    config.columnas.forEach(({ campo, id_dispositivo }) => {
      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          const valor = data?.datos?.[campo] ?? null;

          datosRef.current[campo] = valor;

          setValoresTiempoReal((prev) => ({
            ...prev,
            [campo]: valor
          }));
        });
      });

      unsubscribers.push(unsubscribe);
    });

    const intervalo = setInterval(async () => {
      if (pausado || !config?.modoTiempoReal) return;

      const datosActuales = config.columnas.reduce((acc, col) => {
        if (!col.clave_modelo) return acc;
        acc[col.clave_modelo] = datosRef.current[col.campo] ?? null;
        return acc;
      }, {});

      if (Object.values(datosActuales).some(v => v === null)) return;

      datosActuales.hora = new Date().getHours();

      try {
        const response = await axios.post(config.prediccion?.endpoint, datosActuales);
        const prediccion = response.data.potencia_predicha_mW ?? 0;

        const potenciaAjustada = prediccion * escala;
        const energiaGenerada = calcularEnergiaGenerada(potenciaAjustada);
        const ahorroRealUSD = energiaGenerada / 1000 * costoKWh;

        setFilas(prev => [
          {
            ...datosActuales,
            prediccion,
            energiaGenerada,
            ahorroRealUSD,
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 29)
        ]);
      } catch (err) {
        console.error('Error al predecir:', err);
      }
    }, intervaloMs);

    return () => {
      unsubscribers.forEach(fn => fn());
      clearInterval(intervalo);
    };
  }, [config.columnas, config.prediccion, pausado, intervaloMs]);

  const totales = filas.reduce(
    (acc, fila) => {
      acc.prediccion += fila.prediccion ?? 0;
      acc.energiaGenerada += fila.energiaGenerada ?? 0;
      acc.ahorroRealUSD += fila.ahorroRealUSD ?? 0;
      return acc;
    },
    { prediccion: 0, energiaGenerada: 0, ahorroRealUSD: 0 }
  );

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 overflow-x-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">
        Predicción en Tiempo Real
      </h2>

      <div className="max-h-[400px] overflow-y-auto">
        <table className="table-fixed min-w-full text-sm">
          <thead className="sticky top-0 bg-white z-20 shadow">
            <tr className="bg-gray-100 text-center">
              <th className="px-2 py-1">Hora</th>
              {config.columnas.map((col, idx) => (
                <th key={idx} className="px-2 py-1">
                  {col.nombre} ({col.unidad})
                </th>
              ))}
              <th className="px-2 py-1">Predicción (mW)</th>
              <th className="px-2 py-1">Energía generada (mWh)</th>
              <th className="px-2 py-1">Ahorro (USD)</th>
            </tr>
          </thead>

          <tbody>
            <tr className="bg-yellow-50 text-center font-semibold">
              <td className="px-2 py-1">Actual</td>
              {config.columnas.map((col, j) => (
                <td key={j} className="px-2 py-1">
                  {valoresTiempoReal[col.campo] ?? '...'}
                </td>
              ))}
              <td className="px-2 py-1">—</td>
              <td className="px-2 py-1">—</td>
              <td className="px-2 py-1">—</td>
            </tr>

            {filas.map((fila, idx) => (
              <tr key={idx} className="text-center">
                <td className="px-2 py-1">{fila.timestamp}</td>
                {config.columnas.map((col, j) => (
                  <td key={j} className="px-2 py-1">{fila[col.campo]}</td>
                ))}
                <td className="px-2 py-1 font-semibold">{fila.prediccion.toFixed(2)}</td>
                <td className="px-2 py-1 font-semibold">{fila.energiaGenerada.toFixed(4)}</td>
                <td className="px-2 py-1 font-semibold">{fila.ahorroRealUSD.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>

          <tfoot className="sticky bottom-0 bg-white text-center shadow z-10 font-bold">
            <tr>
              <td className="px-2 py-1 text-right" colSpan={config.columnas.length + 1}>
                Total acumulado:
              </td>
              <td className="px-2 py-1">{totales.prediccion.toFixed(2)}</td>
              <td className="px-2 py-1">{totales.energiaGenerada.toFixed(4)}</td>
              <td className="px-2 py-1">{totales.ahorroRealUSD.toFixed(6)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <label htmlFor="frecuencia" className="text-sm font-medium text-gray-700">
          Frecuencia de actualización:
        </label>
        <select
          id="frecuencia"
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          value={intervaloMs}
          onChange={(e) => setIntervaloMs(parseInt(e.target.value))}
        >
          <option value={1000}>Cada segundo</option>
          <option value={60000}>Cada minuto</option>
          <option value={300000}>Cada 5 minutos</option>
          <option value={600000}>Cada 10 minutos</option>
          <option value={900000}>Cada 15 minutos</option>
          <option value={1800000}>Cada 30 minutos</option>
          <option value={3600000}>Cada hora</option>
        </select>

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
