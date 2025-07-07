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
import { APIKeysPage } from '../paginas/APIKeysPage';
import { useEffect, useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { Dispositivos } from '../paginas/Dispositivos';
import { VistaTablero } from '../paginas/VistaTablero';
import { verificarRolBackend } from '../utils/verificarRolBackend';
import { auth } from '../firebase';

/**
 * RutasConLayout.jsx
 *
 * Este componente define la estructura de enrutamiento principal de la aplicación,
 * junto con el layout común (Header, Footer, Modo Oscuro).
 *
 * Características:
 * - Usa `react-router-dom` para gestionar las rutas.
 * - Cambia dinámicamente el título del documento según la ruta actual.
 * - Verifica el rol del usuario en cada cambio de ruta mediante el backend y actualiza el contexto si es necesario.
 * - Condiciona la visualización del `Header`, `Footer` y `ModoOscuro` en páginas específicas (como VistaTablero y Dashboard).
 *
 * Rutas manejadas:
 * - `/inicio` o `/` → Página de inicio.
 * - `/dashboard` → Panel principal con tableros.
 * - `/apirestinfo` → Información de la API REST.
 * - `/camara` → Vista en vivo de la cámara.
 * - `/mis-apikeys` → Gestión de API Keys.
 * - `/dispositivos` → Gestión de dispositivos.
 * - `/admin` → Administración.
 * - `/tablero/:idTablero` → Vista de un tablero específico (con layout especial).
 * - Cualquier otra → Error 404.
 *
 * También se asegura de ocultar o mostrar partes del layout según la página.
 * Usa el contexto `UserContext` para obtener y actualizar información del usuario autenticado.
 */

export const RutasConLayout = () => {
  const { user, setUser } = useContext(UserContext); // Obtiene el usuario y la función para actualizarlo desde el contexto
  const location = useLocation(); // Obtiene la ubicación actual de la ruta
  const ocultarModoOscuro = location.pathname.startsWith('/tablero/'); // Si estamos en un tablero, ocultar el modo oscuro
  const esVistaTablero = location.pathname.startsWith('/tablero/'); // Indica si la vista actual es un tablero

  // Determina si estamos en una vista (dashboard o tablero) donde no se muestran Header ni Footer
  const esVistaSinHeaderFooter = (
    (location.pathname === "/dashboard" || location.pathname.startsWith("/tablero/"))
    && user
  );

  /* useEffect para validar el rol del usuario cada vez que cambia la ruta */
  useEffect(() => {

    const validarRol = async () => {
      // Verifica que el usuario esté autenticado
      if (user && auth.currentUser) {
        // Llama a la función que consulta el rol en el backend
        const rolSeguro = await verificarRolBackend();
        // Si el rol obtenido es distinto al que se tiene en contexto, actualiza
        if (rolSeguro !== null && rolSeguro !== user.rol) {
          console.log("Rol actualizado desde backend:", rolSeguro);
          setUser((prev) => ({ ...prev, rol: rolSeguro })); // Actualiza el rol en el contexto
        }
      }
    };

    validarRol(); // Ejecuta la validación
  }, [location.pathname]); // Se ejecuta cuando cambia la ruta

  /* useEffect para actualizar el título del documento según la página */
  useEffect(() => {
    const ruta = location.pathname; // Ruta actual

    let titulo = "DeepSunly"; // Título por defecto

    // Define el título según la ruta actual
    if (ruta === "/" || ruta === "/inicio") titulo = "DeepSunly: Inicio";
    else if (ruta === "/dashboard") titulo = "DeepSunly: Dashboard";
    else if (ruta === "/apirestinfo") titulo = "DeepSunly: API REST";
    else if (ruta === "/camara") titulo = "DeepSunly: Cámara";
    else if (ruta === "/mis-apikeys") titulo = "DeepSunly: API Keys";
    else if (ruta === "/dispositivos") titulo = "DeepSunly: Dispositivos";
    else if (ruta === "/admin") titulo = "DeepSunly: Administración";
    else if (ruta.startsWith("/tablero/")) titulo = "DeepSunly: Tablero";

    document.title = titulo; // Actualiza el título del documento
  }, [location.pathname]); // Se ejecuta al cambiar la ruta

  return (
    <div className='flex flex-col min-h-screen'>
      {/* Si no es vista tablero/dashboard, muestra el Header */}
      {!esVistaSinHeaderFooter && <Header />}

      {/* Si no estamos en un tablero, muestra el ModoOscuro */}
      {!ocultarModoOscuro && <ModoOscuro />}

      {/* Si es un tablero, renderiza sólo las rutas de VistaTablero */}
      {esVistaTablero ? (
        <Routes>
          <Route path="/tablero/:idTablero" element={<VistaTablero />} />
        </Routes>
      ) : (
        /* Si no es tablero, renderiza las demás rutas normales */
        <main className='flex-grow mt-4 rounded-2xl transition-all ml-14 mr-14'>
          <Routes>
            <Route path="/" element={<Inicio />} /> {/* Ruta inicio */}
            <Route path="/inicio" element={<Inicio />} /> {/* Ruta alternativa de inicio */}
            <Route path="/dashboard" element={<Dashboard />} /> {/* Dashboard */}
            <Route path="/apirestinfo" element={<APIRestinfo />} /> {/* Info API */}
            <Route path="/camara" element={<Camara />} /> {/* Cámara */}
            <Route path="/mis-apikeys" element={<APIKeysPage />} /> {/* API Keys */}
            <Route path="/dispositivos" element={<Dispositivos />} /> {/* Dispositivos */}
            <Route path="/admin" element={<Admin />} /> {/* Administración */}
            <Route path="/*" element={<h1>Error 404, la página no existe</h1>} /> {/* Página no encontrada */}
          </Routes>
        </main>
      )}

      {/* Si no es vista tablero/dashboard, muestra el Footer */}
      {!esVistaSinHeaderFooter && <Footer />}
    </div>
  );
};
