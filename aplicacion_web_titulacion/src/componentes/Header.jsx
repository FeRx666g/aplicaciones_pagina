import React from 'react';
import logoFinal from '../assets/LogoPlaneta.png';
import letras from '../assets/LetrasHorizontal.png';
import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { MenuPredicciones } from "./MenuPredicciones";
import { UserContext } from '../providers/UserProvider';

export const Header = () => {

  const { user, loginConGoogle, cerrarSesion } = useContext(UserContext);

  return (
    <div className="relative z-50 border-b-4 border-transparent bg-white dark:bg-black  px-6 py-3">
      {/* Línea gradiente arriba */}
      <div className="absolute top-0 left-0 w-full h-1 bg-sky-400" />

      {/* Línea gradiente abajo */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-400" />

      <header className="flex items-center justify-between">
        {/* Logo y nombre */}
        <div className="flex items-center space-x-4">
          <img src={logoFinal} alt="Logo" className="w-10 h-auto" />
          <img src={letras} alt="Nombre" className="h-6 mt-1" />
        </div>

        {/* Navegación */}
        <nav className="flex space-x-6 items-center">
          <NavLink to="/inicio" className="text-black dark:text-white text-lg font-bold hover:text-lime-400">Inicio</NavLink>
          <MenuPredicciones user={user} />
          <NavLink to="/dashboard" className="text-black dark:text-white text-lg font-bold hover:text-lime-400">Dashboard</NavLink>
          {!user && (
            <NavLink
              to="/apirestinfo"
              className="text-black dark:text-white text-lg font-bold hover:text-lime-400">
              API Rest Info
            </NavLink>
          )}

          {user?.rol >= 1 && <NavLink to="/dispositivos" className="text-black dark:text-white text-lg font-bold hover:text-lime-400">Dispositivos</NavLink>}
          {user?.rol === 3 && <NavLink to="/camara" className="text-black dark:text-white text-lg font-bold hover:text-lime-400">Cámara</NavLink>}
          {user?.rol === 3 && <NavLink to="/admin" className="text-black dark:text-white text-lg font-bold hover:text-lime-400">Admin</NavLink>}
          {user && <NavLink to="/mis-apikeys" className="text-black dark:text-white text-lg font-bold hover:text-lime-400">API Keys</NavLink>}
        </nav>


        {/* Usuario o login */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-sky-400 via-lime-400 to-sky-400 rounded-full p-[2px]">
                <div className="bg-black text-white px-3 py-1 rounded-full flex items-center">
                  <span className="truncate max-w-[120px]">{user.displayName}</span>
                  <img src={user.photoURL} className="w-8 h-8 rounded-full ml-2" alt="Perfil" />
                </div>
              </div>
              <button onClick={cerrarSesion} className="text-white bg-red-500 hover:bg-red-600 rounded-full px-4 py-2 font-semibold">
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-sky-400 via-lime-400 to-sky-400 rounded-full p-[2px]">

                <button onClick={loginConGoogle} className="text-white bg-black hover:bg-gray-800 px-4 py-2 rounded-full cursor-pointer font-medium">
                  Autenticarse
                </button>
              </div>
            </>
          )}
        </div>
      </header>
    </div>

  );
}