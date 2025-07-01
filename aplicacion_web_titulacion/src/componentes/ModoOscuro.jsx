import { useEffect, useState } from 'react';

export const ModoOscuro = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Cargar preferencia del localStorage al iniciar
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('bg-black'); 
      setIsDarkMode(true);
    }
  }, []);

  // Función para cambiar el modo
  const toggleModoOscuro = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('bg-black'); 
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('bg-black'); 
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <button
      onClick={toggleModoOscuro}
      className="fixed bottom-3  right-1 z-50 px-0 py-2 text-4xl cursor-pointer  text-black dark:text-white transition-all"
    >
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  );
};
