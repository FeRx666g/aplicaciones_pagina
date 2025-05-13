import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';
import { AccesoRestringido } from '../componentes/AccesoRestringido';

export const APIKeysPage = () => {
    const { user } = useContext(UserContext);
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchApiKeys = async () => {
        if (!user) return;

        const refKeys = collection(db, 'api_keys', user.uid, 'keys');
        const snapshot = await getDocs(refKeys);
        const keysList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApiKeys(keysList);
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchApiKeys();
        }
    }, [user]);

    const generarAPIKey = async () => {
        const nuevaKey = nanoid(32);
        const refKeys = collection(db, 'api_keys', user.uid, 'keys');
        await addDoc(refKeys, {
            key: nuevaKey,
            createdAt: new Date()
        });
        fetchApiKeys();
    };

    const eliminarAPIKey = async (keyId) => {
        const refDoc = doc(db, 'api_keys', user.uid, 'keys', keyId);
        await deleteDoc(refDoc);
        fetchApiKeys();
    };

    const copiarAPIKey = async (key) => {
        try {
            await navigator.clipboard.writeText(key);
            alert("API Key copiada al portapapeles");
        } catch (error) {
            console.error("Error al copiar:", error);
        }
    };

    if (!user) {
        return <AccesoRestringido />;
    }


    if (loading) {
        return <p className="text-center mt-10">Cargando API Keys...</p>;
    }

    return (
        <div className="max-w-5xl mx-auto mt-8 mb-6  p-8  bg-white/90 dark:bg-black/80 backdrop-blur-lg shadow-2xl rounded-2xl border text-center border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-extrabold mb-6 text-gray-900 dark:text-white">Mis API Keys</h1>

            <button
                onClick={generarAPIKey}
                className="bg-gradient-to-r cursor-pointer from-sky-500 to-indigo-600 text-white px-6 py-3 mb-8 rounded-lg hover:scale-105 text-center transition-transform"
            >
                Generar nueva API Key
            </button>

            {apiKeys.length > 0 ? (
                <ul className="space-y-4">
                    {apiKeys.map((key) => (
                        <li key={key.id} className="flex flex-col bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl border border-gray-300 dark:border-zinc-600 shadow-md text-center break-all">
                            <div className="font-mono text-blue-700 dark:text-blue-400">{key.key}</div>
                            <div className="flex gap-2 mt-3 justify-center">
                                <button
                                    onClick={() => copiarAPIKey(key.key)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-center cursor-pointer hover:bg-green-700 text-sm"
                                >
                                    Copiar
                                </button>
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
