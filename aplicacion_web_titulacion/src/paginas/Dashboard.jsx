import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../providers/UserProvider';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';
import { SidebarDashboard } from '../componentes/SidebarDashboard';

export const Dashboard = () => {
  const { user } = useContext(UserContext);
  const [tableros, setTableros] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null); // ID del tablero que tiene menú abierto

  useEffect(() => {
    if (user) {
      cargarTableros();
    }
  }, [user]);

  const cargarTableros = async () => {
    const ref = collection(db, 'tableros', user.uid, 'misTableros');
    const snapshot = await getDocs(ref);
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTableros(datos);
  };

  const crearTablero = async () => {
    const nombre = prompt("Nombre del nuevo tablero:");
    if (!nombre) return;
    const ref = collection(db, 'tableros', user.uid, 'misTableros');
    await addDoc(ref, {
      nombre,
      creado: Timestamp.now(),
      idTablero: nanoid(10)
    });
    cargarTableros();
  };

  const eliminarTablero = async (id) => {
    const confirmar = confirm("¿Eliminar este tablero?");
    if (!confirmar) return;
    const ref = doc(db, 'tableros', user.uid, 'misTableros', id);
    await deleteDoc(ref);
    cargarTableros();
  };

  const editarTablero = async (id, nombreActual) => {
    const nuevoNombre = prompt("Nuevo nombre para el tablero:", nombreActual);
    if (!nuevoNombre || nuevoNombre === nombreActual) return;

    const ref = doc(db, 'tableros', user.uid, 'misTableros', id);
    await updateDoc(ref, { nombre: nuevoNombre });
    cargarTableros();
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

      {/* Encabezado superior */}
      <div className="flex justify-end mb-6">
        <button
          onClick={crearTablero}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition"
        >
          + Crear nuevo tablero
        </button>
      </div>

      {/* Lista de tableros estilo Miro */}
      <div className="w-full max-w-5xl mx-auto space-y-4">
        {tableros.map((tablero) => (
          <div
            key={tablero.id}
            className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-6 py-4 rounded-xl shadow hover:shadow-lg transition relative"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{tablero.nombre}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Modificado recientemente
              </p>
            </div>

            {/* Botón de tres puntos y menú contextual */}
            <div className="relative">
              <button
                onClick={() =>
                  setMenuVisible(menuVisible === tablero.id ? null : tablero.id)
                }
                className="text-2xl px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition"
              >
                ⋮
              </button>

              {menuVisible === tablero.id && (
                <div
                  className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded shadow-lg z-10"
                  onMouseLeave={() => setMenuVisible(null)}
                >
                  <button
                    onClick={() => editarTablero(tablero.id, tablero.nombre)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => eliminarTablero(tablero.id)}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-700"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
