import React from 'react';

/**
 * ModalAgregarDispositivo
 *
 * Modal para agregar un nuevo dispositivo al sistema.
 *
 * Permite al usuario ingresar los datos del dispositivo a través de un formulario:
 * - Nombre del dispositivo
 * - Tipo de dispositivo
 * - URL de imagen (opcional)
 * - Descripción
 *
 * Incluye dos botones de acción:
 * - Cancelar: cierra el modal sin guardar nada.
 * - Guardar dispositivo: envía los datos para crear el nuevo dispositivo.
 *
 * Props:
 * - nuevoDispositivo: objeto con los valores actuales del formulario.
 * - manejarCambio: función que actualiza los valores del formulario al escribir.
 * - crearDispositivo: función que guarda el dispositivo cuando se hace clic en "Guardar".
 * - onClose: función que cierra el modal.
 *
 * Este componente utiliza TailwindCSS para los estilos y está diseñado para ser mostrado como un modal centrado con fondo desenfocado.
 */


export const ModalAgregarDispositivo = ({
    nuevoDispositivo,
    manejarCambio,
    crearDispositivo,
    onClose
}) => {
    return (
        // Modal: fondo desenfocado y centrado
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">

            {/* Contenedor del modal */}
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-2xl w-full max-w-lg relative border border-sky-200">

                {/* Título del modal */}
                <h2 className="text-xl font-bold text-center mb-4 text-blue-600">
                    Agregar dispositivo
                </h2>

                {/* Formulario con campos para los datos del dispositivo */}
                <div className="grid gap-4">

                    {/* Campo: nombre del dispositivo */}
                    <input
                        type="text"
                        name="nombre"
                        placeholder="Nombre del dispositivo"
                        className="input-form"
                        value={nuevoDispositivo.nombre}
                        onChange={manejarCambio}
                    />

                    {/* Campo: tipo de dispositivo */}
                    <input
                        type="text"
                        name="tipo"
                        placeholder="Tipo de dispositivo"
                        className="input-form"
                        value={nuevoDispositivo.tipo}
                        onChange={manejarCambio}
                    />

                    {/* Campo: URL de imagen */}
                    <input
                        type="text"
                        name="imagen"
                        placeholder="URL de imagen (opcional)"
                        className="input-form"
                        value={nuevoDispositivo.imagen}
                        onChange={manejarCambio}
                    />

                    {/* Campo: descripción del dispositivo */}
                    <textarea
                        name="descripcion"
                        placeholder="Descripción del dispositivo"
                        className="input-form"
                        value={nuevoDispositivo.descripcion}
                        onChange={manejarCambio}
                    />

                    {/* Botones de acción: cancelar o guardar */}
                    <div className="flex justify-end gap-4 mt-2">

                        {/* Botón para cerrar el modal sin guardar */}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg font-semibold transition"
                        >
                            Cancelar
                        </button>

                        {/* Botón para guardar el dispositivo */}
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
