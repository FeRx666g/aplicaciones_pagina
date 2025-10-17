import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp, setDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';
import { AccesoRestringido } from '../componentes/AccesoRestringido';
import SHA256 from 'crypto-js/sha256';
import Swal from 'sweetalert2';
import { orderBy } from 'firebase/firestore';

/**
 * APIKeysPage
 *
 * Componente que permite a los usuarios autenticados gestionar sus API Keys.
 *
 * Muestra:
 * - Un selector para elegir fecha y hora de expiración de una nueva API Key.
 * - Un botón para generar una nueva API Key (mostrando la clave completa solo una vez).
 * - Una lista de API Keys ya generadas con su fecha de expiración y la opción de eliminarlas.
 *
 * Funcionalidades:
 * - Obtiene las API Keys del usuario desde Firestore (`api_keys`).
 * - Genera una API Key aleatoria (32 caracteres), guarda su hash (SHA256) en Firestore con la expiración.
 * - Elimina una API Key seleccionada.
 * - Permite copiar la clave recién generada al portapapeles desde el modal.
 *
 * Usa:
 * - Contexto `UserContext` para obtener el usuario actual.
 * - Firestore (getDocs, setDoc, deleteDoc, query, Timestamp) para persistencia.
 * - `nanoid` para generar claves únicas.
 * - `crypto-js/SHA256` para almacenar solo el hash de la clave.
 * - `SweetAlert2` para notificaciones y confirmaciones.
 *
 * Estilizado con TailwindCSS.
 */


