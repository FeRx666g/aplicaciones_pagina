import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';
import { AccesoRestringido } from '../componentes/AccesoRestringido';
import SHA256 from 'crypto-js/sha256';

export const APIKeysPage = () => {
    const { user } = useContext(UserContext);
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const hoy = new Date().toISOString().split('T')[0];
    const [fechaExpiracion, setFechaExpiracion] = useState(hoy);

    // Obtiene todas las API Keys del usuario
    const fetchApiKeys = async () => {
        if (!user) return;

        const refKeys = collection(db, 'api_keys', user.uid, 'keys');
        const snapshot = await getDocs(refKeys);
        const keysList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setApiKeys(keysList);
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchApiKeys();
        }
    }, [user]);

    // Genera una API Key con expiración personalizada y la guarda en la subcolección "keys"
    const generarAPIKey = async () => {
        if (!fechaExpiracion) {
            alert('Por favor selecciona una fecha de expiración válida.');
            return;
        }

        const expiracion = new Date(fechaExpiracion + 'T12:00:00');
        if (isNaN(expiracion)) {
            alert('Fecha inválida. Intenta nuevamente.');
            return;
        }

        const nuevaKey = nanoid(32);
        const hashKey = SHA256(nuevaKey).toString();
        const ahora = new Date();

        // Guarda bajo api_keys/{uid}/keys
        const refKeys = collection(db, 'api_keys', user.uid, 'keys');
        await addDoc(refKeys, {
            hash: hashKey,
            createdAt: Timestamp.fromDate(ahora),
            expiresAt: Timestamp.fromDate(expiracion)
        });

        alert(`Tu nueva API Key (guárdala bien, no podrás verla después):\n\n${nuevaKey}`);

        fetchApiKeys();
    };

    // Elimina una API Key por id dentro de api_keys/{uid}/keys
    const eliminarAPIKey = async (keyId) => {
        const refDoc = doc(db, 'api_keys', user.uid, 'keys', keyId);
        await deleteDoc(refDoc);
        fetchApiKeys();
    };

    if (!user) {
        return <AccesoRestringido />;
    }

    if (loading) {
        return <p className="text-center mt-10">Cargando API Keys...</p>;
    }

    return (
        <div className="max-w-5xl mx-auto mt-8 mb-6 p-8 bg-white/90 dark:bg-black/80 backdrop-blur-lg shadow-2xl rounded-2xl border text-center border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-extrabold mb-6 text-gray-900 dark:text-white">Mis API Keys</h1>

            {/* Selector de fecha */}
            <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    Selecciona la fecha de expiración de la API Key:
                </label>
                <input
                    type="date"
                    value={fechaExpiracion}
                    onChange={(e) => setFechaExpiracion(e.target.value)}
                    className="p-3 rounded-lg border dark:bg-zinc-800 dark:text-white dark:border-gray-600 transition-transform"
                    min={hoy} // evita fechas pasadas
                />
            </div>

            <button
                onClick={generarAPIKey}
                className="bg-gradient-to-r cursor-pointer from-sky-500 to-indigo-600 text-white px-6 py-3 mb-8 rounded-lg hover:scale-105 text-center transition-transform"
            >
                Generar nueva API Key
            </button>

            {apiKeys.length > 0 ? (
                <ul className="space-y-4">
                    {apiKeys.map((key) => (
                        <li key={key.id} className="flex flex-col bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl border border-gray-300 dark:border-zinc-600 shadow-md break-words">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-semibold">
                                ID: {key.id}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                Expira: {key.expiresAt?.toDate ? key.expiresAt.toDate().toLocaleDateString() : 'Sin fecha'}
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
