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
import { useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { Dispositivos } from '../paginas/Dispositivos';

export const RutasConLayout = () => {
  const { user } = useContext(UserContext);
  const location = useLocation();

  const esDashboardAutenticado = location.pathname === "/dashboard" && user;

  return (
    <div className='flex flex-col min-h-screen'>
      {!esDashboardAutenticado && <Header />}
      <ModoOscuro />

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

      {!esDashboardAutenticado && <Footer />}
    </div>
  );
};
