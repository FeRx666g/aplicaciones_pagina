import { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { UserContext } from '../providers/UserProvider';

export const ModalEditarComponente = ({ componente, onClose, onGuardar }) => {
  const { user } = useContext(UserContext);
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
  const [configLocal, setConfigLocal] = useState({
    ...(componente.config || {}),
    columnas: componente.config?.columnas || []
  });
  const [costoKWh, setCostoKWh] = useState(
    componente?.config?.costoKWh ?? 0.10
  );
  const todasLasClavesModelo = ['temperatura', 'humedad', 'irradiancia', 'lux', 'nubosidad'];


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

  useEffect(() => {
    const bloquearFlechas = (e) => {
      // Si estás en un input o textarea y se presiona una tecla de flecha
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


  useEffect(() => {
    const cargarDispositivos = async () => {
      const ref = collection(db, 'usuarios', user.uid, 'dispositivos');
      const snapshot = await getDocs(ref);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDispositivos(lista);
    };
    if (user) cargarDispositivos();
  }, [user]);

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

  const guardarCambios = () => {
    if (cantidadMaxima < 0 || cantidadMaxima > 5000) {
      alert("La cantidad de datos debe estar entre 0 y 5000.");
      return;
    }

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


    if (componente?.tipo === 'texto') {
      onGuardar({
        ...configTexto,
        sinSombra: configLocal.sinSombra || false
      });
      return;
    }

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
          endpoint: "https://mlp-backend-519521736458.us-central1.run.app/predecir"
        }
      });
      return;
    }

    if (componente?.tipo?.startsWith('forma')) {
      onGuardar({
        ...componente.config,
        ...config,
        sinSombra: configLocal.sinSombra || false,
      });
      return;
    }

    if (esMultiple && Array.isArray(fuentes)) {
      const fuentesValidas = fuentes.filter(f => f.id_dispositivo?.trim() && f.campo?.trim());
      if (fuentesValidas.length !== fuentes.length) {
        alert("Por favor completa todos los campos de las fuentes antes de guardar.");
        return;
      }
    }

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

        <label className="block text-sm font-medium text-gray-700 mb-1">Título del gráfico</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej. Temperatura en el aula"
        />

        {componente?.tipo === 'tabla-ml-tiempo-real' && (
          <>
            <h3 className="font-semibold text-gray-700 mb-2">Columnas (nombre + dispositivo + campo + unidad)</h3>
            {(configLocal.columnas || []).map((col, index) => (
              <div key={index} className="grid grid-cols-6 gap-2 mb-2 items-center">
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
                <select
                  value={col.id_dispositivo}
                  className="input-form"
                  onChange={(e) => {
                    const nuevas = [...configLocal.columnas];
                    nuevas[index].id_dispositivo = e.target.value;
                    nuevas[index].campo = '';
                    setConfigLocal({ ...configLocal, columnas: nuevas });
                  }}
                >
                  <option value="">Dispositivo</option>
                  {dispositivos.map((d) => (
                    <option key={d.id_dispositivo} value={d.id_dispositivo}>
                      {d.nombre || d.id_dispositivo}
                    </option>
                  ))}
                </select>
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
                  {(camposPorDispositivo[col.id_dispositivo] || []).map((campo) => (
                    <option key={campo} value={campo}>{campo}</option>
                  ))}
                </select>
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
                  {todasLasClavesModelo
                    .filter((clave) =>
                      !(configLocal.columnas || []).some((c, i) => i !== index && c.clave_modelo === clave)
                    )
                    .map((clave) => (
                      <option key={clave} value={clave}>{clave}</option>
                    ))}
                </select>
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

        {componente?.tipo === 'tabla-ml-tiempo-real' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo por kWh (USD)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={costoKWh}
              onChange={(e) => setCostoKWh(parseFloat(e.target.value) || 0.10)}
            />
          </div>
        )}

        {componente?.tipo === 'herramienta-ml' && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ancho del panel (mm)</label>
            <input
              type="number"
              value={configLocal.ancho || 137}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, ancho: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Alto del panel (mm)</label>
            <input
              type="number"
              value={configLocal.alto || 85}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, alto: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Eficiencia del panel (%)</label>
            <input
              type="number"
              value={configLocal.eficiencia || 15}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, eficiencia: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Costo por kWh (USD)</label>
            <input
              type="number"
              value={costoKWh}
              onChange={(e) => setCostoKWh(parseFloat(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            />
          </>
        )}

        {esMultiple ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuentes (dispositivo + campo)</label>
            {fuentes.map((fuente, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select
                  className="flex-1 border border-gray-300 rounded px-2 py-1"
                  value={fuente.id_dispositivo}
                  onChange={(e) => {
                    const copia = [...fuentes];
                    copia[idx].id_dispositivo = e.target.value;
                    copia[idx].campo = ''; // Reset campo
                    copia[idx].nombre_dispositivo = dispositivos.find(d => d.id_dispositivo === e.target.value)?.nombre || '';
                    setFuentes(copia);
                  }}
                >
                  <option value="">Dispositivo</option>
                  {dispositivos.map((d) => (
                    <option key={d.id_dispositivo} value={d.id_dispositivo}>
                      {d.nombre} ({d.tipo})
                    </option>
                  ))}
                </select>

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
                  {(camposPorDispositivo[fuente.id_dispositivo] || []).map((campo) => (
                    <option key={campo} value={campo}>{campo}</option>
                  ))}
                </select>

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
            <button
              onClick={() => setFuentes([...fuentes, { id_dispositivo: '', campo: '' }])}
              className="text-blue-600 underline text-sm"
            >
              + Añadir fuente
            </button>
          </div>
        ) : (

          <>

            {!['tabla-ml-tiempo-real', 'herramienta-ml'].includes(componente?.tipo) && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispositivo</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                  value={idDispositivo}
                  onChange={(e) => setIdDispositivo(e.target.value)}
                >
                  <option value="">Selecciona un dispositivo</option>
                  {dispositivos.map((d) => (
                    <option key={d.id_dispositivo} value={d.id_dispositivo}>
                      {d.nombre} ({d.tipo})
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-medium text-gray-700 mb-1">Campo a mostrar</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                  value={campo}
                  onChange={(e) => setCampo(e.target.value)}
                >
                  <option value="">Selecciona un campo</option>
                  {(camposPorDispositivo[idDispositivo] || []).map((campo) => (
                    <option key={campo} value={campo}>{campo}</option>
                  ))}
                </select>
              </>
            )}
          </>
        )}

        {componente?.tipo === 'texto' && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
              value={configTexto.contenido}
              onChange={(e) => setConfigTexto({ ...configTexto, contenido: e.target.value })}
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={configTexto.color}
              onChange={(e) => setConfigTexto({ ...configTexto, color: e.target.value })}
              className="mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño de fuente</label>
            <input
              type="number"
              min={8}
              max={64}
              value={configTexto.fontSize}
              onChange={(e) => setConfigTexto({ ...configTexto, fontSize: parseInt(e.target.value) || 16 })}
              className="mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de letra</label>
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

            <label className="block text-sm font-medium text-gray-700 mb-1">Alineación</label>
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

        {componente?.tipo?.startsWith('forma') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Color de relleno</label>
            <input
              type="color"
              value={config.colorRelleno}
              onChange={e => setConfig({ ...config, colorRelleno: e.target.value })}
              className="w-full h-10 mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Color del borde</label>
            <input
              type="color"
              value={config.colorBorde}
              onChange={e => setConfig({ ...config, colorBorde: e.target.value })}
              className="w-full h-10 mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Grosor del borde</label>
            <input
              type="number"
              value={config.grosorBorde}
              onChange={e => setConfig({ ...config, grosorBorde: parseInt(e.target.value) || 1 })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        )}

        {esForma && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rotación (grados)</label>
            <input
              type="number"
              value={config.rotacion || 0}
              onChange={(e) => setConfig({ ...config, rotacion: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded px-2 py-1"
            />
          </div>
        )}

        {componente?.tipo === 'tabla-ml-tiempo-real' && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ancho del panel (mm)</label>
            <input
              type="number"
              value={configLocal.ancho || 137}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, ancho: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Alto del panel (mm)</label>
            <input
              type="number"
              value={configLocal.alto || 85}
              onChange={(e) =>
                setConfigLocal({ ...configLocal, alto: parseFloat(e.target.value) })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Eficiencia del panel (%)</label>
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


        {!['tabla-ml-tiempo-real', 'herramienta-ml'].includes(componente?.tipo) && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo eje Y</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={minY}
              onChange={(e) => setMinY(e.target.value)}
              placeholder="Ej. 0"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Máximo eje Y</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={maxY}
              onChange={(e) => setMaxY(e.target.value)}
              placeholder="Ej. 1000"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción eje X</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={descripcionX}
              onChange={(e) => setDescripcionX(e.target.value)}
              placeholder="Ej. Tiempo (s)"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción eje Y</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={descripcionY}
              onChange={(e) => setDescripcionY(e.target.value)}
              placeholder="Ej. Temperatura (°C)"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Color del gráfico</label>
            <input
              type="color"
              className="w-full h-10 border border-gray-300 rounded px-3 py-2 mb-4"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de datos a mostrar</label>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />

            <input
              type="number"
              min={1}
              max={200}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={cantidadMaxima}
              onChange={(e) => setCantidadMaxima(parseInt(e.target.value) || 20)}
              placeholder="Ej. 20"
            />

          </>
        )}
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            className="accent-blue-600"
            checked={configLocal.sinSombra || false}
            onChange={(e) => setConfigLocal({ ...configLocal, sinSombra: e.target.checked })}
          />
          <span>Quitar sombra</span>
        </label>

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