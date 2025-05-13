import React, { useContext, useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import UserContext from '../providers/UserProvider'
import { AccesoRestringido } from '../componentes/AccesoRestringido'

export const Admin = () => {

  const { user } = useContext(UserContext);
  const [usuarios, setUsuarios] = useState([]);

  const esAdmin = user?.rol === 3;

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
    return <AccesoRestringido/>;
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
    </div>
  )
}
