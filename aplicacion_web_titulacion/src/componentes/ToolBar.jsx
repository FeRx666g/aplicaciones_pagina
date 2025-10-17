import { useState, useEffect, useRef } from 'react';
import { FaChartBar, FaTextHeight, FaArrowLeft, FaPlus, FaExpand } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { FaShapes } from 'react-icons/fa';
import Swal from 'sweetalert2';

/**
 * ToolBar
 *
 * Componente que renderiza la barra de herramientas lateral para el tablero.
 *
 * Muestra:
 * - Botones para agregar elementos al tablero como: gráficos, texto, formas y herramientas especiales.
 * - Menús desplegables para seleccionar el tipo específico de gráfico o forma a agregar.
 * - Botón para alternar pantalla completa.
 * - Botón para regresar al dashboard.
 *
 * Comportamiento:
 * - Los menús de gráficos, formas y herramientas se cierran automáticamente al hacer clic fuera.
 * - Cada opción invoca la función `onAgregar` pasando el tipo de elemento seleccionado.
 *
 * Usa:
 * - React Router `useNavigate` para la navegación de regreso al dashboard.
 * - React hooks (`useState`, `useEffect`, `useRef`) para manejar el estado de los menús y detectar clics fuera.
 * - Iconos de react-icons para representar cada botón y opción visualmente.
 *
 * Estilizado con TailwindCSS.
 */


