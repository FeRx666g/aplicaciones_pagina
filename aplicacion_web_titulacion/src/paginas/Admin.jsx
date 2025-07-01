import React, { useContext, useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, writeBatch, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import UserContext from '../providers/UserProvider'
import { AccesoRestringido } from '../componentes/AccesoRestringido'
import Papa from 'papaparse';
import Swal from 'sweetalert2';

export const Admin = () => {

  const { user } = useContext(UserContext);
  const [usuarios, setUsuarios] = useState([]);
  const [datosCargados, setDatosCargados] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [datosConsultados, setDatosConsultados] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);


  const esAdmin = user?.rol === 3;

  // Función para seleccionar o deseleccionar todos los datos consultados
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
    } catch (error) {
      console.error("❌ Error consultando:", error);
      alert("Error al consultar datos.");
    }
  };


  //  Función para eliminar un dato específico
  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) {
      Swal.fire('⚠️ Atención', 'No has seleccionado ningún dato.', 'warning');
      return;
    }

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
      const batch = writeBatch(db);
      seleccionados.forEach(id => batch.delete(doc(db, 'datos_prediccion', id)));
      await batch.commit();

      Swal.fire('✅ Eliminado', 'Los registros seleccionados fueron eliminados.', 'success');
      consultarDatosPorFecha();
    } catch (error) {
      console.error('❌ Error al eliminar:', error);
      Swal.fire('Error', 'No se pudieron eliminar los datos.', 'error');
    }
  };

  /* Función para obtener la lista colección completa */
  const consultarUsuarios = async () => {
    const coleccionUsuarios = await getDocs(collection(db, "usuarios"));
    const listaUsuarios = coleccionUsuarios.docs.map(doc => doc.data());
    setUsuarios(listaUsuarios);
  };

  /* Función para editar y guardar los cambios de un usuario */
  const guardarCambios = async (usuarioActualizado) => {
    try {
      const referenciaUsuario = doc(db, "usuarios", usuarioActualizado.uid);
      await updateDoc(referenciaUsuario, {
        displayName: usuarioActualizado.displayName,
        rol: usuarioActualizado.rol
      });
      alert("Usuario actualizado.");
    }
    catch (error) {
      alert("Error al actualizar usuario: " + error.message);
    }

  };

  /* Función para eliminar un usuario */
  const eliminarUsuario = async (uid) => {
    const confirmar = confirm("¿Eliminar usuario de Firestore?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "usuarios", uid));
      alert("Usuario eliminado de Firestore");
      consultarUsuarios();
    } catch (error) {
      alert("Error al eliminar usuario: " + error.message);
    }
  };

  useEffect(() => {
    if (esAdmin) {
      consultarUsuarios();
    }
  }, [esAdmin]);

  if (!esAdmin) {
    return <AccesoRestringido />;
  }

  return (
    <div className=' '>

      <div className='div-externo '>
        <h1 className='text-2xl font-bold  p-1  text-center block bg-white  dark:bg-black rounded-full dark:text-white transition-all  '> Usuarios Registrados</h1>
      </div>
      <div className=''>

        <ul className='space-y-3 m-3 '>
          {usuarios.map((usuario, index) => (
            <li key={usuario.uid} className="flex justify-between items-center bg-white  dark:bg-zinc-800 dark:text-gray-00  p-3 rounded shadow transition-all">
              <div className="flex items-center gap-4 ">
                <img src={usuario.photoURL} alt="Avatar" className="w-12 h-12 rounded-full" />
                <div className=''>
                  <input
                    className="text-lg font-bold bg-transparent border-b border-gray-300"
                    value={usuario.displayName || ""}
                    onChange={(e) => {
                      const nuevos = [...usuarios];
                      nuevos[index].displayName = e.target.value;
                      setUsuarios(nuevos);
                    }}
                  />
                  <p className="text-sm text-gray-600">{usuario.email}</p>
                  <div className="mt-1">
                    Rol:
                    <input
                      type="number"
                      className="ml-2 w-16 px-1 border rounded"
                      value={usuario.rol}
                      onChange={(e) => {
                        const nuevos = [...usuarios];
                        nuevos[index].rol = parseInt(e.target.value);
                        setUsuarios(nuevos);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => guardarCambios(usuario)}
                  className="bg-blue-500 text-white px-3 py-1 cursor-pointer rounded"
                >
                  Guardar
                </button>
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

      {/* Sección para subir CSV a Firestore */}
      <div className='p-4 mt-10 bg-white dark:bg-zinc-800 rounded shadow'>
        <h2 className='text-xl font-semibold mb-3 text-center'>Subir datos meteorológicos (CSV)</h2>

        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="input-csv"
          onChange={(e) => {
            const archivo = e.target.files[0];
            if (!archivo) return;

            Papa.parse(archivo, {
              header: true,
              skipEmptyLines: true,
              complete: (result) => {
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
                console.error("❌ Error al leer el archivo CSV:", err);
                alert("No se pudo procesar el archivo CSV.");
              }
            });
          }}
        />

        <div className="flex flex-col items-center gap-4 mt-4">
          <label htmlFor="input-csv" className="bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer shadow hover:bg-indigo-700 transition">
            Seleccionar archivo CSV
          </label>

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
              <div className="flex gap-4 mt-4">
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg shadow transition"
                  onClick={async () => {
                    try {
                      const col = collection(db, "datos_prediccion");
                      let batch = writeBatch(db);
                      let operacionesEnBatch = 0;
                      let subidos = 0;

                      for (let i = 0; i < datosCargados.length; i++) {
                        const dato = datosCargados[i];
                        const docId = `${dato.anio}-${dato.mes}-${dato.dia}-${dato.hora}-${dato.minuto}`;
                        const ref = doc(col, docId);

                        batch.set(ref, dato); // Reemplaza si ya existe
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
                      console.error("❌ Error al subir a Firestore:", error);
                      Swal.fire('Error', 'No se pudieron subir los datos.', 'error');
                    }
                  }}
                >
                  Subir a Firestore
                </button>


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

      <div className="my-6 p-4 bg-white dark:bg-zinc-800 rounded shadow">
        <h2 className="text-xl font-semibold mb-4 text-center">Consulta de Datos Metereológicos Disponibles</h2>

        <div className="flex flex-col items-center gap-4 mb-4">
          {/* Fila de los inputs */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <label className="text-sm">
              Desde:
              <input
                type="datetime-local"
                className="ml-2 border px-2 py-1 rounded"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Hasta:
              <input
                type="datetime-local"
                className="ml-2 border px-2 py-1 rounded"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
              />
            </label>
          </div>

          {/* Fila del botón */}
          <button
            onClick={consultarDatosPorFecha}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Consultar
          </button>
        </div>


        {datosConsultados.length > 0 && (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded">
              <table className="table-auto w-full text-sm text-center">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th>
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
                  {datosConsultados.map((fila, idx) => (
                    <tr key={fila.id} className="hover:bg-gray-50">
                      <td>
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

            <button
              onClick={eliminarSeleccionados}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow"
            >
              Eliminar seleccionados
            </button>
          </>
        )}
      </div>
    </div>
  )
}
