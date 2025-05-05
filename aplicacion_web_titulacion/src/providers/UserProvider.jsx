import React, { createContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(false);

  useEffect(() => {
    const unsuscribe = onAuthStateChanged(auth, async (usuarioFirebase) => {
      if (usuarioFirebase) {
        try {
          const refDoc = doc(db, "usuarios", usuarioFirebase.uid);
          const documentoObtenido = await getDoc(refDoc);

          if (documentoObtenido.exists()) {
            const datos = documentoObtenido.data();
            setUser(datos);
          } else {
            setUser(false);
          }
        } catch (error) {
          console.error("Error al obtener usuario de Firestore:", error);
          setUser(false);
        }
      } else {
        setUser(false);
      }
    });

    return () => unsuscribe();
  }, []);

  const cerrarSesion = async () => {
    try {
      await signOut(auth);
      setUser(false);
      console.log("Sesión cerrada");
    } catch (error) {
      console.error("Error al cerrar sesión.", error);
    }
  };

  const loginConGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const refDoc = doc(db, "usuarios", user.uid);
      let documentoObtenido = await getDoc(refDoc);

      if (!documentoObtenido.exists()) {
        const nuevoUsuario = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          rol: 1
        };

        await setDoc(refDoc, nuevoUsuario);
        documentoObtenido = await getDoc(refDoc);
      }

      const datosActualizados = documentoObtenido.data();
      setUser(datosActualizados);

      console.log("Usuario autenticado y cargado desde Firestore:", datosActualizados);
    } catch (error) {
      console.error("Error en login con Google:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loginConGoogle, cerrarSesion }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
