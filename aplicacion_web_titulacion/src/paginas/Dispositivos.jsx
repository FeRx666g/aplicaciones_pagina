import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, setDoc, deleteDoc, doc, updateDoc, Timestamp, onSnapshot, query, orderBy, limit, where, getDoc } from 'firebase/firestore';
import { UserContext } from '../providers/UserProvider';
import { nanoid } from 'nanoid';
import { PiDevicesLight } from 'react-icons/pi';
import { FaTrash, FaEdit } from 'react-icons/fa';
import { ModalEditarDispositivo } from '../componentes/ModalEditarDispositivo';
import { ModalAgregarDispositivo } from '../componentes/ModalAgregarDispositivo';
import Swal from 'sweetalert2';

/**
 * Dispositivos
 *
 * Componente para gestionar los dispositivos del usuario.
 *
 * Muestra:
 * - Lista de dispositivos registrados por el usuario en forma de tarjetas.
 * - Últimas mediciones en tiempo real de cada dispositivo.
 * - Formulario modal para agregar un nuevo dispositivo.
 * - Formulario modal para editar un dispositivo existente.
 *
 * Usa:
 * - Contexto `UserContext` para acceder a los datos del usuario autenticado.
 * - Firebase Firestore para almacenar, editar y eliminar dispositivos.
 * - Firebase Firestore para escuchar en tiempo real las mediciones por dispositivo.
 * - SweetAlert2 para mostrar confirmaciones y advertencias.
 * - Modales: `ModalAgregarDispositivo` y `ModalEditarDispositivo` para crear y editar dispositivos.
 * - `nanoid` para generar IDs únicos para los dispositivos.
 *
 * Funcionalidades:
 * - Crear dispositivos con generación de ID único y almacenamiento en la colección global y en la subcolección del usuario.
 * - Editar dispositivos existentes y actualizar sus datos en Firestore.
 * - Eliminar dispositivos tanto de la colección global como de la subcolección del usuario.
 * - Escuchar las últimas mediciones de cada dispositivo y mostrarlas en su tarjeta.
 * - Copiar el ID del dispositivo al portapapeles con retroalimentación visual.
 *
 * Estilizado con TailwindCSS y `react-icons`.
 */

