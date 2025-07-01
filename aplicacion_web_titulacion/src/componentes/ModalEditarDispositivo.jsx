import React, { useState } from 'react';

export const ModalEditarDispositivo = ({ dispositivo, onClose, onGuardar }) => {
  const [formulario, setFormulario] = useState({
    nombre: dispositivo.nombre,
    tipo: dispositivo.tipo,
    descripcion: dispositivo.descripcion,
    imagen: dispositivo.imagen || ''
  });

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const guardarCambios = () => {
    onGuardar({ ...dispositivo, ...formulario });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md space-y-5">
        <h2 className="text-2xl font-bold text-sky-600">Editar dispositivo</h2>

        {/* Campo: Nombre */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white">Nombre del dispositivo</label>
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
          <label className="font-semibold text-gray-700 dark:text-white">Tipo</label>
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
          <label className="font-semibold text-gray-700 dark:text-white">Descripción</label>
          <textarea
            name="descripcion"
            className="input-form"
            value={formulario.descripcion}
            onChange={manejarCambio}
          />
        </div>

        {/* Campo: Imagen */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white">URL de imagen</label>
          <input
            type="text"
            name="imagen"
            className="input-form"
            value={formulario.imagen}
            onChange={manejarCambio}
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-black dark:text-white"
          >
            Cancelar
          </button>
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