export const ToolBar = ({ onAgregar, zoomPercent, isFullScreen, onToggleFullScreen, todasLasDiapositivas }) => {
  // Hook de react-router-dom para navegar programáticamente
  const navigate = useNavigate();

  // Estado para mostrar/ocultar el menú de tipos de gráficos
  const [mostrarTipos, setMostrarTipos] = useState(false);

  // Referencia al elemento del menú de tipos de gráficos, para detectar clics fuera
  const menuRef = useRef(null);

  // Estado para mostrar/ocultar el menú de herramientas
  const [mostrarHerramientas, setMostrarHerramientas] = useState(false);

  // Función para alternar la visibilidad del menú de gráficos
  const toggleTipos = () => setMostrarTipos(!mostrarTipos);

  // Función para agregar un elemento y cerrar el menú de gráficos
  const agregarYCerrar = (tipo) => {
    onAgregar(tipo);
    setMostrarTipos(false);
  };

  // Estado para mostrar/ocultar el menú de formas
  const [mostrarFormas, setMostrarFormas] = useState(false);

  // Referencia al menú de formas, para detectar clics fuera
  const menuFormasRef = useRef(null);

  // Efecto para cerrar el menú de formas si el usuario hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuFormasRef.current && !menuFormasRef.current.contains(event.target)) {
        setMostrarFormas(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Efecto para cerrar el menú de gráficos si el usuario hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMostrarTipos(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed left-2 top-20 h-85 w-14 bg-white flex flex-col items-center py-5 rounded-2xl gap-3 shadow z-50">

      {/* Botón de selección de tipo de gráfico */}
      <div className="relative" ref={menuRef}>
        {/* Botón que abre o cierra el menú de tipos de gráficos */}
        <button
          onClick={toggleTipos}
          title="Gráficos"
          className="text-gray-700 hover:bg-gray-200 p-2 rounded cursor-pointer"
        >
          {/* Icono de gráfico de barras */}
          <FaChartBar size={18} />
        </button>

        {/* Menú desplegable que se muestra si mostrarTipos es true */}
        {mostrarTipos && (
          <div className="absolute left-12 top-0 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1 w-48 z-50">
            {/* Lista de botones para cada tipo de gráfico */}
            {[/* 
              { tipo: 'grafico-bar', emoji: '📊', nombre: 'Barra' }, */
              { tipo: 'grafico-line', emoji: '📈', nombre: 'Línea' },
              /* { tipo: 'grafico-gauge', emoji: '🎯', nombre: 'Medidor Circular' },
              { tipo: 'grafico-area', emoji: '🌄', nombre: 'Área' },
              { tipo: 'grafico-area-stack', emoji: '🌈', nombre: 'Área Apilada' },
              { tipo: 'grafico-linea-multiple', emoji: '📶', nombre: 'Múltiples Líneas' },
              { tipo: 'gauge-stage', emoji: '🧭', nombre: 'Etapas' },
              { tipo: 'gauge-grade', emoji: '🎓', nombre: 'Calificación' }, */
            ].map(({ tipo, emoji, nombre }) => (
              // Botón para agregar un tipo de gráfico y cerrar el menú
              <button
                key={tipo}
                onClick={() => agregarYCerrar(tipo)}
                className="flex items-center gap-2 text-sm hover:bg-gray-100 px-3 py-2 rounded text-left text-gray-800 cursor-pointer"
              >
                <span className="text-base">{emoji}</span>
                <span>{nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Botón para agregar texto */}
      {/* <button
        onClick={() => onAgregar('texto')}
        title="Texto"
        className="text-gray-700 hover:bg-gray-200 p-2 rounded"
      >
        <FaTextHeight size={16} />
      </button> */}

      {/* Botón para agregar un componente de texto */}
      <button onClick={() => onAgregar('texto')} className='cursor-pointer' title="Texto">
        {/* Icono de texto */}
        <FaTextHeight />
      </button>

      {/* Botón y menú para agregar formas */}
      <div className="relative" ref={menuFormasRef}>
        {/* Botón que abre/cierra el menú de formas */}
        <button
          onClick={() => setMostrarFormas(!mostrarFormas)}
          title="Formas"
          className="text-gray-700 hover:bg-gray-200 p-2 rounded cursor-pointer"
        >
          <FaShapes size={18} />
        </button>

        {/* Menú desplegable con las distintas formas disponibles */}
        {mostrarFormas && (
          <div className="absolute left-12 top-0  bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1 w-48 z-50 ">
            {[
              { tipo: 'forma-rectangulo', emoji: '⬛', nombre: 'Rectángulo' },
              { tipo: 'forma-circulo', emoji: '⚪', nombre: 'Círculo' },
              { tipo: 'forma-triangulo', emoji: '🔺', nombre: 'Triángulo' },
              { tipo: 'forma-linea', emoji: '➖', nombre: 'Línea' },
              { tipo: 'forma-flecha', emoji: '➡️', nombre: 'Flecha' },
              { tipo: 'forma-flecha-doble', emoji: '↔️', nombre: 'Flecha Doble' },
            ].map(({ tipo, emoji, nombre }) => (
              // Botón para seleccionar una forma y cerrar el menú
              <button
                key={tipo}
                onClick={() => {
                  onAgregar(tipo);
                  setMostrarFormas(false);
                }}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 px-3 py-2 rounded text-left text-gray-800"
              >
                <span className="text-base">{emoji}</span>
                <span>{nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botón y menú para herramientas */}
      <div className="relative">
        {/* Botón que abre/cierra el menú de herramientas */}
        <button
          onClick={() => setMostrarHerramientas(prev => !prev)}
          title="Herramientas"
          className="text-gray-700 hover:bg-gray-200 p-2 rounded cursor-pointer"
        >
          🛠️
        </button>

        {/* Menú desplegable con las herramientas */}
        {mostrarHerramientas && (
          <div className="absolute left-12 top-0 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1 w-48 z-50">
            {/* Herramienta: Predecir */}
            <button
              onClick={() => {
                onAgregar('herramienta-ml');
                setMostrarHerramientas(false);
              }}
              className="flex items-center gap-2 text-sm hover:bg-gray-100 px-3 py-2 rounded text-left text-gray-800"
            >
              <span className="text-base cursor-pointer">🔮</span>
              <span className='cursor-pointer'>Predecir</span>
            </button>

            {/* Herramienta: Tabla ML Tiempo Real */}
            <button
              onClick={() => {
                const yaHayTabla = todasLasDiapositivas.some(diapositiva =>
                  diapositiva.componentes.some(c => c.tipo === 'tabla-ml-tiempo-real')
                );

                if (yaHayTabla) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'Ya existe',
                    text: 'Solo puedes tener una tabla ML Tiempo Real en cualquier diapositiva.'
                  });
                  return;
                }

                onAgregar('tabla-ml-tiempo-real');
                setMostrarHerramientas(false);
              }}
              className="flex items-center gap-2 text-sm hover:bg-gray-100 px-3 py-2 rounded text-left text-gray-800"
            >
              <span className="text-lg cursor-pointer">📊</span>
              <span className='cursor-pointer'>Tabla ML Tiempo Real</span>
            </button>
          </div>


        )}
      </div>

      {/* Espaciador flexible para empujar los botones inferiores hacia abajo */}
      <div className="flex-grow" />

      {/* Botón para alternar pantalla completa */}
      <button
        onClick={onToggleFullScreen}
        title="Presentar"
        className="text-blue-600 hover:bg-blue-100 p-2 rounded cursor-pointer"
      >
        <FaExpand size={16} />
      </button>

      {/* Botón para volver al dashboard */}
      <button
        onClick={() => navigate('/dashboard')}
        title="Volver"
        className="text-gray-400 hover:text-black p-2 cursor-pointer"
      >
        <FaArrowLeft size={16} />
      </button>

    </div>
  );
};
