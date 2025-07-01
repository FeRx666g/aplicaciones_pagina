import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { getFirestore, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import Swal from 'sweetalert2';
const db = getFirestore();



const nombresVariables = [
  'dia', 'hora', 'minuto',
  'lux', 'temperatura', 'humedad','nubosidad'
];

export const HerramientaML = ({ ancho = 500, alto = 300, config = {} }) => {
  const crearFilaVacia = () => Object.fromEntries(nombresVariables.map(v => [v, '']));
  const [filas, setFilas] = useState([crearFilaVacia()]);
  const [resultados, setResultados] = useState([]);
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');



  const agregarFila = () => setFilas([...filas, crearFilaVacia()]);

  const obtenerDatosFirestore = async () => {
    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas requeridas',
        text: 'Por favor selecciona ambas fechas.',
      });

      return;
    }

    try {
      const desde = new Date(fechaInicio);
      const hasta = new Date(fechaFin);

      const q = query(
        collection(db, "datos_prediccion"),
        where("timestamp", ">=", desde),
        where("timestamp", "<=", hasta)
      );

      const querySnapshot = await getDocs(q);
      const datos = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        datos.push({
          dia: data.dia,
          hora: data.hora,
          minuto: data.minuto,
          lux: data.lux,
          temperatura: data.temperatura,
          humedad: data.humedad,
          nubosidad: data.nubosidad
        });
      });

      if (datos.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin resultados',
          text: 'No se encontraron datos en el rango seleccionado.',
        });

      }

      setFilas(datos);
      setResultados([]);
    } catch (error) {
      console.error("❌ Error al consultar Firestore:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error de consulta',
        text: 'Hubo un problema al obtener los datos desde Firestore.',
      });

    }
  };

  const manejarArchivoCSV = (event) => {
    const archivo = event.target.files[0];
    if (!archivo) return;

    Papa.parse(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const datosParseados = result.data.map(fila => {
          const filaProcesada = {};
          nombresVariables.forEach(campo => {
            filaProcesada[campo] = fila[campo] ?? '';
          });
          return filaProcesada;
        });
        setFilas(datosParseados);
        setResultados([]);
      },
      error: (err) => {
        Swal.fire({
          icon: 'warning',
          title: 'Error al cargar CSV',
          text: 'Hubo un problema al procesar el archivo CSV. Asegúrate de que tenga el formato correcto.',
        });
        console.error(err);
      }
    });
  };


  const actualizarValor = (idx, campo, valor) => {
    const nuevas = [...filas];
    nuevas[idx][campo] = valor;
    setFilas(nuevas);
  };

  const eliminarFila = (idx) => {
    const nuevas = filas.filter((_, i) => i !== idx);
    setFilas(nuevas);
    setResultados((prev) => prev.filter((_, i) => i !== idx));
  };


  const limpiarTodo = () => {
    setFilas([crearFilaVacia()]);
    setResultados([]);
  };

  const predecir = async () => {
    const datos = filas.map(f => nombresVariables.map(v => parseFloat(f[v])));

    const tieneInvalido = datos.some(arr => arr.some(valor => isNaN(valor)));
    if (tieneInvalido) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, asegúrate de llenar todos los campos con valores numéricos válidos.',
      });

      return;
    }

    try {
      let response;

      if (filas.length === 1) {
        // Solo una fila: usa el endpoint /predecir
        const filaUnica = filas[0];
        const body = {
          hora: parseFloat(filaUnica.hora),
          lux: parseFloat(filaUnica.lux),
          temperatura: parseFloat(filaUnica.temperatura),
          humedad: parseFloat(filaUnica.humedad),
          nubosidad: parseFloat(filaUnica.nubosidad)
        };

        response = await axios.post(
          'https://ml-backend-519521736458.us-central1.run.app/predecir',
          body
        );

        const potencia = response.data.potencia_predicha_mW;

        // recalcular escala dinámicamente
        const areaModelo = 0.137 * 0.085;
        const eficienciaModelo = 15;
        const anchoPanel = config.ancho ?? 137;
        const altoPanel = config.alto ?? 85;
        const eficiencia = config.eficiencia ?? 15;
        const costoKWh = config.costoKWh ?? 0.10;
        const areaPanel = (anchoPanel / 1000) * (altoPanel / 1000);
        const escala = (areaPanel / areaModelo) * (eficiencia / eficienciaModelo);

        const minutos = 1;
        const potenciaAjustada = potencia * escala;
        const potenciaWatts = potencia / 1000;
        const potenciaAjustadaWatts = potenciaAjustada / 1000;
        const energia_kWh = potenciaAjustadaWatts / 60000;
        const ahorro = energia_kWh * costoKWh;


        setResultados([{
          potencia,
          potenciaWatts,
          potenciaAjustadaWatts,
          energia: energia_kWh,
          ahorro
        }]);




      } else {
        // Varias filas: usa el endpoint /predecir-multiple
        const datos = filas.map(f => ({
          hora: parseFloat(f.hora),
          lux: parseFloat(f.lux),
          temperatura: parseFloat(f.temperatura),
          humedad: parseFloat(f.humedad),
          nubosidad: parseFloat(f.nubosidad)
        }));

        response = await axios.post(
          'https://ml-backend-519521736458.us-central1.run.app/predecir-multiple',
          { datos }
        );
        const predicciones = response.data.predicciones;

        const areaModelo = 0.137 * 0.085;
        const eficienciaModelo = 15;
        const anchoPanel = config.ancho ?? 137;
        const altoPanel = config.alto ?? 85;
        const eficiencia = config.eficiencia ?? 15;
        const costoKWh = config.costoKWh ?? 0.10;
        const areaPanel = (anchoPanel / 1000) * (altoPanel / 1000);
        const escala = (areaPanel / areaModelo) * (eficiencia / eficienciaModelo);

        const intervaloMs = 60000;

        const nuevosResultados = predicciones.map(potencia => {
          const potenciaAjustada = potencia * escala;
          const potenciaWatts = potencia / 1000;
          const potenciaAjustadaWatts = potenciaAjustada / 1000;
          const minutos = 1;
          const energia_kWh = potenciaAjustadaWatts / 60000;
          const ahorro = energia_kWh * costoKWh;


          return {
            potencia,
            potenciaWatts,
            potenciaAjustadaWatts,
            energia: energia_kWh,
            ahorro,
          };
        });


        setResultados(nuevosResultados);

      }
    } catch (err) {
      console.error('Error en la predicción:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error de predicción',
        text: 'No se pudo conectar con el servidor de predicción.',
      });
    }

  };

  const exportarCSV = () => {
    if (filas.length === 0 || resultados.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const datosExportar = filas.map((fila, idx) => ({
      dia: fila.dia,
      hora: fila.hora,
      minuto: fila.minuto,
      lux: fila.lux,
      temperatura: fila.temperatura,
      humedad: fila.humedad,
      nubosidad: fila.nubosidad,
      potencia_predicha_mW: resultados[idx]?.potencia ?? '',
      potencia_W: resultados[idx]?.potenciaWatts ?? '',
      potencia_ajustada_W: resultados[idx]?.potenciaAjustadaWatts ?? '',
      energia_kWh: resultados[idx]?.energia ?? '',
      ahorro_USD: resultados[idx]?.ahorro ?? '',
    }));

    const csv = Papa.unparse(datosExportar);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'resultados_prediccion.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (

    <div
      className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ width: ancho, height: alto }}
    >
      {/* Título */}
      <h2 className="text-2xl font-semibold text-center mb-4 text-zinc-800">
        Herramienta de Predicción
      </h2>

      {/* Tabla tipo hoja de cálculo */}
      <div className="flex-grow overflow-y-auto px-2 max-h-[400px] relative">
        <table className="table-auto w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow">
            <tr className="bg-gray-100 text-gray-700">
              {nombresVariables.map((nombre) => (
                <th key={nombre} className="px-2 py-1">{nombre}</th>
              ))}
              <th className="px-2 py-1">Predicción Potencia Producida (mW)</th>
              <th className="px-2 py-1">Potencia (W)</th>
              <th className="px-2 py-1">Potencia ajustada (W)</th>
              <th className="px-2 py-1">Energía (kWh)</th>
              <th className="px-2 py-1">Ahorro (USD)</th>
              <th className="px-2 py-1">🗑️</th>
            </tr>
          </thead>

          <tbody>
            {filas.map((fila, filaIdx) => (
              <tr key={filaIdx} className="text-center">
                {nombresVariables.map((campo) => (
                  <td key={campo} className="border px-1 py-1">
                    <input
                      type="number"
                      value={fila[campo]}
                      onChange={(e) => actualizarValor(filaIdx, campo, e.target.value)}
                      className="w-full bg-white rounded px-1 py-0.5 border border-gray-300 text-sm"
                    />
                  </td>
                ))}
                <td className="border px-2 py-1 font-semibold">
                  {resultados[filaIdx]?.potencia !== undefined
                    ? resultados[filaIdx].potencia.toFixed(2)
                    : '—'}
                </td>
                <td className="border px-2 py-1">
                  {resultados[filaIdx]?.potenciaWatts !== undefined
                    ? resultados[filaIdx].potenciaWatts.toFixed(4)
                    : '—'}
                </td>

                <td className="border px-2 py-1">
                  {resultados[filaIdx]?.potenciaAjustadaWatts !== undefined
                    ? resultados[filaIdx].potenciaAjustadaWatts.toFixed(4)
                    : '—'}
                </td>


                <td className="border px-2 py-1">
                  {resultados[filaIdx]?.energia !== undefined
                    ? resultados[filaIdx].energia.toFixed(4)
                    : '—'}
                </td>
                <td className="border px-2 py-1">
                  {resultados[filaIdx]?.ahorro !== undefined
                    ? resultados[filaIdx].ahorro.toFixed(6)
                    : '—'}
                </td>
                <td className="border px-1 py-1">
                  <button
                    onClick={() => eliminarFila(filaIdx)}
                    className="text-red-500 hover:text-red-700 font-bold text-lg"
                    title="Eliminar esta fila"
                  >
                    X
                  </button>
                </td>
              </tr>
            ))}

          </tbody>
          {/* Totales */}
          <tfoot className="sticky bottom-0 z-10 bg-gray-100 shadow font-semibold text-center">
            <tr>
              <td colSpan={nombresVariables.length}>Totales</td>
              <td>—</td>
              <td>
                {(resultados.reduce((acc, r) => acc + (r.potenciaWatts ?? 0), 0) / resultados.length || 0).toFixed(4)}
              </td>

              <td>
                {resultados.reduce((acc, r) => acc + (r.potenciaAjustadaWatts ?? 0), 0).toFixed(4)}
              </td>

              <td>
                {resultados.reduce((acc, r) => acc + (r.energia ?? 0), 0).toFixed(4)}
              </td>
              <td>
                {resultados.reduce((acc, r) => acc + (r.ahorro ?? 0), 0).toFixed(6)}
              </td>
              <td></td>
            </tr>
          </tfoot>

        </table>
      </div>

      {/* Botones abajo */}
      <div className="flex justify-between mt-4 ml-4 mr-4 mb-4">
        <button
          onClick={agregarFila}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow"
        >
          Agregar Fila
        </button>

        <button
          onClick={() => setMostrarSelector(true)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg shadow"
        >
          Obtener Datos
        </button>


        <label className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-lg shadow cursor-pointer">
          Cargar CSV
          <input
            type="file"
            accept=".csv"
            onChange={manejarArchivoCSV}
            className="hidden"
          />
        </label>

        <button
          onClick={exportarCSV}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg shadow"
        >
          Exportar CSV
        </button>

        <div className="flex gap-2">
          <button
            onClick={limpiarTodo}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow"
          >
            Limpiar
          </button>

          <button
            onClick={predecir}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Predecir
          </button>
        </div>
      </div>

      {mostrarSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 animate-fadeIn">
          <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-6 w-96 border border-white/30 animate-scaleIn">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Selecciona Rango de Fecha y Hora</h3>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 font-medium mb-1">Desde:</label>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 font-medium mb-1">Hasta:</label>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMostrarSelector(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await obtenerDatosFirestore();
                  setMostrarSelector(false);
                }}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Consultar Datos
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
};
