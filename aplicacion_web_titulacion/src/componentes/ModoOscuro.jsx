import { useEffect, useState } from 'react';

export const ModoOscuro = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Cargar preferencia del localStorage al iniciar
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('bg-black'); // 🌟 AÑADIR bg-black
      setIsDarkMode(true);
    }
  }, []);

  // Función para cambiar el modo
  const toggleModoOscuro = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('bg-black'); // 🌟 QUITAR bg-black
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('bg-black'); // 🌟 AÑADIR bg-black
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <button
      onClick={toggleModoOscuro}
      className="mt-4 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-black dark:text-white shadow"
    >
      {isDarkMode ? 'Modo Claro ☀️' : 'Modo Oscuro 🌙'}
    </button>
  );
};
