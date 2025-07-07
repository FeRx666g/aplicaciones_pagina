import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { getFirestore, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import Swal from 'sweetalert2';
const db = getFirestore();

/**
 * HerramientaML
 *
 * Componente de herramienta interactiva para predicción de energía solar y ahorro estimado.
 *
 * Permite al usuario:
 * - Ingresar manualmente datos meteorológicos y ambientales en una tabla (tipo hoja de cálculo).
 * - Cargar datos desde un archivo CSV.
 * - Obtener datos históricos desde Firestore según un rango de fechas.
 * - Enviar los datos a un backend de predicción para recibir las predicciones.
 * - Ver las predicciones en tiempo real (potencia, energía, ahorro).
 * - Exportar los resultados en formato CSV.
 *
 * También permite ajustar los parámetros físicos del panel (ancho, alto, eficiencia) para recalcular la escala.
 *
 * Props:
 * - ancho: ancho del componente en píxeles (opcional, por defecto 500)
 * - alto: alto del componente en píxeles (opcional, por defecto 300)
 * - config: objeto de configuración opcional que puede incluir:
 *     - ancho, alto, eficiencia y costoKWh del panel
 *
 * Usa:
 * - Axios para comunicarse con el backend.
 * - Firestore para consultar datos históricos.
 * - PapaParse para leer y escribir archivos CSV.
 * - SweetAlert2 para notificaciones y validaciones.
 */

const nombresVariables = [
  'dia', 'hora', 'minuto',
  'lux', 'temperatura', 'humedad', 'nubosidad'
];

export const HerramientaML = ({ ancho = 500, alto = 300, config = {} }) => {
  const crearFilaVacia = () => Object.fromEntries(nombresVariables.map(v => [v, '']));
  const [filas, setFilas] = useState([crearFilaVacia()]);
  const [resultados, setResultados] = useState([]);
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const agregarFila = () => setFilas([...filas, crearFilaVacia()]);

  // Función para obtener datos históricos desde Firestore según el rango de fechas seleccionado
  const obtenerDatosFirestore = async () => {
    // Si no se han seleccionado ambas fechas, muestra una advertencia y detiene la ejecución
    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas requeridas',
        text: 'Por favor selecciona ambas fechas.',
      });
      return;
    }

    try {
      // Convierte las fechas a objetos Date para la consulta
      const desde = new Date(fechaInicio);
      const hasta = new Date(fechaFin);

      // Crea la consulta a la colección 'datos_prediccion' filtrando por timestamp dentro del rango
      const q = query(
        collection(db, "datos_prediccion"),
        where("timestamp", ">=", desde),
        where("timestamp", "<=", hasta)
      );

      // Ejecuta la consulta
      const querySnapshot = await getDocs(q);

      const datos = []; // array para guardar los resultados

      // Recorre los documentos devueltos y extrae los campos necesarios
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

      // Si no se encontraron datos, muestra un mensaje informativo
      if (datos.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin resultados',
          text: 'No se encontraron datos en el rango seleccionado.',
        });
      }

      // Actualiza las filas con los datos encontrados y limpia los resultados anteriores
      setFilas(datos);
      setResultados([]);

    } catch (error) {
      // Si ocurre algún error durante la consulta, muestra un mensaje de error y lo loguea
      console.error("❌ Error al consultar Firestore:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error de consulta',
        text: 'Hubo un problema al obtener los datos desde Firestore.',
      });
    }
  };



  // Función para manejar la carga de un archivo CSV y parsearlo
  const manejarArchivoCSV = (event) => {
    const archivo = event.target.files[0]; // obtiene el archivo seleccionado
    if (!archivo) return; // si no hay archivo, no hace nada

    Papa.parse(archivo, {
      header: true,          // considera la primera fila como encabezado
      skipEmptyLines: true,  // ignora filas vacías
      complete: (result) => {
        // al completar el parseo
        const datosParseados = result.data.map(fila => {
          const filaProcesada = {};
          nombresVariables.forEach(campo => {
            filaProcesada[campo] = fila[campo] ?? ''; // asegura que cada campo exista
          });
          return filaProcesada;
        });
        setFilas(datosParseados); // actualiza las filas con los datos del CSV
        setResultados([]);       // limpia los resultados previos
      },
      error: (err) => {
        // si hay un error al leer el CSV, muestra alerta y loguea
        Swal.fire({
          icon: 'warning',
          title: 'Error al cargar CSV',
          text: 'Hubo un problema al procesar el archivo CSV. Asegúrate de que tenga el formato correcto.',
        });
        console.error(err);
      }
    });
  };

  // Función para actualizar el valor de un campo en una fila específica
  // Función para actualizar el valor de un campo en una fila específica
  const actualizarValor = (idx, campo, valor) => {
    const nuevas = [...filas];         // copia de las filas

    let v = parseFloat(valor);

    if (isNaN(v)) v = ''; // si no es número, deja vacío
    if (v < 0) v = 0;     // ningún valor menor a 0

    // Restricciones específicas por campo
    if (campo === 'dia' && v > 31) v = 31;
    if (campo === 'hora' && v > 24) v = 24;
    if (campo === 'minuto' && v > 59) v = 59;
    if (campo === 'lux' && v > 65535) v = 65535; // sensor BH1750 máx.
    if (campo === 'temperatura' && v > 45) v = 45;
    if ((campo === 'humedad' || campo === 'nubosidad') && v > 100) v = 100;

    nuevas[idx][campo] = v;       // actualiza el campo en la fila indicada
    setFilas(nuevas);             // actualiza el estado
  };

  // Función para eliminar una fila y su resultado asociado
  const eliminarFila = (idx) => {
    const nuevas = filas.filter((_, i) => i !== idx); // elimina la fila por índice
    setFilas(nuevas);
    setResultados((prev) => prev.filter((_, i) => i !== idx)); // también elimina su resultado
  };

  // Función para limpiar toda la tabla y dejar solo una fila vacía
  const limpiarTodo = () => {
    setFilas([crearFilaVacia()]); // reinicia a una fila vacía
    setResultados([]);           // limpia resultados
  };


  // Función para enviar los datos al backend y calcular la predicción
  const predecir = async () => {
    // Prepara los datos: convierte todos los valores a números
    const datos = filas.map(f => nombresVariables.map(v => parseFloat(f[v])));

    // Verifica si hay algún valor inválido (NaN) en las filas
    const tieneInvalido = datos.some(arr => arr.some(valor => isNaN(valor)));
    if (tieneInvalido) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, asegúrate de llenar todos los campos con valores numéricos válidos.',
      });
      return; // detiene la ejecución si hay valores inválidos
    }

    try {
      let response;

      if (filas.length === 1) {
        // Si solo hay una fila → usa el endpoint `/predecir`
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

        // Calcula la escala para ajustar a las dimensiones y eficiencia del panel
        const areaModelo = 0.137 * 0.085;      // área del panel modelo en m²
        const eficienciaModelo = 15;          // eficiencia del modelo en %
        const anchoPanel = config.ancho ?? 137;   // ancho del panel (mm)
        const altoPanel = config.alto ?? 85;      // alto del panel (mm)
        const eficiencia = config.eficiencia ?? 15; // eficiencia real
        const costoKWh = config.costoKWh ?? 0.10;   // costo del kWh en USD
        const areaPanel = (anchoPanel / 1000) * (altoPanel / 1000); // en m²
        const escala = (areaPanel / areaModelo) * (eficiencia / eficienciaModelo);

        // Calcula métricas derivadas
        const potenciaAjustada = potencia * escala;
        const potenciaWatts = potencia / 1000;
        const potenciaAjustadaWatts = potenciaAjustada / 1000;
        const energia_kWh = potenciaAjustadaWatts / 60000;
        const ahorro = energia_kWh * costoKWh;

        // Guarda los resultados
        setResultados([{
          potencia,
          potenciaWatts,
          potenciaAjustadaWatts,
          energia: energia_kWh,
          ahorro
        }]);

      } else {
        // Si hay varias filas → usa el endpoint `/predecir-multiple`
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

        // Calcula la escala para ajustar
        const areaModelo = 0.137 * 0.085;
        const eficienciaModelo = 15;
        const anchoPanel = config.ancho ?? 137;
        const altoPanel = config.alto ?? 85;
        const eficiencia = config.eficiencia ?? 15;
        const costoKWh = config.costoKWh ?? 0.10;
        const areaPanel = (anchoPanel / 1000) * (altoPanel / 1000);
        const escala = (areaPanel / areaModelo) * (eficiencia / eficienciaModelo);

        // Recorre cada predicción y calcula métricas derivadas
        const nuevosResultados = predicciones.map(potencia => {
          const potenciaAjustada = potencia * escala;
          const potenciaWatts = potencia / 1000;
          const potenciaAjustadaWatts = potenciaAjustada / 1000;
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

        // Guarda los resultados
        setResultados(nuevosResultados);
      }

    } catch (err) {
      // Si ocurre un error en la petición, muestra alerta y loguea
      console.error('Error en la predicción:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error de predicción',
        text: 'No se pudo conectar con el servidor de predicción.',
      });
    }
  };


  // Función para exportar las filas y resultados en un archivo CSV
  const exportarCSV = () => {
    // Verifica que haya datos y resultados para exportar
    if (filas.length === 0 || resultados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos insuficientes',
        text: 'No hay datos para exportar.',
        confirmButtonColor: '#3085d6'
      });
      return; // si no hay datos, detiene la ejecución
    }

    // Combina las filas y sus resultados en un solo objeto por fila
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

    // Convierte los datos a formato CSV con PapaParse
    const csv = Papa.unparse(datosExportar);

    // Crea un Blob con los datos CSV y genera una URL temporal
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Crea un enlace <a>, lo dispara y lo elimina para descargar el archivo
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'resultados_prediccion.csv'); // nombre del archivo
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
        {config.titulo || 'Herramienta de Predicción'}
      </h2>


      {/* Tabla tipo hoja de cálculo */}
      <div className="flex-grow overflow-y-auto px-2 max-h-[400px] relative">

        {/* Tabla principal con las filas y predicciones */}
        <table className="table-auto w-full text-sm">

          {/* Encabezado fijo de la tabla */}
          <thead className="sticky top-0 z-10 bg-white shadow">
            <tr className="bg-gray-100 text-gray-700">
              {/* Encabezados de las variables de entrada */}
              {nombresVariables.map((nombre) => (
                <th key={nombre} className="px-2 py-1">{nombre}</th>
              ))}
              {/* Encabezados de los resultados calculados */}
              <th className="px-2 py-1">Predicción Potencia Producida (mW)</th>
              <th className="px-2 py-1">Potencia (W)</th>
              <th className="px-2 py-1">Potencia ajustada (W)</th>
              <th className="px-2 py-1">Energía (kWh)</th>
              <th className="px-2 py-1">Ahorro (USD)</th>
              <th className="px-2 py-1">🗑️</th>
            </tr>
          </thead>

          {/* Cuerpo de la tabla con las filas editables */}
          <tbody>
            {filas.map((fila, filaIdx) => (
              <tr key={filaIdx} className="text-center">
                {/* Inputs para cada variable de entrada */}
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
                {/* Resultados de la predicción por fila */}
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
                {/* Botón para eliminar esta fila */}
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

          {/* Pie de tabla con los totales (promedios o sumas) */}
          <tfoot className="sticky bottom-0 z-10 bg-gray-100 shadow font-semibold text-center">
            <tr>
              {/* Celdas de totales */}
              <td colSpan={nombresVariables.length}>Totales</td>
              <td>—</td>
              <td>
                {/* Promedio de potencia (W) */}
                {(resultados.reduce((acc, r) => acc + (r.potenciaWatts ?? 0), 0) / resultados.length || 0).toFixed(4)}
              </td>
              <td>
                {/* Suma de potencia ajustada (W) */}
                {resultados.reduce((acc, r) => acc + (r.potenciaAjustadaWatts ?? 0), 0).toFixed(4)}
              </td>
              <td>
                {/* Suma de energía (kWh) */}
                {resultados.reduce((acc, r) => acc + (r.energia ?? 0), 0).toFixed(4)}
              </td>
              <td>
                {/* Suma de ahorro (USD) */}
                {resultados.reduce((acc, r) => acc + (r.ahorro ?? 0), 0).toFixed(6)}
              </td>
              <td></td>
            </tr>
          </tfoot>

        </table>

      </div>

      {/* Botones abajo */}
      <div className="flex justify-between mt-4 ml-4 mr-4 mb-4">
        {/* Botón para agregar una fila */}
        <button
          onClick={agregarFila}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow"
        >
          Agregar Fila
        </button>

        {/* Botón para obtener los datos disponibles en cierta fecha */}
        <button
          onClick={() => setMostrarSelector(true)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg shadow"
        >
          Obtener Datos
        </button>

        {/* Botones para cargar un CSV con datos */}
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-lg shadow cursor-pointer">
          Cargar CSV
          <input
            type="file"
            accept=".csv"
            onChange={manejarArchivoCSV}
            className="hidden"
          />
        </label>

        {/* Botón para exportar los resultados a CSV */}
        <button
          onClick={exportarCSV}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg shadow"
        >
          Exportar CSV
        </button>

        {/* Botones para limpiar todo*/}
        <div className="flex gap-2">
          <button
            onClick={limpiarTodo}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow"
          >
            Limpiar
          </button>

          {/* Botón para predecir */}
          <button
            onClick={predecir}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Predecir
          </button>
        </div>
      </div>

      {/* Selector de rango de fecha y hora: aparece como modal cuando mostrarSelector es true */}
      {mostrarSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 animate-fadeIn">

          {/* Contenedor del modal */}
          <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-6 w-96 border border-white/30 animate-scaleIn">

            {/* Título del modal */}
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Selecciona Rango de Fecha y Hora
            </h3>

            {/* Campo de selección de fecha/hora inicial */}
            <div className="mb-4">
              <label className="block text-sm text-gray-700 font-medium mb-1">Desde:</label>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {/* Campo de selección de fecha/hora final */}
            <div className="mb-4">
              <label className="block text-sm text-gray-700 font-medium mb-1">Hasta:</label>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {/* Botones de acción: cancelar o consultar */}
            <div className="flex justify-end gap-2">

              {/* Botón para cerrar el modal sin hacer nada */}
              <button
                onClick={() => setMostrarSelector(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                Cancelar
              </button>

              {/* Botón para consultar los datos en Firestore y cerrar el modal */}
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
