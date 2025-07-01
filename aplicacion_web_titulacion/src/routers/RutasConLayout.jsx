// RutasConLayout.jsx
import { Routes, Route, useLocation } from 'react-router-dom';
import { Inicio } from '../paginas/Inicio';
import { Dashboard } from '../paginas/Dashboard';
import { APIRestinfo } from '../paginas/APIRestinfo';
import { Camara } from '../paginas/Camara';
import { Admin } from '../paginas/Admin';
import { Header } from '../componentes/Header';
import { ModoOscuro } from '../componentes/ModoOscuro';
import { Footer } from '../componentes/Footer';
import { APIKeysPage } from '../paginas/APIKeyspage';
import { useEffect, useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { Dispositivos } from '../paginas/Dispositivos';
import { VistaTablero } from '../paginas/VistaTablero';
import { verificarRolBackend } from '../utils/verificarRolBackend';
import { auth } from '../firebase';

export const RutasConLayout = () => {
  const { user, setUser } = useContext(UserContext);
  const location = useLocation();
  const ocultarModoOscuro = location.pathname.startsWith('/tablero/');
  const esVistaTablero = location.pathname.startsWith('/tablero/');
  // Determina si estamos en una vista de tablero sin header y footer
  const esVistaSinHeaderFooter = (
    (location.pathname === "/dashboard" || location.pathname.startsWith("/tablero/"))
    && user
  );

  /* useEffect para validar el Rol en cada cambio de página */
  useEffect(() => {

    const validarRol = async () => {
      // Verifica si el usuario está autenticado
      if (user && auth.currentUser) {
        // Llama a la función para verificar el rol en el backend
        const rolSeguro = await verificarRolBackend();
        // Si el rol ha cambiado, actualiza el estado del usuario
        if (rolSeguro !== null && rolSeguro !== user.rol) {
          console.log("Rol actualizado desde backend:", rolSeguro);
          // Actualiza el rol del usuario en el contexto
          setUser((prev) => ({ ...prev, rol: rolSeguro }));
        }
      }
    };

    validarRol();
  }, [location.pathname]);

  useEffect(() => {
    const ruta = location.pathname;

    let titulo = "DeepSunly";

    if (ruta === "/" || ruta === "/inicio") titulo = "DeepSunly: Inicio";
    else if (ruta === "/dashboard") titulo = "DeepSunly: Dashboard";
    else if (ruta === "/apirestinfo") titulo = "DeepSunly: API REST";
    else if (ruta === "/camara") titulo = "DeepSunly: Cámara";
    else if (ruta === "/mis-apikeys") titulo = "DeepSunly: API Keys";
    else if (ruta === "/dispositivos") titulo = "DeepSunly: Dispositivos";
    else if (ruta === "/admin") titulo = "DeepSunly: Administración";
    else if (ruta.startsWith("/tablero/")) titulo = "DeepSunly: Tablero";

    document.title = titulo;
  }, [location.pathname]);


  return (
    <div className='flex flex-col min-h-screen'>
      {/* Condición para mostrar el Header según la página */}
      {!esVistaSinHeaderFooter && <Header />}

      {/* Modo Oscuro solo si no estamos en una vista de tablero */}
      {!ocultarModoOscuro && <ModoOscuro />}

      {/* Rutas específicas para VistaTablero */}
      {esVistaTablero ? (
        <Routes>
          <Route path="/tablero/:idTablero" element={<VistaTablero />} />
        </Routes>
      ) : (
        /* Rutas */
        <main className='flex-grow mt-4 rounded-2xl transition-all ml-14 mr-14'>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/apirestinfo" element={<APIRestinfo />} />
            <Route path="/camara" element={<Camara />} />
            <Route path="/mis-apikeys" element={<APIKeysPage />} />
            <Route path="/dispositivos" element={<Dispositivos />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/*" element={<h1>Error 404, la página no existe</h1>} />
          </Routes>
        </main>
      )}

      {/* Footer solo si no estamos en una vista de tablero o dashboard */}
      {!esVistaSinHeaderFooter && <Footer />}
    </div>
  );
};