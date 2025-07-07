import { useEffect, useState } from 'react';

/**
 * ModoOscuro
 *
 * Componente que permite al usuario alternar entre el modo claro y oscuro
 * de la aplicación, aplicando las clases necesarias al elemento <html>.
 *
 * Al montarse:
 * - Lee la preferencia guardada en localStorage (si existe).
 * - Si no hay preferencia, detecta la configuración del sistema operativo.
 * - Aplica la clase `dark` y `bg-black` si corresponde.
 *
 * Incluye un botón fijo en la esquina inferior derecha que permite al usuario
 * activar o desactivar el modo oscuro manualmente. También actualiza
 * la preferencia en localStorage para persistir entre visitas.
 *
 * Estado:
 * - `isDarkMode` (boolean): indica si el modo oscuro está activado actualmente.
 *
 * Este componente usa TailwindCSS para los estilos.
 */

// Componente que permite alternar entre modo claro y modo oscuro
export const ModoOscuro = () => {
  // Estado para saber si actualmente está activado el modo oscuro
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Al montar el componente, lee la preferencia del usuario desde localStorage
  // o detecta la preferencia del sistema operativo
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (
      theme === 'dark' || // Si en localStorage está explícitamente en dark
      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches) // o no hay nada guardado y el sistema prefiere oscuro
    ) {
      document.documentElement.classList.add('dark'); // activa la clase 'dark' en html
      document.documentElement.classList.add('bg-black'); // opcionalmente también cambia fondo a negro
      setIsDarkMode(true); // actualiza el estado local
    }
  }, []);

  // Función que alterna entre claro ↔ oscuro al hacer clic
  const toggleModoOscuro = () => {
    if (document.documentElement.classList.contains('dark')) {
      // Si ya está en oscuro, lo quita
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('bg-black');
      localStorage.setItem('theme', 'light'); // guarda preferencia en localStorage
      setIsDarkMode(false);
    } else {
      // Si está en claro, activa el modo oscuro
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('bg-black');
      localStorage.setItem('theme', 'dark'); // guarda preferencia
      setIsDarkMode(true);
    }
  };

  return (
    // Botón fijo en la esquina inferior derecha para alternar
    <button
      onClick={toggleModoOscuro} // al hacer clic alterna el tema
      className="fixed bottom-3 right-1 z-50 px-0 py-2 text-4xl cursor-pointer text-black dark:text-white transition-all"
    >
      {/* Muestra un sol ☀️ si está en oscuro, o luna 🌙 si está en claro */}
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  );
};