export const APIKeysPage = () => {
    // Obtiene el usuario actual del contexto
    const { user } = useContext(UserContext);

    // Estado para guardar las API Keys del usuario
    const [apiKeys, setApiKeys] = useState([]);

    // Estado para indicar si aún está cargando
    const [loading, setLoading] = useState(true);

    // Fecha actual en formato YYYY-MM-DD para inicializar
    const hoy = new Date().toISOString().split('T')[0];

    // Hora actual en formato HH:MM para inicializar
    const ahora = new Date().toTimeString().slice(0, 5);

    // Estado para la fecha de expiración de la nueva API Key
    const [fechaExpiracion, setFechaExpiracion] = useState(hoy);

    // Estado para la hora de expiración de la nueva API Key
    const [horaExpiracion, setHoraExpiracion] = useState(ahora);


    // Función para obtener todas las API Keys del usuario
    const fetchApiKeys = async () => {
        if (!user) return; // si no hay usuario, no hace nada

        // Crea la consulta para las keys del usuario actual
        const q = query(
            collection(db, 'api_keys'),
            where('uid', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        // Ejecuta la consulta
        const snapshot = await getDocs(q);

        // Mapea los documentos a un array
        const keysList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Guarda las keys en el estado
        setApiKeys(keysList);

        // Indica que ya terminó de cargar
        setLoading(false);
    };

    // Ejecuta la carga inicial de las API Keys cuando hay usuario
    useEffect(() => {
        if (user) {
            fetchApiKeys();
        }
    }, [user]);


    // Función para generar una nueva API Key con expiración personalizada
    const generarAPIKey = async () => {
        // Verifica que las fechas estén definidas
        if (!fechaExpiracion || !horaExpiracion) {
            Swal.fire({
                icon: 'warning',
                title: 'Fecha y hora requeridas',
                text: 'Por favor selecciona una fecha y hora de expiración válidas.'
            });
            return;
        }

        // Construye el objeto Date a partir de las entradas
        const expiracion = new Date(`${fechaExpiracion}T${horaExpiracion}:00`);

        // Verifica que sea válida
        if (isNaN(expiracion)) {
            Swal.fire({
                icon: 'error',
                title: 'Fecha u hora inválida',
                text: 'Por favor verifica los valores e intenta nuevamente.'
            });
            return;
        }

        // Genera la clave real y su hash
        const nuevaKey = nanoid(32); // clave visible para el usuario
        const hashKey = SHA256(nuevaKey).toString(); // solo se guarda el hash en la BD

        const ahora = new Date();

        // Referencia al documento en Firestore
        const docRef = doc(db, 'api_keys', hashKey);

        // Verifica que no exista ya esa key
        const existe = await getDoc(docRef);
        if (existe.exists()) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ya existe una API Key igual. Intenta nuevamente.'
            });
            return;
        }

        // Guarda la key en Firestore con el hash, fecha de creación y expiración
        await setDoc(docRef, {
            uid: user.uid,
            createdAt: Timestamp.fromDate(ahora),
            expiresAt: Timestamp.fromDate(expiracion)
        });

        // Muestra la clave real y permite copiarla antes de cerrarse
        Swal.fire({
            icon: 'success',
            title: 'API Key generada',
            html: `
        <div>
            <strong id="apikey">${nuevaKey}</strong>
            <br><br>
            <button id="copiar" class="swal2-confirm swal2-styled" style="background-color:#3085d6;">
                Copiar
            </button>
            <br><br>
            <small>(Guárdala bien, no podrás verla después)</small>
        </div>
    `,
            confirmButtonText: 'Entendido',
            didOpen: () => {
                // Maneja el botón de copiar
                const botonCopiar = Swal.getPopup().querySelector('#copiar');
                const texto = Swal.getPopup().querySelector('#apikey').textContent;
                botonCopiar.addEventListener('click', () => {
                    navigator.clipboard.writeText(texto);
                    botonCopiar.textContent = 'Copiado ✔️';
                    setTimeout(() => {
                        botonCopiar.textContent = 'Copiar';
                    }, 1500);
                });
            }
        });

        // Actualiza las keys en la vista
        fetchApiKeys();
    };

    // Elimina una API Key por id dentro de api_keys/{uid}/keys
    const eliminarAPIKey = async (hashKey) => {
        // Muestra un cuadro de confirmación antes de eliminar
        const confirmacion = await Swal.fire({
            title: '¿Eliminar API Key?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        // Si el usuario cancela, no hace nada
        if (!confirmacion.isConfirmed) return;

        // Elimina el documento con el hashKey en la colección api_keys
        await deleteDoc(doc(db, 'api_keys', hashKey));

        // Muestra notificación de éxito
        Swal.fire({
            icon: 'success',
            title: 'API Key eliminada',
            timer: 1500,
            showConfirmButton: false
        });

        // Recarga la lista de API Keys
        fetchApiKeys();
    };

    // Si no hay usuario (no autenticado), renderiza componente de acceso restringido
    if (!user) {
        return <AccesoRestringido />;
    }

    // Mientras se cargan las API Keys, muestra mensaje de carga
    if (loading) {
        return <p className="text-center mt-10">Cargando API Keys...</p>;
    }

    return (
        <div className="max-w-5xl mx-auto mt-8 mb-6 p-8 bg-white/90 dark:bg-black/80 backdrop-blur-lg shadow-2xl rounded-2xl border text-center border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-extrabold mb-6 text-gray-900 dark:text-white">Mis API Keys</h1>

            {/* Selector de fecha y hora */}
            <div className="mb-6 ">
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    Selecciona la fecha y hora de expiración de la API Key:
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start justify-center sm:items-center">
                    <input
                        type="date"
                        value={fechaExpiracion}
                        onChange={(e) => setFechaExpiracion(e.target.value)}
                        className="p-3 rounded-lg border dark:bg-zinc-800 dark:text-white dark:border-gray-600 transition-transform"
                        min={hoy}
                    />
                    <input
                        type="time"
                        value={horaExpiracion}
                        onChange={(e) => setHoraExpiracion(e.target.value)}
                        className="p-3 rounded-lg border dark:bg-zinc-800 dark:text-white dark:border-gray-600 transition-transform"
                    />
                </div>
            </div>

            {/* Botón para generar API Key */}
            <button
                onClick={generarAPIKey}
                className="bg-gradient-to-r cursor-pointer from-sky-500 to-indigo-600 text-white px-6 py-3 mb-8 rounded-lg hover:scale-105 text-center transition-transform"
            >
                Generar nueva API Key
            </button>

            {/* Lista de API Keys */}
            {apiKeys.length > 0 ? (
                <ul className="space-y-4">
                    {apiKeys.map((key) => (
                        <li key={key.id} className="flex flex-col bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl border border-gray-300 dark:border-zinc-600 shadow-md break-words">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-semibold">
                                ID: {key.id}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                Expira: {key.expiresAt?.toDate ? key.expiresAt.toDate().toLocaleString() : 'Sin fecha'}
                            </div>
                            <div className="flex gap-2 mt-3 justify-center">
                                <button
                                    onClick={() => eliminarAPIKey(key.id)}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-center cursor-pointer hover:bg-red-700 text-sm"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-600 dark:text-gray-300">No tienes API Keys generadas aún.</p>
            )}
        </div>
    );

};
