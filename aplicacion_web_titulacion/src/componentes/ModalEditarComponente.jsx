import { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { UserContext } from '../providers/UserProvider';
import Swal from 'sweetalert2';

/**
 * ModalEditarComponente
 *
 * Este componente renderiza un modal para editar la configuración de un componente del dashboard.
 * Soporta distintos tipos de componente como: gráficos, texto, formas, tabla-ml-tiempo-real, herramienta-ml, etc.
 *
 * Permite editar propiedades específicas de cada tipo, como: título, colores, dispositivos y campos, ejes, textos, sombra, etc.
 *
 * Props:
 * - componente: Objeto que representa el componente a editar, con su tipo y configuración actual.
 * - onClose: Función callback para cerrar el modal.
 * - onGuardar: Función callback para guardar los cambios con la configuración actualizada.
 *
 * Usa Firestore para cargar dispositivos y sus campos asociados.
 */

export const ModalEditarComponente = ({ componente, onClose, onGuardar }) => {
  const { user } = useContext(UserContext);

  // Estados principales del formulario
  const [titulo, setTitulo] = useState('');
  const [idDispositivo, setIdDispositivo] = useState('');
  const [campo, setCampo] = useState('');
  const [minY, setMinY] = useState('');
  const [maxY, setMaxY] = useState('');
  const [color, setColor] = useState('#5470C6');
  const [dispositivos, setDispositivos] = useState([]);
  const [camposPorDispositivo, setCamposPorDispositivo] = useState({});
  const [fuentes, setFuentes] = useState([]);
  const [descripcionX, setDescripcionX] = useState('');
  const [descripcionY, setDescripcionY] = useState('');
  const [cantidadMaxima, setCantidadMaxima] = useState(20);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const esMultiple = ['grafico-area-stack', 'grafico-linea-multiple'].includes(componente?.tipo);
  const esForma = componente?.tipo?.startsWith('forma');

  // Configuración para el tipo texto
  const [configTexto, setConfigTexto] = useState({
    contenido: '',
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Arial',
    negrita: false,
    cursiva: false,
    subrayado: false,
    alineacion: 'left'
  });
  const [config, setConfig] = useState({})

  // Configuración local 
  const [configLocal, setConfigLocal] = useState({
    ...(componente.config || {}),
    columnas: componente.config?.columnas || []
  });
  const [costoKWh, setCostoKWh] = useState(
    componente?.config?.costoKWh ?? 0.10
  );
  const todasLasClavesModelo = ['temperatura', 'humedad', 'irradiancia', 'lux', 'nubosidad'];

  // Inicializar valores cuando cambia el componente
  useEffect(() => {
    if (componente?.config?.titulo) setTitulo(componente.config.titulo);
    if (componente?.config?.id_dispositivo) setIdDispositivo(componente.config.id_dispositivo);
    if (componente?.config?.campo) setCampo(componente.config.campo);
    if (componente?.config?.minY !== undefined) setMinY(componente.config.minY);
    if (componente?.config?.maxY !== undefined) setMaxY(componente.config.maxY);
    if (componente?.config?.color) setColor(componente.config.color);
    if (componente?.config?.fuentes) setFuentes(componente.config.fuentes);
    if (componente?.config?.descripcionX) setDescripcionX(componente.config.descripcionX);
    if (componente?.config?.descripcionY) setDescripcionY(componente.config.descripcionY);
    if (componente?.config?.cantidadMaxima) setCantidadMaxima(componente.config.cantidadMaxima);
    if (componente?.config?.fechaInicio) setFechaInicio(componente.config.fechaInicio);
    if (componente?.config?.fechaFin) setFechaFin(componente.config.fechaFin);
    if (componente?.tipo === 'texto') {
      setConfigTexto({
        ...configTexto,
        ...componente.config
      });
    }
    if (componente?.tipo?.startsWith('forma')) {
      setConfig({
        colorRelleno: componente.config?.colorRelleno || '#D1D5DB',
        colorBorde: componente.config?.colorBorde || '#111827',
        grosorBorde: componente.config?.grosorBorde || 2,
        rotacion: componente.config?.rotacion ?? 0,
      });
    }
    setConfigLocal(prev => ({
      ...prev,
      sinSombra: componente?.config?.sinSombra ?? false
    }));
  }, [componente]);

  // Bloquear flechas del teclado cuando hay un input activo
  useEffect(() => {
    const bloquearFlechas = (e) => {
      const esFlecha = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
      const esInputActivo = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

      if (esFlecha && esInputActivo) {
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', bloquearFlechas, true);

    return () => {
      window.removeEventListener('keydown', bloquearFlechas, true);
    };
  }, []);

  // Cargar campos por columnas si es tabla-ml-tiempo-real
  useEffect(() => {
    const cargarCamposPorColumnas = async () => {
      const nuevo = { ...camposPorDispositivo };
      for (const col of configLocal.columnas || []) {
        const id = col.id_dispositivo;
        if (id && !nuevo[id]) {
          try {
            const q = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const datos = snapshot.docs[0].data().datos;
              nuevo[id] = Object.keys(datos || {});
            } else {
              nuevo[id] = [];
            }
          } catch {
            nuevo[id] = [];
          }
        }
      }
      setCamposPorDispositivo(nuevo);
    };

    if (componente?.tipo === 'tabla-ml-tiempo-real') {
      cargarCamposPorColumnas();
    }
  }, [configLocal.columnas]);


  // Cargar campos del dispositivo seleccionado
  useEffect(() => {
    const cargarCamposDeDispositivo = async () => {
      if (!idDispositivo || camposPorDispositivo[idDispositivo]) return;

      try {
        const q = query(
          collection(db, 'mediciones'),
          where('id_dispositivo', '==', idDispositivo),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const datos = snapshot.docs[0].data().datos;
          setCamposPorDispositivo(prev => ({
            ...prev,
            [idDispositivo]: Object.keys(datos || {})
          }));
        }
      } catch {
        setCamposPorDispositivo(prev => ({
          ...prev,
          [idDispositivo]: []
        }));
      }
    };

    if (!esMultiple) cargarCamposDeDispositivo();
  }, [idDispositivo]);


  // Cargar dispositivos del usuario
  useEffect(() => {
    const cargarDispositivos = async () => {
      const ref = collection(db, 'usuarios', user.uid, 'dispositivos');
      const snapshot = await getDocs(ref);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDispositivos(lista);
    };
    if (user) cargarDispositivos();
  }, [user]);

  // Cargar campos para las fuentes si es modo múltiple
  useEffect(() => {
    const obtenerCamposPorFuente = async () => {
      const nuevo = { ...camposPorDispositivo };
      for (const fuente of fuentes) {
        if (fuente.id_dispositivo && !nuevo[fuente.id_dispositivo]) {
          try {
            const q = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', fuente.id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const datos = snapshot.docs[0].data().datos;
              nuevo[fuente.id_dispositivo] = Object.keys(datos || {});
            } else {
              nuevo[fuente.id_dispositivo] = [];
            }
          } catch {
            nuevo[fuente.id_dispositivo] = [];
          }
        }
      }
      setCamposPorDispositivo(nuevo);
    };
    if (esMultiple) obtenerCamposPorFuente();
  }, [fuentes]);

  // Validar campos antes de guardar
  const guardarCambios = () => {
    // Validar que la cantidad máxima esté dentro del rango permitido
    if (!cantidadMaxima || cantidadMaxima < 1 || cantidadMaxima > 5000) {
      Swal.fire({
        icon: 'warning',
        title: 'Cantidad inválida',
        text: 'La cantidad de datos debe estar entre 1 y 5000.',
      });
      return;
    }


    // Caso específico: guardar configuración para componente de tipo 'herramienta-ml'
    if (componente?.tipo === 'herramienta-ml') {
      onGuardar({
        ...componente.config,
        titulo,
        sinSombra: configLocal.sinSombra ?? false,
        costoKWh,
        ancho: configLocal.ancho ?? 137,
        alto: configLocal.alto ?? 85,
        eficiencia: configLocal.eficiencia ?? 15,
      });
      return;
    }

    // Caso específico: guardar configuración para componente de tipo 'texto'
    if (componente?.tipo === 'texto') {
      onGuardar({
        ...configTexto,
        sinSombra: configLocal.sinSombra || false
      });
      return;
    }

    // Caso específico: guardar configuración para componente de tipo 'tabla-ml-tiempo-real'
    if (componente?.tipo === 'tabla-ml-tiempo-real') {
      onGuardar({
        ...componente.config,
        titulo,
        columnas: configLocal.columnas || [],
        modoTiempoReal: true,
        sinSombra: configLocal.sinSombra ?? false,
        costoKWh,
        ancho: configLocal.ancho ?? 137,
        alto: configLocal.alto ?? 85,
        eficiencia: configLocal.eficiencia ?? 15,
        prediccion: {
          endpoint: "https://ml-backend-519521736458.us-central1.run.app/predecir"
        }
      });
      return;
    }

    // Caso específico: guardar configuración para componentes que empiezan con 'forma'
    if (componente?.tipo?.startsWith('forma')) {
      onGuardar({
        ...componente.config,
        ...config,
        sinSombra: configLocal.sinSombra || false,
      });
      return;
    }

    // Validar que todas las fuentes estén completas en componentes múltiples
    if (esMultiple && Array.isArray(fuentes)) {
      const fuentesValidas = fuentes.filter(f => f.id_dispositivo?.trim() && f.campo?.trim());
      if (fuentesValidas.length !== fuentes.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos incompletos',
          text: 'Por favor completa todos los campos de las fuentes antes de guardar.',
          confirmButtonColor: '#3085d6'
        });
        return; // detener si no están completas
      }
    }

    // Caso general: guardar configuración para los demás tipos de componentes
    onGuardar({
      ...componente.config,
      titulo,
      sinSombra: configLocal.sinSombra || false,
      minY: minY !== '' ? parseFloat(minY) : undefined,
      maxY: maxY !== '' ? parseFloat(maxY) : undefined,
      color,
      descripcionX,
      descripcionY,
      cantidadMaxima: cantidadMaxima || 20,
      fechaInicio,
      fechaFin,

      // Dependiendo si es múltiple o no, agrega las propiedades correspondientes
      ...(esMultiple
        ? {
          fuentes,
          series: componente.config?.series || {},
          etiquetas: componente.config?.etiquetas || []
        }
        : {
          id_dispositivo: idDispositivo,
          campo,
          valores: componente.config?.valores || [],
          etiquetas: componente.config?.etiquetas || [],
        }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Editar componente</h2>

        {/* Etiqueta para el campo de título */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título del gráfico
        </label>

        {/* Campo de entrada para escribir el título del gráfico */}
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          value={titulo} // el valor actual del estado `titulo`
          onChange={(e) => setTitulo(e.target.value)} // actualiza el estado al escribir
          placeholder="Ej. Temperatura en el aula" // texto de ejemplo
        />


        {/* Si el componente es de tipo 'tabla-ml-tiempo-real', renderiza el formulario de columnas */}
        {componente?.tipo === 'tabla-ml-tiempo-real' && (
          <>
            {/* Título de la sección */}
            <h3 className="font-semibold text-gray-700 mb-2">
              Columnas (nombre + dispositivo + campo + unidad)
            </h3>

            {/* Itera sobre las columnas configuradas para editarlas */}
            {(configLocal.columnas || []).map((col, index) => (
              <div key={index} className="grid grid-cols-6 gap-2 mb-2 items-center">

                {/* Input para el nombre de la columna */}
                <input
                  type="text"
                  placeholder="Nombre"
                  className="input-form"
                  value={col.nombre}
                  onChange={(e) => {
                    const nuevas = [...configLocal.columnas];
                    nuevas[index].nombre = e.target.value;
                    setConfigLocal({ ...configLocal, columnas: nuevas });
                  }}
                />

                {/* Selector de dispositivo */}
                <select
                  value={col.id_dispositivo}
                  className="input-form"
                  onChange={(e) => {
                    const nuevas = [...configLocal.columnas];
                    nuevas[index].id_dispositivo = e.target.value;
                    nuevas[index].campo = ''; // al cambiar dispositivo, limpia el campo
                    setConfigLocal({ ...configLocal, columnas: nuevas });
                  }}
                >
                  <option value="">Dispositivo</option>
                  {/* Opciones de dispositivos disponibles */}
                  {dispositivos.map((d) => (
                    <option key={d.id_dispositivo} value={d.id_dispositivo}>
                      {d.nombre || d.id_dispositivo}
                    </option>
                  ))}
                </select>

                {/* Selector de campo del dispositivo */}
                <select
                  value={col.campo}
                  className="input-form"
                  onChange={(e) => {
                    const nuevas = [...configLocal.columnas];
                    nuevas[index].campo = e.target.value;
                    setConfigLocal({ ...configLocal, columnas: nuevas });
                  }}
                >
                  <option value="">Campo</option>
                  {/* Opciones de campos disponibles para el dispositivo seleccionado */}
                  {(camposPorDispositivo[col.id_dispositivo] || []).map((campo) => (
                    <option key={campo} value={campo}>{campo}</option>
                  ))}
                </select>

                {/* Input para la unidad de medida (opcional) */}
                <input
                  type="text"
                  placeholder="Unidad (opcional)"
                  className="input-form"
                  value={col.unidad}
                  onChange={(e) => {
                    const nuevas = [...configLocal.columnas];
                    nuevas[index].unidad = e.target.value;
                    setConfigLocal({ ...configLocal, columnas: nuevas });
                  }}
                />

                {/* Selector de variable del modelo ML asociada */}
                <select
                  className="input-form"
                  value={col.clave_modelo || ''}
                  onChange={(e) => {
                    const nuevas = [...configLocal.columnas];
                    nuevas[index].clave_modelo = e.target.value;
                    setConfigLocal({ ...configLocal, columnas: nuevas });
                  }}
                >
                  <option value="">Variable ML</option>
                  {/* Filtra para que cada variable ML solo se asigne a una columna */}
                  {todasLasClavesModelo
                    .filter((clave) =>
                      !(configLocal.columnas || []).some((c, i) => i !== index && c.clave_modelo === clave)
                    )
                    .map((clave) => (
                      <option key={clave} value={clave}>{clave}</option>
                    ))}
                </select>

                {/* Botón para eliminar esta columna */}
                <button
                  onClick={() => {
                    const nuevas = [...configLocal.columnas];
                    nuevas.splice(index, 1);
                    setConfigLocal({ ...configLocal, columnas: nuevas });
                  }}
                  className="text-red-500 text-lg hover:scale-110"
                  title="Eliminar columna"
                >
                  ❌
                </button>
              </div>
            ))}

            {/* Botón para agregar una nueva columna vacía */}
            <button
              onClick={() =>
                setConfigLocal({
                  ...configLocal,
                  columnas: [...(configLocal.columnas || []), {
                    nombre: '', id_dispositivo: '', campo: '', unidad: '', clave_modelo: ''
                  }]
                })
              }
              className="text-blue-600 hover:underline mt-2"
            >
              + Agregar columna
            </button>
          </>
        )}


        {/* Si el componente es de tipo 'tabla-ml-tiempo-real', muestra el input para costo por kWh */}
        {componente?.tipo === 'tabla-ml-tiempo-real' && (
          <div className="mb-4">
            {/* Etiqueta del input */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo por kWh (USD)
            </label>

            {/* Input numérico para especificar el costo por kWh */}
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={costoKWh} // valor actual del estado
              onChange={(e) => setCostoKWh(parseFloat(e.target.value) || 0.10)} // actualiza estado
            />
          </div>
        )}

        {/* Si el componente es de tipo 'herramienta-ml', muestra configuración de panel solar */}
        {componente?.tipo === 'herramienta-ml' && (
          <>
            {/* Input para ancho del panel en mm */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ancho del panel (mm)
            </label>
            <input
              type="number"
              value={configLocal.ancho || 137} // valor actual
              onChange={(e) =>
                setConfigLocal({ ...configLocal, ancho: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            {/* Input para alto del panel en mm */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alto del panel (mm)
            </label>
            <input
              type="number"
              value={configLocal.alto || 85}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, alto: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            {/* Input para eficiencia del panel en % */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eficiencia del panel (%)
            </label>
            <input
              type="number"
              value={configLocal.eficiencia || 15}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, eficiencia: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            {/* Input para costo por kWh */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo por kWh (USD)
            </label>
            <input
              type="number"
              value={costoKWh}
              onChange={(e) => setCostoKWh(parseFloat(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            />
          </>
        )}


        {/* Si es un componente múltiple (ej. gráfico con varias series) */}
        {esMultiple ? (
          <div className="mb-4">
            {/* Etiqueta para la sección de fuentes */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fuentes (dispositivo + campo)
            </label>

            {/* Itera sobre cada fuente configurada */}
            {fuentes.map((fuente, idx) => (
              <div key={idx} className="flex gap-2 mb-2">

                {/* Selector de dispositivo para esta fuente */}
                <select
                  className="flex-1 border border-gray-300 rounded px-2 py-1"
                  value={fuente.id_dispositivo}
                  onChange={(e) => {
                    const copia = [...fuentes];
                    copia[idx].id_dispositivo = e.target.value;
                    copia[idx].campo = ''; // limpia el campo cuando cambia dispositivo
                    copia[idx].nombre_dispositivo =
                      dispositivos.find(d => d.id_dispositivo === e.target.value)?.nombre || '';
                    setFuentes(copia);
                  }}
                >
                  <option value="">Dispositivo</option>
                  {/* Lista de dispositivos disponibles */}
                  {dispositivos.map((d) => (
                    <option key={d.id_dispositivo} value={d.id_dispositivo}>
                      {d.nombre} ({d.tipo})
                    </option>
                  ))}
                </select>

                {/* Selector de campo para el dispositivo seleccionado */}
                <select
                  className="flex-1 border border-gray-300 rounded px-2 py-1"
                  value={fuente.campo || ''}
                  onChange={(e) => {
                    const copia = [...fuentes];
                    copia[idx].campo = e.target.value;
                    setFuentes(copia);
                  }}
                >
                  <option value="">Campo</option>
                  {/* Lista de campos disponibles para el dispositivo seleccionado */}
                  {(camposPorDispositivo[fuente.id_dispositivo] || []).map((campo) => (
                    <option key={campo} value={campo}>{campo}</option>
                  ))}
                </select>

                {/* Botón para eliminar esta fuente */}
                <button
                  className="text-red-500"
                  onClick={() => {
                    const copia = [...fuentes];
                    copia.splice(idx, 1);
                    setFuentes(copia);
                  }}
                >
                  ❌
                </button>
              </div>
            ))}

            {/* Botón para añadir una nueva fuente vacía */}
            <button
              onClick={() => setFuentes([...fuentes, { id_dispositivo: '', campo: '' }])}
              className="text-blue-600 underline text-sm"
            >
              + Añadir fuente
            </button>
          </div>
        ) : (
          <>
            {/* Si NO es múltiple y tampoco es tabla-ml-tiempo-real ni herramienta-ml */}
            {!['tabla-ml-tiempo-real', 'herramienta-ml'].includes(componente?.tipo) && (
              <>
                {/* Selector de dispositivo */}
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispositivo
                </label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                  value={idDispositivo}
                  onChange={(e) => setIdDispositivo(e.target.value)}
                >
                  <option value="">Selecciona un dispositivo</option>
                  {/* Lista de dispositivos disponibles */}
                  {dispositivos.map((d) => (
                    <option key={d.id_dispositivo} value={d.id_dispositivo}>
                      {d.nombre} ({d.tipo})
                    </option>
                  ))}
                </select>

                {/* Selector de campo */}
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campo a mostrar
                </label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                  value={campo}
                  onChange={(e) => setCampo(e.target.value)}
                >
                  <option value="">Selecciona un campo</option>
                  {/* Lista de campos disponibles para el dispositivo seleccionado */}
                  {(camposPorDispositivo[idDispositivo] || []).map((campo) => (
                    <option key={campo} value={campo}>{campo}</option>
                  ))}
                </select>
              </>
            )}
          </>
        )}


        {/* Si el componente es de tipo 'texto', muestra las opciones de configuración de texto */}
        {componente?.tipo === 'texto' && (
          <>
            {/* Contenido del texto */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenido
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
              value={configTexto.contenido} // estado actual del contenido
              onChange={(e) => setConfigTexto({ ...configTexto, contenido: e.target.value })} // actualiza el contenido
            />

            {/* Color del texto */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <input
              type="color"
              value={configTexto.color} // estado actual del color
              onChange={(e) => setConfigTexto({ ...configTexto, color: e.target.value })} // actualiza color
              className="mb-2"
            />

            {/* Tamaño de la fuente */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tamaño de fuente
            </label>
            <input
              type="number"
              min={8} max={64} // límites para el tamaño
              value={configTexto.fontSize}
              onChange={(e) => setConfigTexto({ ...configTexto, fontSize: parseInt(e.target.value) || 16 })}
              className="mb-2"
            />

            {/* Tipo de letra (fuente) */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de letra
            </label>
            <select
              value={configTexto.fontFamily}
              onChange={(e) => setConfigTexto({ ...configTexto, fontFamily: e.target.value })}
              className="w-full mb-2"
            >
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
            </select>

            {/* Opciones de formato: negrita, cursiva, subrayado */}
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={configTexto.negrita}
                  onChange={(e) => setConfigTexto({ ...configTexto, negrita: e.target.checked })}
                />
                Negrita
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={configTexto.cursiva}
                  onChange={(e) => setConfigTexto({ ...configTexto, cursiva: e.target.checked })}
                />
                Cursiva
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={configTexto.subrayado}
                  onChange={(e) => setConfigTexto({ ...configTexto, subrayado: e.target.checked })}
                />
                Subrayado
              </label>
            </div>

            {/* Alineación del texto */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alineación
            </label>
            <select
              value={configTexto.alineacion}
              onChange={(e) => setConfigTexto({ ...configTexto, alineacion: e.target.value })}
              className="w-full mb-4"
            >
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>
          </>
        )}


        {/* Si el componente es una forma (su tipo comienza con 'forma') */}
        {componente?.tipo?.startsWith('forma') && (
          <div className="mb-4">
            {/* Selector de color de relleno */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color de relleno
            </label>
            <input
              type="color"
              value={config.colorRelleno} // estado actual del color de relleno
              onChange={e => setConfig({ ...config, colorRelleno: e.target.value })}
              className="w-full h-10 mb-2"
            />

            {/* Selector de color del borde */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color del borde
            </label>
            <input
              type="color"
              value={config.colorBorde} // estado actual del color del borde
              onChange={e => setConfig({ ...config, colorBorde: e.target.value })}
              className="w-full h-10 mb-2"
            />

            {/* Grosor del borde en píxeles */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grosor del borde
            </label>
            <input
              type="number"
              value={config.grosorBorde} // estado actual del grosor
              onChange={e => setConfig({ ...config, grosorBorde: parseInt(e.target.value) || 1 })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        )}

        {/* Si es una forma, también muestra la rotación */}
        {esForma && (
          <div className="mb-4">
            {/* Rotación en grados */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rotación (grados)
            </label>
            <input
              type="number"
              value={config.rotacion || 0} // estado actual de rotación
              onChange={(e) => setConfig({ ...config, rotacion: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded px-2 py-1"
            />
          </div>
        )}

        {/* Si el componente es 'tabla-ml-tiempo-real', muestra configuración de panel */}
        {componente?.tipo === 'tabla-ml-tiempo-real' && (
          <>
            {/* Ancho del panel en mm */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ancho del panel (mm)
            </label>
            <input
              type="number"
              value={configLocal.ancho || 137}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, ancho: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            {/* Alto del panel en mm */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alto del panel (mm)
            </label>
            <input
              type="number"
              value={configLocal.alto || 85}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, alto: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            {/* Eficiencia del panel en % */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eficiencia del panel (%)
            </label>
            <input
              type="number"
              value={configLocal.eficiencia || 15}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, eficiencia: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            />
          </>
        )}

        {/* Si el componente NO es 'tabla-ml-tiempo-real' ni 'herramienta-ml', muestra opciones generales */}
        {!['tabla-ml-tiempo-real', 'herramienta-ml'].includes(componente?.tipo) && (
          <>
            {/* Mínimo del eje Y */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mínimo eje Y
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={minY}
              onChange={(e) => setMinY(e.target.value)}
              placeholder="Ej. 0"
            />

            {/* Máximo del eje Y */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máximo eje Y
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={maxY}
              onChange={(e) => setMaxY(e.target.value)}
              placeholder="Ej. 1000"
            />

            {/* Descripción para el eje X */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción eje X
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={descripcionX}
              onChange={(e) => setDescripcionX(e.target.value)}
              placeholder="Ej. Tiempo (s)"
            />

            {/* Descripción para el eje Y */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción eje Y
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={descripcionY}
              onChange={(e) => setDescripcionY(e.target.value)}
              placeholder="Ej. Temperatura (°C)"
            />

            {/* Color del gráfico */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color del gráfico
            </label>
            <input
              type="color"
              className="w-full h-10 border border-gray-300 rounded px-3 py-2 mb-4"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />

            {/* 
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha inicio
            </label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha fin
            </label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
            */}

            {/* Cantidad máxima de datos */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad máxima de datos a mostrar
            </label>
            <input
              type="number"
              min={1}
              max={200}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={cantidadMaxima}
              onChange={(e) => {
                const valor = e.target.value;
                if (valor === '') {
                  setCantidadMaxima(''); // permite que esté vacío mientras escribe
                } else {
                  setCantidadMaxima(Number(valor));
                }
              }}
              placeholder="Ej. 20"
            />

          </>
        )}

        {/* Checkbox para quitar la sombra del componente */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            className="accent-blue-600"
            checked={configLocal.sinSombra || false} // estado actual de sombra
            onChange={(e) => setConfigLocal({ ...configLocal, sinSombra: e.target.checked })} // actualiza sombra
          />
          <span>Quitar sombra</span>
        </label>

        {/* Botones para cancelar o guardar cambios */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};