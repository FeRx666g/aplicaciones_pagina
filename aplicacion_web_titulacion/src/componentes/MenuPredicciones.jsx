import React, { useState, useRef } from "react";
import { NavLink } from "react-router-dom";

export const MenuPredicciones = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  if (!user || user.rol < 1) return null;

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // ⏳ 200ms de tolerancia
  };

  return (
    <div
      className="relative inline-block text-black dark:text-white text-lg font-bold"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cursor-pointer hover:text-lime-400 px-2">
        Predicciones
      </div>

      {isOpen && (
        <div
          className="
            absolute left-0 mt-1
            bg-white dark:bg-gray-900
            shadow-xl rounded-md
            w-48 z-50
            transition-all
          "
          style={{ paddingTop: '4px', paddingBottom: '4px' }}
        >
          <NavLink
            to="/prediccionestatica"
            className="
              block px-4 py-2 
              text-black dark:text-white text-base font-bold 
              hover:bg-gray-100 dark:hover:bg-zinc-700
            "
            onClick={() => setIsOpen(false)}
          >
            Estática
          </NavLink>
          <NavLink
            to="/predicciontiemporeal"
            className="
              block px-4 py-2 
              text-black dark:text-white text-base font-bold 
              hover:bg-gray-100 dark:hover:bg-zinc-700
            "
            onClick={() => setIsOpen(false)}
          >
            Tiempo Real
          </NavLink>
        </div>
      )}
    </div>
  );
};
