import React from 'react';
import logoFinal from '../assets/LogoPlaneta.png';
import letras from '../assets/LetrasHorizontal.png';
import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from '../providers/UserProvider';

export const Header = () => {

  const { user, loginConGoogle, cerrarSesion } = useContext(UserContext);

  return (
    // Fondo Externo
    <div className="bg-gradient-to-r from-sky-400 via-lime-400 to-yellow-400 rounded-full mt-3 mx-8 px-4 transition-all">

      {/* Inicio del Header */}
      <header className="flex items-center justify-between rounded-full p-2 transition-all">

        {/* Logo y título */}
        <div className="flex items-center">
          <img src={logoFinal} alt="Deep SunLy Logo" className="w-9  h-auto ml-5 " />
          <img src={letras} alt="Deep SunLy Logo" className="w-30   mt-1   h-auto ml-4 mr-20 " />
        </div>

        {/* Navegación */}
        <nav className="flex items-center space-x-4 flex-nowrap whitespace-nowrap  transition-all">
          <NavLink to="/inicio" className="nav-header ">
            Inicio
          </NavLink>
          <NavLink to="/dashboard" className="nav-header">
            Dashboard
          </NavLink>
          <NavLink to="/apirestinfo" className="nav-header">
            API Rest Info
          </NavLink>
          <NavLink to="/camara" className="nav-header">
            Cámara
          </NavLink>
          {user?.rol === 3 && (
            <NavLink to="/admin" className="nav-header">
              Admin
            </NavLink>
          )}


          {user && (
            <NavLink to="/mis-apikeys" className="nav-header">
              API Keys
            </NavLink>
          )}


          {/* Botones de acción */}
          {user ? <>
            <div className='p-[2px] rounded-full bg-gradient-to-r from-sky-400 via-lime-400 to-sky-400 ml-4'>
              <div className='bg-black rounded-full flex items-center px-3 py-1 text-white max-w-[200px] overflow-hidden'>
                <span className='truncate text-sm font-semibold mr-2'>
                  {user.displayName}
                </span>
                <img
                  src={user.photoURL}
                  alt="Foto de perfil"
                  className="w-8 h-8 rounded-full object-cover"
                />
              </div>
            </div>


            <button
              onClick={cerrarSesion}
              className="  px-4 py-3 mr-1  cursor-pointer rounded-full bg-red-500 font-semibold  text-white hover:bg-red-600 transition"
            >
              LogOut
            </button>
          </>
            :
            <>

              <div className='p-[2px] rounded-full bg-gradient-to-r from-sky-400 via-lime-400 to-cyan-300  '>
                <div className="">
                  <button onClick={loginConGoogle} className="relative text-base  inline-flex items-center justify-center px-6 py-2 overflow-hidden font-semibold text-white rounded-full group transform transition-transform duration-300 hover:scale-110 cursor-pointer">
                    <span className="absolute inset-0 w-full h-full bg-black    rounded-full transition-transform duration-300"></span>
                    <span className="relative z-10">Iniciar Sesión</span>
                  </button>
                </div>
              </div>

              <div className='p-[2px] rounded-full bg-gradient-to-r from-sky-400 via-lime-400 to-cyan-300  '>
                <div className="">
                  <button onClick={loginConGoogle} className="relative text-base inline-flex items-center justify-center px-6 py-2 overflow-hidden font-semibold text-white rounded-full group transform transition-transform duration-300 hover:scale-110 cursor-pointer">
                    <span className="absolute inset-0 w-full h-full bg-black   rounded-full transition-transform duration-300"></span>
                    <span className="relative z-10">Registrarse</span>
                  </button>
                </div>
              </div>

            </>
          }
        </nav>
        {/* Fin de la navegación */}

      </header>
      {/* Fin del Header */}
    </div>
  );
}
