// Paso 1: Importar el componente ModalAgregarDispositivo en Dashboard.jsx
import { ModalAgregarDispositivo } from '../componentes/ModalAgregarDispositivo';
import { ModalEditarDispositivo } from '../componentes/ModalEditarDispositivo';
import { onSnapshot, query, orderBy, limit, where, collection, getDocs, addDoc, setDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useState, useContext } from 'react';
import { FaTrash, FaEdit, FaCopy } from 'react-icons/fa';
import { nanoid } from 'nanoid';
import { SidebarDashboard } from '../componentes/SidebarDashboard';
import { UserContext } from '../providers/UserProvider';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

/**
 * Dashboard
 *
 * Componente principal del panel de usuario.
 *
 * Muestra:
 * - Lista de tableros creados por el usuario, con opciones para crear, editar y eliminar tableros.
 * - Lista de dispositivos registrados, con opción para crear, editar y eliminar dispositivos.
 * - Últimas mediciones en tiempo real de cada dispositivo.
 *
 * Usa:
 * - Contexto `UserContext` para acceder a los datos del usuario autenticado.
 * - Firebase Firestore para almacenar y consultar dispositivos, tableros y mediciones.
 * - SweetAlert2 para mostrar diálogos de confirmación, advertencia y éxito.
 * - `onSnapshot` para escuchar en tiempo real las últimas mediciones de los dispositivos.
 * - Modales: `ModalAgregarDispositivo` y `ModalEditarDispositivo` para crear y editar dispositivos.
 * - React Router para navegar a la vista de un tablero específico.
 *
 * Funcionalidades:
 * - Crear y eliminar tableros con validación de nombre único.
 * - Crear dispositivos con generación de ID único y almacenamiento tanto en la colección global como en la del usuario.
 * - Escuchar mediciones en tiempo real por dispositivo y mostrarlas en la tarjeta.
 * - Copiar ID de dispositivo al portapapeles.
 *
 * Estilizado con TailwindCSS.
 */

