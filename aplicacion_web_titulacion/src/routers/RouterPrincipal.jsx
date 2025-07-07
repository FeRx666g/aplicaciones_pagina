// RouterPrincipal.jsx
import { BrowserRouter } from 'react-router-dom';
import { RutasConLayout } from './RutasConLayout';

/**
 * RouterPrincipal.jsx
 *
 * Define el enrutador principal de la aplicación.
 *
 * - Envuelve toda la app con `BrowserRouter` para habilitar navegación SPA (Single Page Application) con React Router.
 * - Renderiza el componente `RutasConLayout`, que contiene las rutas definidas junto con su layout común.
 *
 * Este componente es el punto central para configurar las rutas y la navegación de la aplicación.
 */

// Componente principal que define el enrutamiento de la aplicación
export const RouterPrincipal = () => {
  return (
    // Habilita las rutas y la navegación con historial de navegador
    <BrowserRouter>
      {/* Renderiza las rutas con el layout común de la app */}
      <RutasConLayout />
    </BrowserRouter>
  );
};
