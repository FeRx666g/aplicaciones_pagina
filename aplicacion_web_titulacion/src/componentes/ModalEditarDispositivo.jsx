import React, { useState } from 'react';

/**
 * ModalEditarDispositivo
 *
 * Modal para editar la información de un dispositivo existente.
 *
 * Muestra un formulario con los datos actuales del dispositivo y permite al usuario
 * modificarlos antes de guardarlos. Incluye los siguientes campos:
 * - Nombre del dispositivo
 * - Tipo
 * - Descripción
 * - URL de imagen (opcional)
 *
 * Incluye dos botones de acción:
 * - Cancelar: cierra el modal sin guardar cambios.
 * - Guardar: aplica los cambios al dispositivo y cierra el modal.
 *
 * Props:
 * - dispositivo: objeto con los datos actuales del dispositivo a editar.
 * - onClose: función para cerrar el modal.
 * - onGuardar: función que recibe los datos actualizados para guardarlos.
 *
 * Este componente usa `useState` para mantener los valores del formulario localmente.
 * Los estilos están construidos con TailwindCSS y el modal se presenta centrado
 * con fondo oscuro semitransparente.
 */

// Componente modal para editar los datos de un dispositivo existente
export const ModalEditarDispositivo = ({ dispositivo, onClose, onGuardar }) => {
  
  // Estado local para almacenar los valores del formulario
  const [formulario, setFormulario] = useState({
    nombre: dispositivo.nombre,
    tipo: dispositivo.tipo,
    descripcion: dispositivo.descripcion,
    imagen: dispositivo.imagen || ''
  });

  // Maneja el cambio en los inputs, actualiza el estado del formulario
  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  // Guarda los cambios, llama a la función de guardado y cierra el modal
  const guardarCambios = () => {
    onGuardar({ ...dispositivo, ...formulario });
    onClose();
  };

  return (
    // Contenedor principal del modal: cubre toda la pantalla con fondo oscuro
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      
      {/* Caja del modal con fondo claro/oscuro y bordes redondeados */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md space-y-5">
        
        {/* Título del modal */}
        <h2 className="text-2xl font-bold text-sky-600">Editar dispositivo</h2>

        {/* Campo: Nombre */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white">
            Nombre del dispositivo
          </label>
          <input
            type="text"
            name="nombre"
            className="input-form"
            value={formulario.nombre}
            onChange={manejarCambio}
          />
        </div>

        {/* Campo: Tipo */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white">
            Tipo
          </label>
          <input
            type="text"
            name="tipo"
            className="input-form"
            value={formulario.tipo}
            onChange={manejarCambio}
          />
        </div>

        {/* Campo: Descripción */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white">
            Descripción
          </label>
          <textarea
            name="descripcion"
            className="input-form"
            value={formulario.descripcion}
            onChange={manejarCambio}
          />
        </div>

        {/* Campo: URL de imagen */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white">
            URL de imagen
          </label>
          <input
            type="text"
            name="imagen"
            className="input-form"
            value={formulario.imagen}
            onChange={manejarCambio}
          />
        </div>

        {/* Botones de acción: Cancelar y Guardar */}
        <div className="flex justify-end gap-3 pt-2">
          
          {/* Botón para cancelar: cierra el modal */}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-black dark:text-white"
          >
            Cancelar
          </button>

          {/* Botón para guardar los cambios */}
          <button
            onClick={guardarCambios}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