export const Dashboard = () => {
  // Obtener el usuario autenticado del contexto
  const { user } = useContext(UserContext);

  // Estado para mostrar u ocultar el modal de agregar dispositivo
  const [mostrarModalDispositivos, setMostrarModalDispositivos] = useState(false);

  // Estado para almacenar los datos del nuevo dispositivo que se está creando
  const [nuevoDispositivo, setNuevoDispositivo] = useState({ nombre: '', descripcion: '', tipo: '', imagen: '' });

  // Estado que guarda la lista de dispositivos del usuario
  const [dispositivos, setDispositivos] = useState([]);

  // Estado para guardar las últimas mediciones de cada dispositivo
  const [ultimasMediciones, setUltimasMediciones] = useState({});

  // Estado para almacenar el dispositivo que se está editando actualmente
  const [dispositivoEditando, setDispositivoEditando] = useState(null);

  // Estado para indicar si se están cargando los dispositivos
  const [loading, setLoading] = useState(true);

  // Estado que guarda la lista de tableros del usuario
  const [tableros, setTableros] = useState([]);

  // Estado para controlar qué menú contextual está visible actualmente (si lo hay)
  const [menuVisible, setMenuVisible] = useState(null);

  // Estado para mostrar un feedback temporal cuando se copia un ID de dispositivo
  const [copiadoId, setCopiadoId] = useState(null);

  // Hook de react-router para navegación
  const navigate = useNavigate();


  // Efecto que carga dispositivos y tableros al montarse el componente o cuando cambia el usuario
  useEffect(() => {
    if (user) {
      cargarDispositivos();
      cargarTableros();
    }
  }, [user]);


  // Función para cargar los dispositivos desde Firestore
  const cargarDispositivos = async () => {
    setLoading(true);
    const ref = collection(db, 'usuarios', user.uid, 'dispositivos');

    const q = query(ref, orderBy('creado', 'desc'));

    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDispositivos(lista);
    setLoading(false);
  };



  // Función para cargar los tableros desde Firestore
  const cargarTableros = async () => {
    const ref = collection(db, 'tableros', user.uid, 'misTableros');
    const snapshot = await getDocs(ref);
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTableros(datos);
  };


  // Función para crear un nuevo tablero
  const crearTablero = async () => {
    // Mostrar diálogo para introducir el nombre del nuevo tablero
    const nombre = await Swal.fire({
      title: 'Crear nuevo tablero',
      input: 'text',
      inputLabel: 'Nombre del tablero',
      inputPlaceholder: 'Ej. Panel Solar Principal',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'El nombre no puede estar vacío.';
        }
        return null;
      }
    });

    // Si el usuario cancela o no confirma, salir
    if (!nombre.isConfirmed) return;

    const nombreTablero = nombre.value.trim();

    // Verificar si ya existe un tablero con el mismo nombre
    const existe = tableros.some(tab => tab.nombre.toLowerCase() === nombreTablero.toLowerCase());
    if (existe) {
      Swal.fire({
        icon: 'error',
        title: 'Nombre duplicado',
        text: 'Ya tienes un tablero con ese nombre. Elige otro nombre.',
      });
      return;
    }

    // Generar un ID único para el tablero
    const idTablero = nanoid(10);
    const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero);

    // Guardar el tablero en Firestore
    await setDoc(ref, {
      nombre: nombreTablero,
      creado: Timestamp.now()
    });

    // Mostrar confirmación
    Swal.fire({
      icon: 'success',
      title: 'Tablero creado',
      text: `Se ha creado el tablero "${nombreTablero}" correctamente.`,
      timer: 1500,
      showConfirmButton: false
    });

    // Recargar la lista de tableros
    cargarTableros();
  };

  // Función para editar el nombre de un tablero
  const editarTablero = async (id, nombreActual) => {
    // Solicita al usuario un nuevo nombre
    const nuevoNombre = prompt("Nuevo nombre para el tablero:", nombreActual);
    // Si no se ingresa nada, o es igual al actual, no hace nada
    if (!nuevoNombre || nuevoNombre.trim() === '' || nuevoNombre === nombreActual) return;
    // Obtiene referencia al documento del tablero
    const ref = doc(db, 'tableros', user.uid, 'misTableros', id);
    // Actualiza el nombre en Firestore
    await updateDoc(ref, { nombre: nuevoNombre.trim() });
    // Recarga la lista de tableros
    cargarTableros();
  };

  // Función para eliminar un tablero
  const eliminarTablero = async (id) => {
    // Muestra confirmación al usuario
    const confirmar = await Swal.fire({
      title: '¿Eliminar este tablero?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmar.isConfirmed) return;

    // Elimina el tablero de Firestore
    const ref = doc(db, 'tableros', user.uid, 'misTableros', id);
    await deleteDoc(ref);
    cargarTableros();
  };


  // Efecto para escuchar las últimas mediciones en tiempo real de los dispositivos
  useEffect(() => {
    if (!user || dispositivos.length === 0) return;
    // Se suscribe a cada dispositivo
    const unsubscribes = dispositivos.map((disp) => {
      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', disp.id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      // Escucha los cambios en tiempo real
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setUltimasMediciones(prev => ({ ...prev, [disp.id_dispositivo]: data }));
        }
      });
    });
    // Se cancelan las suscripciones al desmontar
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, dispositivos]);


  // Maneja los cambios en los inputs del formulario para un nuevo dispositivo
  const manejarCambioDispositivo = (e) => {
    setNuevoDispositivo({ ...nuevoDispositivo, [e.target.name]: e.target.value });
  };


  // Función para crear un nuevo dispositivo desde el Dashboard
  const crearDispositivoDesdeDashboard = async () => {
    try {
      // Verifica que se llenen los campos obligatorios
      if (!nuevoDispositivo.nombre || !nuevoDispositivo.tipo) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos requeridos',
          text: 'Debes completar al menos el nombre y el tipo del dispositivo.',
        });
        return;
      }
      // Genera un ID único para el dispositivo
      const idDispositivo = nanoid(10);
      const datosDispositivo = {
        ...nuevoDispositivo,
        creado: Timestamp.now(),
        id_dispositivo: idDispositivo,
        activo: true,
        uid: user.uid
      };

      // Guarda en la colección del usuario
      const refUsuario = collection(db, 'usuarios', user.uid, 'dispositivos');
      await addDoc(refUsuario, datosDispositivo);

      // Guarda también en la colección global
      const refGlobal = doc(db, 'dispositivos', idDispositivo);
      await setDoc(refGlobal, datosDispositivo);

      // Limpia el formulario y oculta el modal
      setNuevoDispositivo({ nombre: '', descripcion: '', tipo: '', imagen: '' });
      setMostrarModalDispositivos(false);

      // Recarga la lista de dispositivos
      cargarDispositivos();
    } catch (error) {
      console.error("Error al crear el dispositivo:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error al crear dispositivo',
        text: 'Ocurrió un error al guardar el dispositivo.',
      });
    }
  };


  // Función para eliminar un dispositivo
  const eliminarDispositivo = async (id) => {
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

    // Elimina el dispositivo de Firestore
    await deleteDoc(doc(db, 'usuarios', user.uid, 'dispositivos', id));
    cargarDispositivos();
  };


  // Función para establecer qué dispositivo está siendo editado
  const editarDispositivo = (disp) => {
    setDispositivoEditando(disp);
  };


  // Guarda los cambios del dispositivo editado
  const guardarEdicion = async (dispositivoActualizado) => {
    await updateDoc(doc(db, 'usuarios', user.uid, 'dispositivos', dispositivoActualizado.id), {
      nombre: dispositivoActualizado.nombre,
      tipo: dispositivoActualizado.tipo,
      descripcion: dispositivoActualizado.descripcion,
      imagen: dispositivoActualizado.imagen
    });
    setDispositivoEditando(null); // Cierra el modal de edición
    cargarDispositivos(); // Recarga lista
  };


  // Si no hay usuario autenticado, muestra un mensaje
  if (!user) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold text-yellow-400 mb-4">¡Bienvenido a Deep SunLy Boards!</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">Debes iniciar sesión para acceder a tus tableros.</p>
      </div>
    );
  }

  return (
    <div className="pl-60 pr-8 pt-6">
      {/* Sidebar del dashboard (menú lateral) */}
      <SidebarDashboard />

      {/* Botones superiores para crear un dispositivo o un tablero */}
      <div className="flex justify-between mb-6">
        {/* Botón para abrir el modal de agregar dispositivo */}
        <button
          onClick={() => setMostrarModalDispositivos(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition"
        >
          + Agregar dispositivo
        </button>

        {/* Botón para crear un nuevo tablero */}
        <button
          onClick={crearTablero}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition"
        >
          + Crear nuevo tablero
        </button>
      </div>

      {/* Si el modal para agregar dispositivo está activo, se muestra el componente */}
      {mostrarModalDispositivos && (
        <ModalAgregarDispositivo
          nuevoDispositivo={nuevoDispositivo}                   // estado con datos del nuevo dispositivo
          manejarCambio={manejarCambioDispositivo}             // función para manejar cambios en los inputs del modal
          crearDispositivo={crearDispositivoDesdeDashboard}   // función para crear el dispositivo en Firestore
          onClose={() => setMostrarModalDispositivos(false)}  // cerrar el modal
        />
      )}

      {/* Sección de tableros del usuario */}
      <div className="w-full max-w-7xl mx-auto mb-10">
        {/* Título de la sección */}
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Mis Tableros</h2>

        {/* Itera sobre todos los tableros para mostrarlos */}
        {tableros.map((tablero) => (
          <div
            key={tablero.id}
            className="mb-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 px-6 py-4 rounded-xl shadow hover:shadow-lg transition relative"
          >
            {/* Área clickeable para entrar al tablero */}
            <div
              onClick={() => navigate(`/tablero/${tablero.id}`)}  // navega a la vista del tablero
              className="cursor-pointer mb-1 bg-white dark:bg-zinc-900 px-6 py-4 transition relative"
            >
              {/* Nombre del tablero */}
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{tablero.nombre}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Modificado recientemente</p>
            </div>

            {/* Botones para editar y eliminar el tablero */}
            <div className="absolute top-4 right-4 flex gap-2">
              {/* Botón de editar */}
              <button
                onClick={() => editarTablero(tablero.id, tablero.nombre)}
                className="text-yellow-500 hover:text-yellow-600"
              >
                <FaEdit />
              </button>

              {/* Botón de eliminar */}
              <button
                onClick={() => eliminarTablero(tablero.id)}
                className="text-red-600 hover:text-red-700"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Contenedor principal para la sección de dispositivos */}
      <div className="w-full max-w-7xl mx-auto mt-10">

        {/* Título de la sección */}
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Mis Dispositivos
        </h2>

        {/* Si está cargando, muestra un texto con animación de "Cargando dispositivos..." */}
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-300 py-10 animate-pulse">
            Cargando dispositivos...
          </div>
        ) : (
          // Si no está cargando, muestra la cuadrícula de dispositivos
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">

            {/* Itera sobre cada dispositivo y lo renderiza */}
            {dispositivos.map((disp) => (
              <div
                key={disp.id} // clave única para React
                className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col"
              >

                {/* Imagen del dispositivo o una imagen por defecto si no hay */}
                <img
                  src={disp.imagen || 'https://via.placeholder.com/300x200?text=Sin+imagen'}
                  alt={disp.nombre}
                  className="w-full h-32 object-cover rounded mb-3"
                />

                {/* Nombre del dispositivo */}
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {disp.nombre}
                </h3>

                {/* Tipo del dispositivo */}
                <p className="text-sm text-blue-600">
                  {disp.tipo}
                </p>

                {/* Descripción del dispositivo */}
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {disp.descripcion}
                </p>

                {/* ID del dispositivo con botón para copiar */}
                <div className="text-xs text-gray-500 mt-2 mb-1">
                  ID: <span className="font-mono">{disp.id_dispositivo}</span>

                  {/* Botón para copiar el ID al portapapeles */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(disp.id_dispositivo); // Copia el ID
                      setCopiadoId(disp.id); // Marca como copiado para mostrar feedback
                      setTimeout(() => setCopiadoId(null), 1500); // Quita feedback después de 1.5s
                    }}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    {/* Ícono + texto que cambia si ya se copió */}
                    <FaCopy className="inline-block" /> {copiadoId === disp.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                {/*Contenedor para mostrar la última medición del dispositivo o un mensaje si no hay datos */}
                <div className="text-sm mt-2 text-gray-700 dark:text-white mb-4">

                  {/* Verifica si hay datos de la última medición para este dispositivo */}
                  {ultimasMediciones[disp.id_dispositivo] ? (
                    <>
                      {/* Título para la sección de última medición */}
                      <p><strong>Última medición:</strong></p>

                      {/* Itera sobre las claves/valores del objeto datos de la última medición */}
                      {Object.entries(ultimasMediciones[disp.id_dispositivo].datos).map(([clave, valor]) => (
                        <p key={clave}>
                          {/* Muestra nombre del dato y su valor */}
                          {clave}: <span className="font-mono">{valor}</span>
                        </p>
                      ))}

                      {/* Muestra la fecha/hora en que fue tomada la medición */}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(ultimasMediciones[disp.id_dispositivo].timestamp.toDate()).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    // Si no hay datos, muestra un mensaje en cursiva
                    <p className="italic text-gray-400">Sin datos aún</p>
                  )}
                </div>

                {/* Contenedor para los botones de acción (Editar y Eliminar) */}
                <div className="flex gap-2 mt-auto">

                  {/* Botón para editar el dispositivo */}
                  <button
                    onClick={() => editarDispositivo(disp)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-md text-sm font-semibold transition"
                  >
                    <FaEdit /> Editar
                  </button>

                  {/* Botón para eliminar el dispositivo */}
                  <button
                    onClick={() => eliminarDispositivo(disp.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition"
                  >
                    <FaTrash /> Eliminar
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        { /*Si existe un dispositivo que se está editando, muestra el modal para editarlo*/}
        {dispositivoEditando && (
          <ModalEditarDispositivo
            // Pasa el dispositivo seleccionado para editar como prop
            dispositivo={dispositivoEditando}

            // Función para cerrar el modal (pone dispositivoEditando a null)
            onClose={() => setDispositivoEditando(null)}

            // Función que se llama al guardar los cambios del dispositivo
            onGuardar={guardarEdicion}
          />
        )}

      </div>
    </div>
  );
};
