import React, { createContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * UserProvider.jsx
 *
 * Proveedor de contexto para la autenticación de usuarios y gestión de sesión.
 *
 * - Proporciona un contexto (`UserContext`) que expone:
 *   - `user`: objeto con los datos del usuario autenticado (o `false` si no hay sesión).
 *   - `setUser`: función para actualizar el estado del usuario manualmente.
 *   - `loginConGoogle`: función para iniciar sesión con Google.
 *   - `cerrarSesion`: función para cerrar la sesión actual.
 *
 * Funcionalidades:
 * - Escucha en tiempo real los cambios en el estado de autenticación de Firebase (`onAuthStateChanged`).
 * - Al autenticarse, consulta si existe el documento del usuario en Firestore:
 *   - Si existe: carga los datos del documento.
 *   - Si no existe: crea el documento con datos básicos y rol por defecto.
 * - Maneja los flujos de login, logout y persistencia de datos del usuario.
 *
 * Dependencias:
 * - Firebase Authentication para manejar la sesión.
 * - Firebase Firestore para almacenar y recuperar los datos del usuario.
 *
 * Hooks:
 * - `useEffect` para suscribirse y desuscribirse al listener de autenticación.
 *
 * Este componente envuelve a la aplicación en un `<UserContext.Provider>` para que cualquier componente hijo
 * pueda consumir el estado y las funciones relacionadas a la autenticación.
 */

// Crea el contexto para el usuario, que se usará para acceder a la información en toda la app.
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Estado para almacenar el usuario autenticado o `false` si no hay sesión.
  const [user, setUser] = useState(false);

  // Hook para escuchar los cambios en la autenticación de Firebase.
  useEffect(() => {
    // Se suscribe a los cambios de autenticación.
    const unsuscribe = onAuthStateChanged(auth, async (usuarioFirebase) => {
      if (usuarioFirebase) {
        try {
          // Si hay usuario autenticado, busca su documento en Firestore.
          const refDoc = doc(db, "usuarios", usuarioFirebase.uid);
          const documentoObtenido = await getDoc(refDoc);

          if (documentoObtenido.exists()) {
            // Si existe en Firestore, actualiza el estado con sus datos.
            const datos = documentoObtenido.data();
            setUser(datos);
          } else {
            // Si no existe en Firestore, lo considera sin sesión.
            setUser(false);
          }
        } catch (error) {
          // Manejo de errores al consultar Firestore.
          console.error("Error al obtener usuario de Firestore:", error);
          setUser(false);
        }
      } else {
        // Si no hay usuario autenticado en Firebase, establece el estado en `false`.
        setUser(false);
      }
    });

    // Limpia la suscripción al desmontar el componente.
    return () => unsuscribe();
  }, []);

  /**
   * Cierra la sesión del usuario.
   */
  const cerrarSesion = async () => {
    try {
      await signOut(auth); // Cierra sesión en Firebase Auth.
      setUser(false);      // Limpia el estado local.
      console.log("Sesión cerrada");
    } catch (error) {
      console.error("Error al cerrar sesión.", error);
    }
  };

  /**
   * Inicia sesión con Google y crea el documento en Firestore si no existe.
   */
  const loginConGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Abre el popup de autenticación con Google.
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const refDoc = doc(db, "usuarios", user.uid);
      let documentoObtenido = await getDoc(refDoc);

      if (!documentoObtenido.exists()) {
        // Si el documento no existe, lo crea con los datos del usuario.
        const nuevoUsuario = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          rol: 1 // Asigna rol por defecto.
        };

        await setDoc(refDoc, nuevoUsuario);
        documentoObtenido = await getDoc(refDoc);
      }

      // Actualiza el estado local con los datos del documento de Firestore.
      const datosActualizados = documentoObtenido.data();
      setUser(datosActualizados);

      console.log("Usuario autenticado y cargado desde Firestore:", datosActualizados);
    } catch (error) {
      console.error("Error en login con Google:", error);
    }
  };

  // Devuelve el provider para que los hijos tengan acceso al contexto.
  return (
    <UserContext.Provider value={{ user, setUser, loginConGoogle, cerrarSesion }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
