import React, { useContext, useState, useEffect } from 'react'
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc, addDoc, writeBatch, query, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import UserContext from '../providers/UserProvider'
import { AccesoRestringido } from '../componentes/AccesoRestringido'
import Papa from 'papaparse';
import Swal from 'sweetalert2';

/**
 * Admin
 *
 * Componente de administración para usuarios y datos meteorológicos.
 *
 * Permite al administrador:
 * - Ver y editar la lista de usuarios registrados (nombre y rol).
 * - Eliminar usuarios existentes.
 * - Subir datos meteorológicos desde un archivo CSV a Firestore.
 * - Consultar datos meteorológicos guardados por rango de fechas.
 * - Eliminar datos meteorológicos seleccionados.
 *
 * Características:
 * - Solo accesible para usuarios con rol `3` (administrador); los demás ven la pantalla `AccesoRestringido`.
 * - Usa Firestore para leer, actualizar, eliminar y subir registros en lote.
 * - Usa PapaParse para procesar archivos CSV.
 * - Usa SweetAlert2 para mostrar notificaciones y confirmaciones.
 * - Incluye paginado visual, selección múltiple, y validación de fechas.
 *
 * Usa:
 * - Contexto `UserContext` para verificar el rol del usuario.
 * - Firebase Firestore para persistencia de usuarios y datos.
 * - TailwindCSS para los estilos y diseño responsivo.
 */