export const Dispositivos = () => {
  // Estado para almacenar las últimas mediciones en tiempo real por dispositivo
  const [ultimasMediciones, setUltimasMediciones] = useState({});

  // Estado para identificar qué ID de dispositivo fue copiado al portapapeles
  const [copiadoId, setCopiadoId] = useState(null);

  // Usuario actual desde el contexto
  const { user } = useContext(UserContext);

  // Estado para saber si se está editando un dispositivo y cuál es
  const [dispositivoEditando, setDispositivoEditando] = useState(null);

  // Lista de dispositivos del usuario
  const [dispositivos, setDispositivos] = useState([]);

  // Mostrar u ocultar el formulario de agregar dispositivo
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Datos del nuevo dispositivo que se está creando
  const [nuevoDispositivo, setNuevoDispositivo] = useState({
    nombre: '',
    descripcion: '',
    tipo: '',
    imagen: ''
  });

  // Efecto que carga los dispositivos al detectar que hay un usuario logueado
  useEffect(() => {
    if (user) cargarDispositivos();
  }, [user]);

  // Función para consultar y cargar los dispositivos del usuario desde Firestore
  const cargarDispositivos = async () => {
    const ref = collection(db, 'usuarios', user.uid, 'dispositivos');
    const snapshot = await getDocs(ref);
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDispositivos(lista);
  };

  // Efecto que escucha en tiempo real las últimas mediciones de los dispositivos
  useEffect(() => {
    if (!user || dispositivos.length === 0) return;

    const unsubscribeFns = []; // almacena las funciones para desuscribirse

    dispositivos.forEach((disp) => {
      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', disp.id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setUltimasMediciones(prev => ({
            ...prev,
            [disp.id_dispositivo]: data
          }));
        }
      });

      unsubscribeFns.push(unsubscribe);
    });

    // Limpieza al desmontar para cerrar las suscripciones
    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }, [user, dispositivos]);

  // Maneja los cambios en los campos del formulario de nuevo dispositivo
  const manejarCambio = (e) => {
    setNuevoDispositivo({
      ...nuevoDispositivo,
      [e.target.name]: e.target.value
    });
  };

  // Crea un nuevo dispositivo y lo guarda en Firestore
  const crearDispositivo = async () => {
    const idDispositivo = nanoid(10); // Genera ID único para el dispositivo
    const datosDispositivo = {
      ...nuevoDispositivo,
      creado: Timestamp.now(),
      id_dispositivo: idDispositivo,
      activo: true,
      uid: user.uid
    };

    // 1. Guarda el dispositivo en la subcolección del usuario
    const refUsuario = collection(db, 'usuarios', user.uid, 'dispositivos');
    await addDoc(refUsuario, datosDispositivo);

    // 2. Guarda el mismo dispositivo también en la colección global
    const refGlobal = doc(db, 'dispositivos', idDispositivo);
    await setDoc(refGlobal, datosDispositivo); // esta línea asegura visibilidad global

    // Reinicia los estados y oculta el formulario
    setNuevoDispositivo({ nombre: '', descripcion: '', tipo: '', imagen: '' });
    setMostrarFormulario(false);
    cargarDispositivos(); // recarga la lista
  };

  // Función para eliminar un dispositivo
  const eliminarDispositivo = async (id) => {
    // Muestra confirmación básica del navegador
    const confirmar = confirm('¿Eliminar este dispositivo?');
    if (!confirmar) return;

    try {
      // 1️⃣ Referencia al documento del dispositivo dentro del usuario
      const refUsuario = doc(db, 'usuarios', user.uid, 'dispositivos', id);
      const snap = await getDoc(refUsuario);

      // Verifica si el dispositivo existe
      if (!snap.exists()) {
        Swal.fire({
          icon: 'error',
          title: 'Dispositivo no encontrado',
          text: 'El dispositivo no existe o ya fue eliminado.',
        });
        return;
      }

      const data = snap.data();
      const idDispositivoGlobal = data.id_dispositivo;

      // 2️⃣ Elimina el documento de la subcolección del usuario
      await deleteDoc(refUsuario);

      // 3️⃣ Elimina el mismo dispositivo de la colección global
      await deleteDoc(doc(db, 'dispositivos', idDispositivoGlobal));

      // 4️⃣ Recarga la lista de dispositivos en la interfaz
      cargarDispositivos();
    } catch (error) {
      // Si ocurre un error, muestra confirmación más elegante con SweetAlert
      console.error("Error al eliminar el dispositivo:", error);
      const confirmar = await Swal.fire({
        title: '¿Eliminar este dispositivo?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });
      if (!confirmar.isConfirmed) return;
    }
  };

  // Función para iniciar la edición de un dispositivo
  const editarDispositivo = (disp) => {
    // Establece el dispositivo actual en modo edición
    setDispositivoEditando(disp);
  };

  // Función para guardar los cambios al editar un dispositivo
  const guardarEdicion = async (dispositivoActualizado) => {
    await updateDoc(doc(db, 'usuarios', user.uid, 'dispositivos', dispositivoActualizado.id), {
      nombre: dispositivoActualizado.nombre,
      tipo: dispositivoActualizado.tipo,
      descripcion: dispositivoActualizado.descripcion,
      imagen: dispositivoActualizado.imagen
    });

    // Cierra el modal de edición
    setDispositivoEditando(null);

    // Recarga la lista para reflejar los cambios
    cargarDispositivos();
  };

  // Render alternativo si no hay usuario logueado
  if (!user) {
    return (
      <div className="p-10 text-center text-red-500">
        Debes iniciar sesión para ver tus dispositivos.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Título */}
      <div className="flex items-center justify-center  gap-4 mb-6">
        <PiDevicesLight className="text-4xl text-sky-600 animate-pulse" />
        <h1 className="text-4xl font-extrabold text-sky-600 drop-shadow-sm">Mis Dispositivos</h1>
      </div>

      {/* Botón */}
      <button
        onClick={() => setMostrarFormulario(!mostrarFormulario)}
        className="mb-10 px-131   justify-center py-2 bg-green-600 cursor-pointer hover:bg-green-700 text-white font-semibold rounded-full shadow transition"
      >
        {mostrarFormulario ? 'Cancelar' : '+ Agregar dispositivo'}
      </button>

      {/* Formulario */}
      {mostrarFormulario && (
        <ModalAgregarDispositivo
          nuevoDispositivo={nuevoDispositivo}
          manejarCambio={manejarCambio}
          crearDispositivo={crearDispositivo}
          onClose={() => setMostrarFormulario(false)}
        />
      )}


      {/* Contenedor de las tarjetas de dispositivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 justify-center">
        {dispositivos.map((disp) => (
          <div
            key={disp.id}
            className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 p-4 flex flex-col"
          >
            {/* Imagen del dispositivo o placeholder si no tiene imagen */}
            <img
              src={disp.imagen || 'https://via.placeholder.com/300x200?text=Sin+imagen'}
              alt={disp.nombre}
              className="w-full h-40 object-cover rounded-lg mb-3"
            />

            {/* Nombre del dispositivo */}
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{disp.nombre}</h2>

            {/* Tipo del dispositivo */}
            <p className="text-sm text-blue-600 font-semibold mb-1">{disp.tipo}</p>

            {/* Descripción del dispositivo */}
            <p className="text-sm text-gray-600 dark:text-gray-300">{disp.descripcion}</p>

            {/* Sección con el ID del dispositivo y botón para copiarlo */}
            <div className="flex items-center justify-between mt-2 mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ID: <span className="font-mono">{disp.id_dispositivo}</span>
              </p>

              {/* Botón para copiar el ID del dispositivo al portapapeles */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(disp.id_dispositivo);
                  setCopiadoId(disp.id);
                  setTimeout(() => setCopiadoId(null), 1500);
                }}
                title="Copiar ID"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
              >
                {copiadoId === disp.id ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            {/* Última medición del dispositivo */}
            <div className="text-sm mt-2 text-gray-700 dark:text-white mb-4">
              {ultimasMediciones[disp.id_dispositivo] ? (
                <>
                  <p><strong>Última medición:</strong></p>
                  {/* Lista de claves y valores de la medición */}
                  {Object.entries(ultimasMediciones[disp.id_dispositivo].datos).map(([clave, valor]) => (
                    <p key={clave}>
                      {clave}: <span className="font-mono">{valor}</span>
                    </p>
                  ))}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(ultimasMediciones[disp.id_dispositivo].timestamp.toDate()).toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="italic text-gray-400">Sin datos aún</p>
              )}
            </div>

            {/* Botones para editar y eliminar el dispositivo */}
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => editarDispositivo(disp)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-md text-sm font-semibold transition"
              >
                <FaEdit />
                Editar
              </button>
              <button
                onClick={() => eliminarDispositivo(disp.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition"
              >
                <FaTrash />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Si hay un dispositivo en modo edición, mostrar el modal para editarlo. */}
      {/* Se pasa el dispositivo a editar, una función para cerrar el modal y otra para guardar los cambios. */}
      {
        dispositivoEditando && (
          <ModalEditarDispositivo
            dispositivo={dispositivoEditando}
            onClose={() => setDispositivoEditando(null)}
            onGuardar={guardarEdicion}
          />
        )
      }

    </div>
  );
};
