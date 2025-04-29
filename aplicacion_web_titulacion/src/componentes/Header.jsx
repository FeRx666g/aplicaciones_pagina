import React from 'react';
import logoFinal from '../assets/LogoPlaneta.png';
import letras from '../assets/LetrasHorizontal.png';
import { NavLink } from 'react-router-dom';

export const Header = () => {
  return (
    // Fondo Externo
    <div className="p-1 bg-gradient-to-r from-sky-400 via-lime-400 to-yellow-400 rounded-full m-2 mt-6  transition-all">

      {/* Inicio del Header */}
      <header className="flex items-center justify-between rounded-full p-2  transition-all">

        {/* Logo y título */}
        <div className="flex items-center">
          <img src={logoFinal} alt="Deep SunLy Logo" className="w-10 h-auto ml-5 " />
          
          <img src={letras} alt="Deep SunLy Logo" className="w-40  mt-1   h-auto ml-4" />
          <h1 className="ml-4 text-2xl font-bold text-black dark:text-white">
            
          </h1>
        </div>

        {/* Navegación */}
        <nav className="flex items-center space-x-8">
          <NavLink to="/inicio" className="text-black dark:text-white text-lg font-bold hover:text-sky-400 transition-transform hover:scale-110">
            Inicio
          </NavLink>
          <NavLink to="/dashboard" className="text-black dark:text-white text-lg font-bold hover:text-sky-400 transition-transform hover:scale-110">
            Dashboard
          </NavLink>
          <NavLink to="/apirestinfo" className="text-black dark:text-white text-lg font-bold hover:text-sky-400 transition-transform hover:scale-110">
            API Rest Info
          </NavLink>
          <NavLink to="/camara" className="text-black dark:text-white text-lg font-bold hover:text-sky-400 transition-transform hover:scale-110">
            Cámara
          </NavLink>
          <NavLink to="/admin" className="text-black dark:text-white text-lg font-bold hover:text-sky-400 transition-transform hover:scale-110">
            Admin
          </NavLink>

          {/* Botones de acción */}
          <div className="ml-6 mr-2">
            <button className="relative inline-flex items-center justify-center px-6 py-2 overflow-hidden font-semibold text-white rounded-full group transform transition-transform duration-300 hover:scale-110 cursor-pointer">
              <span className="absolute inset-0 w-full h-full bg-black  rounded-full transition-transform duration-300"></span>
              <span className="relative z-10">Iniciar Sesión</span>
            </button>
          </div>

          <div className="ml-2 mr-4">
            <button className="relative inline-flex items-center justify-center px-6 py-2 overflow-hidden font-semibold text-white rounded-full group transform transition-transform duration-300 hover:scale-110 cursor-pointer">
              <span className="absolute inset-0 w-full h-full bg-black rounded-full transition-transform duration-300"></span>
              <span className="relative z-10">Registrarse</span>
            </button>
          </div>

        </nav>
        {/* Fin de la navegación */}

      </header>
      {/* Fin del Header */}
    </div>
  );
}