export const Admin = () => {

  // Obtener el usuario autenticado desde el contexto
  const { user } = useContext(UserContext);

  // Lista de usuarios registrados
  const [usuarios, setUsuarios] = useState([]);

  // Datos meteorológicos cargados desde CSV
  const [datosCargados, setDatosCargados] = useState([]);

  // Rangos de fecha para consulta
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Datos meteorológicos consultados en Firestore
  const [datosConsultados, setDatosConsultados] = useState([]);

  // IDs de los registros seleccionados para eliminar
  const [seleccionados, setSeleccionados] = useState([]);

  // Bandera para indicar si todos los datos están seleccionados
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);

  const [estadoScripts, setEstadoScripts] = useState({
    "control-manual": false,
    "receptor-esp32cam": false,
    "publicador-backend": false,
  });

  const [cargandoScripts, setCargandoScripts] = useState(true);

  // Verifica si el usuario autenticado tiene rol de administrador
  const esAdmin = user?.rol === 3;

  const [nuevoUrlNgrok, setNuevoUrlNgrok] = useState('');

  const esUrlValida = (cadena) => {
    if (!cadena || cadena.trim() === "") return false;

    try {
      const url = new URL(cadena.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const guardarUrlNgrok = async () => {
    if (!esUrlValida(nuevoUrlNgrok)) {
      Swal.fire('Error', 'Debes ingresar una URL válida que comience con http:// o https://', 'error');
      return;
    }

    try {
      await setDoc(doc(db, 'configuracion', 'camara'), {
        urlNgrok: nuevoUrlNgrok.trim(),
        updated_at: new Date(),
      }, { merge: true });
      Swal.fire('Éxito', 'URL de la cámara actualizada', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo actualizar la URL', 'error');
    }
  };


  /**
   * consultarDatosPorFecha
   * 
   * Consulta en Firestore los datos meteorológicos dentro de un rango de fechas.
   * Valida que ambas fechas estén presentes y que la fecha inicial sea menor o igual a la final.
   * Si encuentra resultados, los guarda en `datosConsultados` y limpia las selecciones previas.
   * Si no encuentra datos o hay errores, muestra alertas con SweetAlert2.
   */
  const consultarDatosPorFecha = async () => {
    if (!fechaInicio || !fechaFin) {
      Swal.fire('Alerta', 'Por favor selecciona ambas fechas.', 'warning');
      return;
    }

    const desde = new Date(fechaInicio);
    const hasta = new Date(fechaFin);

    if (desde > hasta) {
      Swal.fire('Alerta', 'La fecha de inicio no puede ser mayor que la fecha de fin.', 'warning');
      return;
    }

    try {
      const q = query(
        collection(db, "datos_prediccion"),
        where("timestamp", ">=", desde),
        where("timestamp", "<=", hasta)
      );

      const snapshot = await getDocs(q);
      const resultados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (resultados.length === 0) {
        Swal.fire('Error', 'No se encontraron datos en ese rango de fechas.', 'error');
        setDatosConsultados([]);
        return;
      }

      setDatosConsultados(resultados);
      setSeleccionados([]);
      setTodosSeleccionados(false);
    }
    catch (error) {
      console.error("Error consultando:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error al consultar datos',
        text: 'Hubo un problema al consultar datos en Firestore.',
      });
    }
  };

  const eliminarSeleccionados = async () => {
    // Verifica que haya al menos un dato seleccionado
    if (seleccionados.length === 0) {
      Swal.fire('Atención', 'No has seleccionado ningún dato.', 'warning');
      return;
    }

    // Muestra cuadro de confirmación antes de eliminar
    const confirmacion = await Swal.fire({
      title: `¿Eliminar ${seleccionados.length} registros?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
      // Crea un batch para eliminar múltiples documentos de Firestore
      const batch = writeBatch(db);

      // Agrega cada documento seleccionado al batch
      seleccionados.forEach(id => batch.delete(doc(db, 'datos_prediccion', id)));

      // Ejecuta el batch (confirma la eliminación)
      await batch.commit();

      Swal.fire('Eliminado', 'Los registros seleccionados fueron eliminados.', 'success');

      // Recarga los datos para actualizar la tabla
      consultarDatosPorFecha();

    } catch (error) {
      console.error('Error al eliminar:', error);
      Swal.fire('Error', 'No se pudieron eliminar los datos.', 'error');
    }
  };


  const consultarUsuarios = async () => {
    // Obtiene todos los documentos de la colección 'usuarios'
    const coleccionUsuarios = await getDocs(collection(db, "usuarios"));

    // Mapea los datos y actualiza el estado local
    const listaUsuarios = coleccionUsuarios.docs.map(doc => doc.data());
    setUsuarios(listaUsuarios);
  };


  const guardarCambios = async (usuarioActualizado) => {
    try {
      // Referencia al documento del usuario que se va a actualizar
      const referenciaUsuario = doc(db, "usuarios", usuarioActualizado.uid);

      // Actualiza los campos displayName y rol del usuario
      await updateDoc(referenciaUsuario, {
        displayName: usuarioActualizado.displayName,
        rol: usuarioActualizado.rol
      });

      Swal.fire({
        icon: 'success',
        title: 'Usuario actualizado',
        showConfirmButton: false,
        timer: 1500
      });

    } catch (error) {
      // Muestra mensaje de error en caso de fallo
      Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: error.message
      });
    }
  };
  const eliminarUsuario = async (uid) => {
    // Muestra cuadro de confirmación antes de eliminar
    const confirmacion = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
      // Elimina el documento del usuario en Firestore
      await deleteDoc(doc(db, "usuarios", uid));

      // Muestra mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Usuario eliminado',
        showConfirmButton: false,
        timer: 1500
      });

      // Recarga la lista de usuarios para reflejar cambios
      consultarUsuarios();

    } catch (error) {
      // Muestra mensaje de error si falla la eliminación
      Swal.fire({
        icon: 'error',
        title: 'Error al eliminar',
        text: error.message
      });
    }
  };


  useEffect(() => {
    const cargarEstadoScripts = async () => {
      try {
        const ref = doc(db, "control", "raspberry");
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          const estadoInicial = {
            "control-manual": false,
            "receptor-esp32cam": false,
            "publicador-backend": false
          };
          await setDoc(ref, estadoInicial);
          setEstadoScripts(estadoInicial);
        } else {
          setEstadoScripts(snap.data());
        }

      } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudo cargar el estado de los scripts", "error");
      } finally {
        setCargandoScripts(false);
      }
    };
    cargarEstadoScripts();
  }, []);


  useEffect(() => {
    // Si el usuario es admin, consulta la lista de usuarios al montar o cambiar `esAdmin`
    if (esAdmin) {
      consultarUsuarios();
    }
  }, [esAdmin]);

  if (!esAdmin) {
    // Si no es admin, muestra el componente de acceso restringido
    return <AccesoRestringido />;
  }

  const actualizarScript = async (nombre, valor) => {
    try {
      const nuevoEstado = { ...estadoScripts, [nombre]: valor };
      setEstadoScripts(nuevoEstado);
      await setDoc(doc(db, "control", "raspberry"), nuevoEstado);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo actualizar el estado en Firestore", "error");
    }
  };


  return (
    <div className=' '>

      <div className="bg-white dark:bg-zinc-800 p-4 rounded shadow mb-4">
        <h2 className="text-xl font-semibold mb-2">Control de Scripts en Raspberry</h2>
        {cargandoScripts ? (
          <p>Cargando estado de los scripts...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.keys(estadoScripts).map((script) => (
              <div key={script} className="flex items-center justify-between">
                <span className="capitalize">{script.replace("-", " ")}</span>
                <label className="inline-flex relative items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estadoScripts[script]}
                    onChange={(e) => actualizarScript(script, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Encabezado principal de la sección de usuarios */}
      <div className='div-externo '>
        <h1 className='text-2xl font-bold p-1 text-center block bg-white dark:bg-black rounded-full dark:text-white transition-all'>
          Usuarios Registrados
        </h1>
      </div>

      <div className=''>
        <ul className='space-y-3 m-3'>
          {usuarios.map((usuario, index) => (
            <li
              key={usuario.uid}
              className="flex justify-between items-center bg-white dark:bg-zinc-800 dark:text-gray-00 p-3 rounded shadow transition-all"
            >
              {/* Sección izquierda: foto, nombre, email y rol */}
              <div className="flex items-center gap-4">
                {/* Foto de perfil */}
                <img src={usuario.photoURL} alt="Avatar" className="w-12 h-12 rounded-full" />
                <div>
                  {/* Campo editable para el nombre del usuario */}
                  <input
                    className="text-lg font-bold bg-transparent border-b border-gray-300"
                    value={usuario.displayName || ""}
                    onChange={(e) => {
                      const nuevos = [...usuarios];
                      nuevos[index].displayName = e.target.value;
                      setUsuarios(nuevos); // Actualiza el estado local
                    }}
                  />
                  {/* Correo electrónico */}
                  <p className="text-sm text-gray-600">{usuario.email}</p>

                  {/* Campo editable para el rol */}
                  <div className="mt-1">
                    Rol:
                    <select
                      className="ml-2 px-1 border rounded"
                      value={usuario.rol}
                      onChange={(e) => {
                        const nuevos = [...usuarios];
                        nuevos[index].rol = parseInt(e.target.value);
                        setUsuarios(nuevos);
                      }}
                    >
                      <option value={1}>Usuario</option>
                      <option value={3}>Administrador</option>
                    </select>

                  </div>
                </div>
              </div>

              {/* Sección derecha: botones de acción */}
              <div className="flex gap-2">
                {/* Botón para guardar cambios */}
                <button
                  onClick={() => guardarCambios(usuario)}
                  className="bg-blue-500 text-white px-3 py-1 cursor-pointer rounded"
                >
                  Guardar
                </button>

                {/* Botón para eliminar usuario */}
                <button
                  onClick={() => eliminarUsuario(usuario.uid)}
                  className="bg-red-500 text-white px-3 py-1 cursor-pointer rounded"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Sección para subir datos meteorológicos desde un archivo CSV a Firestore */}
      <div className='p-4 mt-10 bg-white dark:bg-zinc-800 rounded shadow'>

        {/* Título de la sección */}
        <h2 className='text-xl font-semibold mb-3 text-center'>
          Subir datos meteorológicos (CSV)
        </h2>

        {/* Input oculto para seleccionar archivo CSV */}
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="input-csv"
          onChange={(e) => {
            const archivo = e.target.files[0];
            if (!archivo) return;

            // Parsear archivo CSV
            Papa.parse(archivo, {
              header: true,
              skipEmptyLines: true,
              complete: (result) => {
                // Convertir cada fila a un objeto con los datos correctos
                const datos = result.data.map(fila => {
                  const { anio, mes, dia, hora, minuto } = fila;
                  const fecha = new Date(anio, mes - 1, dia, hora, minuto);

                  return {
                    timestamp: fecha,
                    anio: parseInt(anio),
                    mes: parseInt(mes),
                    dia: parseInt(dia),
                    hora: parseInt(hora),
                    minuto: parseInt(minuto),
                    lux: parseFloat(fila.lux),
                    temperatura: parseFloat(fila.temperatura),
                    humedad: parseFloat(fila.humedad),
                    irradiancia: parseFloat(fila.irradiancia),
                    nubosidad: parseFloat(fila.nubosidad),
                    potencia_producida: parseFloat(fila.potencia_producida),
                  };
                });

                setDatosCargados(datos);
              },
              error: (err) => {
                console.error("Error al leer el archivo CSV:", err);
                Swal.fire({
                  icon: 'error',
                  title: 'Error al leer CSV',
                  text: 'No se pudo procesar el archivo CSV.',
                });
              }
            });
          }}
        />

        {/* Botón para abrir selector de archivo */}
        <div className="flex flex-col items-center gap-4 mt-4">
          <label htmlFor="input-csv" className="bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer shadow hover:bg-indigo-700 transition">
            Seleccionar archivo CSV
          </label>

          {/* Tabla con datos cargados */}
          {datosCargados.length > 0 && (
            <>
              <div className="max-h-[400px] overflow-y-auto w-full border rounded-lg shadow bg-white dark:bg-zinc-700">
                <table className="table-auto w-full text-sm text-center">
                  <thead className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-white sticky top-0 z-10">
                    <tr>
                      <th>Fecha</th>
                      <th>Lux</th>
                      <th>Temp</th>
                      <th>Humedad</th>
                      <th>Irrad.</th>
                      <th>Nubosidad</th>
                      <th>Potencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Filas de la tabla con los datos parseados */}
                    {datosCargados.map((fila, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-600">
                        <td>{fila.dia}/{fila.mes}/{fila.anio} {fila.hora}:{fila.minuto}</td>
                        <td>{fila.lux}</td>
                        <td>{fila.temperatura}</td>
                        <td>{fila.humedad}</td>
                        <td>{fila.irradiancia}</td>
                        <td>{fila.nubosidad}</td>
                        <td>{fila.potencia_producida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botones para subir datos a Firestore o limpiar tabla */}
              <div className="flex gap-4 mt-4">
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg shadow transition"
                  onClick={async () => {
                    try {
                      const col = collection(db, "datos_prediccion");
                      let batch = writeBatch(db);
                      let operacionesEnBatch = 0;
                      let subidos = 0;

                      // Procesar los datos cargados y subirlos en batches de 500
                      for (let i = 0; i < datosCargados.length; i++) {
                        const dato = datosCargados[i];
                        const docId = `${dato.anio}-${dato.mes}-${dato.dia}-${dato.hora}-${dato.minuto}`;
                        const ref = doc(col, docId);

                        batch.set(ref, dato); // inserta o reemplaza
                        operacionesEnBatch++;
                        subidos++;

                        if (operacionesEnBatch === 500) {
                          await batch.commit();
                          batch = writeBatch(db);
                          operacionesEnBatch = 0;
                        }
                      }

                      if (operacionesEnBatch > 0) {
                        await batch.commit();
                      }

                      Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: `Subidos: ${subidos} registros`,
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                      });

                      setDatosCargados([]);
                    } catch (error) {
                      console.error("Error al subir a Firestore:", error);
                      Swal.fire('Error', 'No se pudieron subir los datos.', 'error');
                    }
                  }}
                >
                  Subir a Firestore
                </button>

                {/* Botón para limpiar los datos de la tabla */}
                <button
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg shadow transition"
                  onClick={() => {
                    setDatosCargados([]);
                  }}
                >
                  Limpiar tabla
                </button>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Sección para consultar datos meteorológicos ya almacenados en Firestore */}
      <div className="my-6 p-4 bg-white dark:bg-zinc-800 rounded shadow">

        {/* Título de la sección */}
        <h2 className="text-xl font-semibold mb-4 text-center">
          Consulta de Datos Metereológicos Disponibles
        </h2>

        {/* Inputs y botón para seleccionar rango de fechas */}
        <div className="flex flex-col items-center gap-4 mb-4">

          {/* Inputs de rango de fechas */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <label className="text-sm">
              Desde:
              <input
                type="datetime-local"
                className="ml-2 border px-2 py-1 rounded"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)} // actualizar fecha inicio
              />
            </label>

            <label className="text-sm">
              Hasta:
              <input
                type="datetime-local"
                className="ml-2 border px-2 py-1 rounded"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)} // actualizar fecha fin
              />
            </label>
          </div>

          {/* Botón para lanzar consulta */}
          <button
            onClick={consultarDatosPorFecha} // ejecuta la consulta
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Consultar
          </button>
        </div>

        {/* Si hay resultados, mostrar tabla */}
        {datosConsultados.length > 0 && (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded">
              <table className="table-auto w-full text-sm text-center">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th>
                      {/* Checkbox para seleccionar/deseleccionar todos */}
                      <input
                        type="checkbox"
                        checked={todosSeleccionados}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setTodosSeleccionados(checked);
                          setSeleccionados(checked ? datosConsultados.map(d => d.id) : []);
                        }}
                      />
                    </th>
                    <th>Fecha</th>
                    <th>Lux</th>
                    <th>Temp</th>
                    <th>Humedad</th>
                    <th>Irrad.</th>
                    <th>Nubosidad</th>
                    <th>Potencia</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Filas de los datos consultados */}
                  {datosConsultados.map((fila, idx) => (
                    <tr key={fila.id} className="hover:bg-gray-50">
                      <td>
                        {/* Checkbox individual de cada fila */}
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(fila.id)}
                          onChange={(e) => {
                            const nuevos = [...seleccionados];
                            if (e.target.checked) {
                              nuevos.push(fila.id);
                            } else {
                              const index = nuevos.indexOf(fila.id);
                              if (index !== -1) nuevos.splice(index, 1);
                            }
                            setSeleccionados(nuevos);
                            setTodosSeleccionados(nuevos.length === datosConsultados.length);
                          }}
                        />
                      </td>

                      {/* Datos meteorológicos en columnas */}
                      <td>{fila.dia}/{fila.mes ?? '??'}/{fila.anio ?? '??'} {fila.hora}:{fila.minuto}</td>
                      <td>{fila.lux}</td>
                      <td>{fila.temperatura}</td>
                      <td>{fila.humedad}</td>
                      <td>{fila.irradiancia}</td>
                      <td>{fila.nubosidad}</td>
                      <td>{fila.potencia_producida ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botón para eliminar los registros seleccionados */}
            <button
              onClick={eliminarSeleccionados}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow"
            >
              Eliminar seleccionados
            </button>
          </>
        )}

        <div className="mt-8 p-4 bg-white dark:bg-zinc-800 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Configurar URL de la Cámara</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://mi-nuevo-link.ngrok.io"
              value={nuevoUrlNgrok}
              onChange={(e) => setNuevoUrlNgrok(e.target.value)}
              className="flex-1 px-2 py-1 border rounded"
            />
            <button
              onClick={guardarUrlNgrok}
              className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
            >
              Guardar
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}
