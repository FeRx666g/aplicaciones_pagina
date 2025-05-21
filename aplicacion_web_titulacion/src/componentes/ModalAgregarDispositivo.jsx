// componentes/ModalAgregarDispositivo.jsx
import React from 'react';

export const ModalAgregarDispositivo = ({
    nuevoDispositivo,
    manejarCambio,
    crearDispositivo,
    onClose
}) => {
    return (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg relative border border-sky-200">
                <h2 className="text-xl font-bold text-center mb-4 text-blue-600">Agregar dispositivo</h2>

                <div className="grid gap-4">
                    <input
                        type="text"
                        name="nombre"
                        placeholder="Nombre del dispositivo"
                        className="input-form"
                        value={nuevoDispositivo.nombre}
                        onChange={manejarCambio}
                    />
                    <input
                        type="text"
                        name="tipo"
                        placeholder="Tipo de dispositivo"
                        className="input-form"
                        value={nuevoDispositivo.tipo}
                        onChange={manejarCambio}
                    />
                    <input
                        type="text"
                        name="imagen"
                        placeholder="URL de imagen (opcional)"
                        className="input-form"
                        value={nuevoDispositivo.imagen}
                        onChange={manejarCambio}
                    />
                    <textarea
                        name="descripcion"
                        placeholder="Descripción del dispositivo"
                        className="input-form"
                        value={nuevoDispositivo.descripcion}
                        onChange={manejarCambio}
                    />

                    <div className="flex justify-end gap-4 mt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg font-semibold transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={crearDispositivo}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                        >
                            Guardar dispositivo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
