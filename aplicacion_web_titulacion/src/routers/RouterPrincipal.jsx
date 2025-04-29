import React from 'react'
import { Routes, Route, NavLink, BrowserRouter } from 'react-router-dom';
import { Inicio } from '../paginas/Inicio';
import { Dashboard } from '../paginas/Dashboard';
import { APIRestinfo } from '../paginas/APIRestinfo';
import { Camara } from '../paginas/Camara';
import { Admin } from '../paginas/Admin';
import { Header } from '../componentes/Header';
import { ModoOscuro } from '../componentes/ModoOscuro';

export const RouterPrincipal = () => {
  return (

    <BrowserRouter>
      {/* Componente del Header */}
      <Header/>

      {/* Componente del Modo Oscuro */}
      <ModoOscuro />

      {/* Implementación de las rutas */}
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/apirestinfo" element={<APIRestinfo />} />
        <Route path="/camara" element={<Camara />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/*" element={<h1>Error 404, la página no existe</h1>} />
      </Routes>
      
    </BrowserRouter >
  )
}
