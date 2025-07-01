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


export const Dashboard = () => {
  const { user } = useContext(UserContext);
  const [mostrarModalDispositivos, setMostrarModalDispositivos] = useState(false);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({ nombre: '', descripcion: '', tipo: '', imagen: '' });
  const [dispositivos, setDispositivos] = useState([]);
  const [ultimasMediciones, setUltimasMediciones] = useState({});
  const [dispositivoEditando, setDispositivoEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableros, setTableros] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const navigate = useNavigate();


  useEffect(() => {
    if (user) {
      cargarDispositivos();
      cargarTableros();
    }
  }, [user]);

  const cargarDispositivos = async () => {
    setLoading(true);
    const ref = collection(db, 'usuarios', user.uid, 'dispositivos');
    const snapshot = await getDocs(ref);
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDispositivos(lista);
    setLoading(false);
  };

  const cargarTableros = async () => {
    const ref = collection(db, 'tableros', user.uid, 'misTableros');
    const snapshot = await getDocs(ref);
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTableros(datos);
  };

  const crearTablero = async () => {
    const nombre = prompt("Nombre del nuevo tablero:");
    if (!nombre || nombre.trim() === '') {
      alert("El nombre del tablero no puede estar vacío.");
      return;
    }

    const idTablero = nanoid(10);
    const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero);
    await setDoc(ref, {
      nombre: nombre.trim(),
      creado: Timestamp.now()
    });

    cargarTableros();
  };

  const editarTablero = async (id, nombreActual) => {
    const nuevoNombre = prompt("Nuevo nombre para el tablero:", nombreActual);
    if (!nuevoNombre || nuevoNombre.trim() === '' || nuevoNombre === nombreActual) return;
    const ref = doc(db, 'tableros', user.uid, 'misTableros', id);
    await updateDoc(ref, { nombre: nuevoNombre.trim() });
    cargarTableros();
  };

  const eliminarTablero = async (id) => {
    const confirmar = confirm("¿Eliminar este tablero?");
    if (!confirmar) return;
    const ref = doc(db, 'tableros', user.uid, 'misTableros', id);
    await deleteDoc(ref);
    cargarTableros();
  };

  useEffect(() => {
    if (!user || dispositivos.length === 0) return;
    const unsubscribes = dispositivos.map((disp) => {
      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', disp.id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setUltimasMediciones(prev => ({ ...prev, [disp.id_dispositivo]: data }));
        }
      });
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, dispositivos]);

  const manejarCambioDispositivo = (e) => {
    setNuevoDispositivo({ ...nuevoDispositivo, [e.target.name]: e.target.value });
  };

  const crearDispositivoDesdeDashboard = async () => {
    try {
      if (!nuevoDispositivo.nombre || !nuevoDispositivo.tipo) {
        alert("Debes completar al menos el nombre y el tipo del dispositivo.");
        return;
      }
      const idDispositivo = nanoid(10);
      const datosDispositivo = {
        ...nuevoDispositivo,
        creado: Timestamp.now(),
        id_dispositivo: idDispositivo,
        activo: true,
        uid: user.uid
      };
      const refUsuario = collection(db, 'usuarios', user.uid, 'dispositivos');
      await addDoc(refUsuario, datosDispositivo);
      const refGlobal = doc(db, 'dispositivos', idDispositivo);
      await setDoc(refGlobal, datosDispositivo);
      setNuevoDispositivo({ nombre: '', descripcion: '', tipo: '', imagen: '' });
      setMostrarModalDispositivos(false);
      cargarDispositivos();
    } catch (error) {
      console.error("Error al crear el dispositivo:", error);
      alert("Ocurrió un error al guardar el dispositivo.");
    }
  };

  const eliminarDispositivo = async (id) => {
    const confirmar = confirm('¿Eliminar este dispositivo?');
    if (!confirmar) return;
    await deleteDoc(doc(db, 'usuarios', user.uid, 'dispositivos', id));
    cargarDispositivos();
  };

  const editarDispositivo = (disp) => {
    setDispositivoEditando(disp);
  };

  const guardarEdicion = async (dispositivoActualizado) => {
    await updateDoc(doc(db, 'usuarios', user.uid, 'dispositivos', dispositivoActualizado.id), {
      nombre: dispositivoActualizado.nombre,
      tipo: dispositivoActualizado.tipo,
      descripcion: dispositivoActualizado.descripcion,
      imagen: dispositivoActualizado.imagen
    });
    setDispositivoEditando(null);
    cargarDispositivos();
  };

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
      <SidebarDashboard />

      <div className="flex justify-between mb-6">
        <button onClick={() => setMostrarModalDispositivos(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition">
          + Agregar dispositivo
        </button>
        <button onClick={crearTablero} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition">
          + Crear nuevo tablero
        </button>
      </div>

      {mostrarModalDispositivos && (
        <ModalAgregarDispositivo
          nuevoDispositivo={nuevoDispositivo}
          manejarCambio={manejarCambioDispositivo}
          crearDispositivo={crearDispositivoDesdeDashboard}
          onClose={() => setMostrarModalDispositivos(false)}
        />
      )}

      <div className="w-full max-w-7xl mx-auto mb-10">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Mis Tableros</h2>
        {tableros.map((tablero) => (
          <div key={tablero.id} className="mb-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 px-6 py-4 rounded-xl shadow hover:shadow-lg transition relative">
            <div
              onClick={() => navigate(`/tablero/${tablero.id}`)}
              className="cursor-pointer mb-1 bg-white dark:bg-zinc-900  px-6 py-4  transition relative"
            >
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{tablero.nombre}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Modificado recientemente</p>
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => editarTablero(tablero.id, tablero.nombre)} className="text-yellow-500 hover:text-yellow-600">
                <FaEdit />
              </button>
              <button onClick={() => eliminarTablero(tablero.id)} className="text-red-600 hover:text-red-700">
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-7xl mx-auto mt-10">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Mis Dispositivos</h2>
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-300 py-10 animate-pulse">Cargando dispositivos...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {dispositivos.map((disp) => (
              <div key={disp.id} className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col">
                <img src={disp.imagen || 'https://via.placeholder.com/300x200?text=Sin+imagen'} alt={disp.nombre} className="w-full h-32 object-cover rounded mb-3" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{disp.nombre}</h3>
                <p className="text-sm text-blue-600">{disp.tipo}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{disp.descripcion}</p>
                <div className="text-xs text-gray-500 mt-2 mb-1">
                  ID: <span className="font-mono">{disp.id_dispositivo}</span>
                  <button onClick={() => {
                    navigator.clipboard.writeText(disp.id_dispositivo);
                    setCopiadoId(disp.id);
                    setTimeout(() => setCopiadoId(null), 1500);
                  }} className="ml-2 text-blue-500 hover:text-blue-700">
                    <FaCopy className="inline-block" /> {copiadoId === disp.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <div className="text-sm mt-2 text-gray-700 dark:text-white mb-4">
                  {ultimasMediciones[disp.id_dispositivo] ? (
                    <>
                      <p><strong>Última medición:</strong></p>
                      {Object.entries(ultimasMediciones[disp.id_dispositivo].datos).map(([clave, valor]) => (
                        <p key={clave}>{clave}: <span className="font-mono">{valor}</span></p>
                      ))}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(ultimasMediciones[disp.id_dispositivo].timestamp.toDate()).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="italic text-gray-400">Sin datos aún</p>
                  )}
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => editarDispositivo(disp)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-md text-sm font-semibold transition">
                    <FaEdit /> Editar
                  </button>
                  <button onClick={() => eliminarDispositivo(disp.id)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition">
                    <FaTrash /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {dispositivoEditando && (
          <ModalEditarDispositivo
            dispositivo={dispositivoEditando}
            onClose={() => setDispositivoEditando(null)}
            onGuardar={guardarEdicion}
          />
        )}
      </div>
    </div>
  );
};
