import { useState, useEffect, useRef } from 'react';
import { FaChartBar, FaTextHeight, FaArrowLeft, FaPlus, FaExpand } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { FaShapes } from 'react-icons/fa';

export const ToolBar = ({ onAgregar, zoomPercent, isFullScreen, onToggleFullScreen }) => {
  const navigate = useNavigate();
  const [mostrarTipos, setMostrarTipos] = useState(false);
  const menuRef = useRef(null);
  const [mostrarHerramientas, setMostrarHerramientas] = useState(false);


  const toggleTipos = () => setMostrarTipos(!mostrarTipos);
  const agregarYCerrar = (tipo) => {
    onAgregar(tipo);
    setMostrarTipos(false);
  };

  const [mostrarFormas, setMostrarFormas] = useState(false);
  const menuFormasRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuFormasRef.current && !menuFormasRef.current.contains(event.target)) {
        setMostrarFormas(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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
        <button
          onClick={toggleTipos}
          title="Gráficos"
          className="text-gray-700 hover:bg-gray-200 p-2 rounded"
        >
          <FaChartBar size={18} />
        </button>

        {mostrarTipos && (
          <div className="absolute left-12 top-0 bg-white   rounded-lg shadow-lg p-2 flex flex-col gap-1 w-48 z-50">
            {[
              { tipo: 'grafico-bar', emoji: '📊', nombre: 'Barra' },
              { tipo: 'grafico-line', emoji: '📈', nombre: 'Línea' },
              { tipo: 'grafico-gauge', emoji: '🎯', nombre: 'Medidor Circular' },
              { tipo: 'grafico-area', emoji: '🌄', nombre: 'Área' },
              { tipo: 'grafico-area-stack', emoji: '🌈', nombre: 'Área Apilada' },
              { tipo: 'grafico-linea-multiple', emoji: '📶', nombre: 'Múltiples Líneas' },
              { tipo: 'gauge-stage', emoji: '🧭', nombre: 'Etapas' },
              { tipo: 'gauge-grade', emoji: '🎓', nombre: 'Calificación' },
              {
                tipo: 'tabla-ml-tiempo-real',
                icono: <span className="text-lg">📊</span>,
                nombre: 'Tabla ML Tiempo Real'
              }

            ].map(({ tipo, emoji, nombre }) => (
              <button
                key={tipo}
                onClick={() => agregarYCerrar(tipo)}
                className="flex items-center gap-2 text-sm hover:bg-gray-100  px-3 py-2 rounded text-left text-gray-800 "
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

      <button onClick={() => onAgregar('texto')} title="Texto">
        <FaTextHeight />
      </button>

      {/* Botón para agregar formas */}
      <div className="relative" ref={menuFormasRef}>
        <button
          onClick={() => setMostrarFormas(!mostrarFormas)}
          title="Formas"
          className="text-gray-700 hover:bg-gray-200 p-2 rounded"
        >
          <FaShapes size={18} />
        </button>

        {mostrarFormas && (
          <div className="absolute left-12 top-0 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1 w-48 z-50">
            {[
              { tipo: 'forma-rectangulo', emoji: '⬛', nombre: 'Rectángulo' },
              { tipo: 'forma-circulo', emoji: '⚪', nombre: 'Círculo' },
              { tipo: 'forma-triangulo', emoji: '🔺', nombre: 'Triángulo' },
              { tipo: 'forma-linea', emoji: '➖', nombre: 'Línea' },
              { tipo: 'forma-flecha', emoji: '➡️', nombre: 'Flecha' },
              { tipo: 'forma-flecha-doble', emoji: '↔️', nombre: 'Flecha Doble' },

            ].map(({ tipo, emoji, nombre }) => (
              <button
                key={tipo}
                onClick={() => {
                  onAgregar(tipo);
                  setMostrarFormas(false);
                }}
                className="flex items-center gap-2 text-sm hover:bg-gray-100  px-3 py-2 rounded text-left text-gray-800 "
              >
                <span className="text-base">{emoji}</span>
                <span>{nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Nueva sección: Herramientas */}
      <div className="relative">
        <button
          onClick={() => setMostrarHerramientas(prev => !prev)}
          title="Herramientas"
          className="text-gray-700 hover:bg-gray-200 p-2 rounded"
        >
          🛠️
        </button>

        {mostrarHerramientas && (
          <div className="absolute left-12 top-0 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1 w-48 z-50">
            <button
              onClick={() => {
                onAgregar('herramienta-ml');
                setMostrarHerramientas(false);
              }}
              className="flex items-center gap-2 text-sm hover:bg-gray-100 px-3 py-2 rounded text-left text-gray-800"
            >
              <span className="text-base">🔮</span>
              <span>Predecir</span>
            </button>
          </div>

        )}
      </div>

      <div className="flex-grow" />

      <button
        onClick={onToggleFullScreen}
        title="Presentar"
        className="text-blue-600 hover:bg-blue-100 p-2 rounded"
      >
        <FaExpand size={16} />
      </button>

      <button
        onClick={() => navigate('/dashboard')}
        title="Volver"
        className="text-gray-400 hover:text-black p-2"
      >
        <FaArrowLeft size={16} />
      </button>

    </div>
  );
};
