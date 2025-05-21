import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, setDoc, deleteDoc, doc, updateDoc, Timestamp, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { UserContext } from '../providers/UserProvider';
import { nanoid } from 'nanoid';
import { PiDevicesLight } from 'react-icons/pi';
import { FaTrash, FaEdit } from 'react-icons/fa';
import { ModalEditarDispositivo } from '../componentes/ModalEditarDispositivo';
import { ModalAgregarDispositivo } from '../componentes/ModalAgregarDispositivo';




export const Dispositivos = () => {
    const [ultimasMediciones, setUltimasMediciones] = useState({});
    const [copiadoId, setCopiadoId] = useState(null);
    const { user } = useContext(UserContext);
    const [dispositivoEditando, setDispositivoEditando] = useState(null);
    const [dispositivos, setDispositivos] = useState([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [nuevoDispositivo, setNuevoDispositivo] = useState({
        nombre: '',
        descripcion: '',
        tipo: '',
        imagen: ''
    });

    useEffect(() => {
        if (user) cargarDispositivos();
    }, [user]);

    const cargarDispositivos = async () => {
        const ref = collection(db, 'usuarios', user.uid, 'dispositivos');
        const snapshot = await getDocs(ref);
        const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDispositivos(lista);
    };

    useEffect(() => {
        if (!user || dispositivos.length === 0) return;

        const unsubscribeFns = [];

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

        return () => {
            unsubscribeFns.forEach(fn => fn());
        };
    }, [user, dispositivos]);



    const manejarCambio = (e) => {
        setNuevoDispositivo({
            ...nuevoDispositivo,
            [e.target.name]: e.target.value
        });
    };

    const crearDispositivo = async () => {
        const idDispositivo = nanoid(10);
        const datosDispositivo = {
            ...nuevoDispositivo,
            creado: Timestamp.now(),
            id_dispositivo: idDispositivo,
            activo: true,
            uid: user.uid
        };

        // 1. Guardar en subcolección del usuario
        const refUsuario = collection(db, 'usuarios', user.uid, 'dispositivos');
        await addDoc(refUsuario, datosDispositivo);

        // 2. Guardar también en la colección raíz
        const refGlobal = doc(db, 'dispositivos', idDispositivo);
        await setDoc(refGlobal, datosDispositivo);  // ← esta línea es clave

        setNuevoDispositivo({ nombre: '', descripcion: '', tipo: '', imagen: '' });
        setMostrarFormulario(false);
        cargarDispositivos();
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
        return <div className="p-10 text-center text-red-500">Debes iniciar sesión para ver tus dispositivos.</div>;
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
                className="mb-10 px-134  justify-center py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full shadow transition"
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


            {/* Tarjetas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 justify-center">
                {dispositivos.map((disp) => (
                    <div
                        key={disp.id}
                        className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 p-4 flex flex-col"
                    >
                        <img
                            src={disp.imagen || 'https://via.placeholder.com/300x200?text=Sin+imagen'}
                            alt={disp.nombre}
                            className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{disp.nombre}</h2>
                        <p className="text-sm text-blue-600 font-semibold mb-1">{disp.tipo}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 ">{disp.descripcion}</p>
                        <div className="flex items-center justify-between mt-2 mb-2 ">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                ID: <span className="font-mono">{disp.id_dispositivo}</span>
                            </p>


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
                        <div className="text-sm mt-2 text-gray-700 dark:text-white mb-4 ">
                            {ultimasMediciones[disp.id_dispositivo] ? (
                                <>
                                    <p><strong>Última medición:</strong></p>
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



                        {/* Botones */}
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
