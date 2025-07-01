// VistaTablero.jsx
import { useEffect, useState, useContext, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { ComponenteDinamico } from '../componentes/ComponenteDinamico';
import { ToolBar } from '../componentes/ToolBar';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { UserContext } from '../providers/UserProvider';
import { ModalEditarComponente } from '../componentes/ModalEditarComponente';
import { HerramientaML } from '../componentes/HerramientaML';
import { FaCog } from 'react-icons/fa';


export const VistaTablero = () => {
  const { idTablero } = useParams();
  const { user } = useContext(UserContext);
  const [diapositivas, setDiapositivas] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [componenteEditando, setComponenteEditando] = useState(null);
  const [reiniciarSubscripciones, setReiniciarSubscripciones] = useState(false);
  const diapositivaActual = diapositivas[indiceActual];
  const actualizacionesRef = useRef({});
  const subscripcionesActivas = useRef([]);
  const unsubPorComponente = useRef({}); 
  const [componentes, setComponentes] = useState([]);
  const componentesRef = useRef([]);

  useEffect(() => {
    componentesRef.current = diapositivaActual?.componentes || [];
  }, [diapositivaActual?.componentes]);


  useEffect(() => {
    return () => {
      subscripcionesActivas.current.forEach(unsub => unsub());
      subscripcionesActivas.current = [];
    };
  }, []);

  const iniciarSuscripcionParaComp = (comp, timestampDesde) => {
    const { id_dispositivo, campo } = comp.config;
    if (!id_dispositivo || !campo) return;

    // 💣 Cancela suscripción anterior si existe
    if (unsubPorComponente.current[comp.id]) {
      unsubPorComponente.current[comp.id]();
    }

    const q = query(
      collection(db, 'mediciones'),
      where('id_dispositivo', '==', id_dispositivo),
      where('timestamp', '>', new Date(timestampDesde)),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const valor = data.datos?.[campo];
          const etiqueta = new Date().toLocaleTimeString();

          if (valor !== undefined && comp.config?.modoTiempoReal) {
            setDiapositivas((prev) =>
              prev.map((slide) => {
                if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

                const nuevosComponentes = slide.componentes.map((c) => {
                  if (c.id !== comp.id) return c;
                  const nuevaConfig = { ...c.config };
                  const max = nuevaConfig?.cantidadMaxima || 20;

                  nuevaConfig.valores = [...(nuevaConfig.valores || []), valor].slice(-max);
                  nuevaConfig.etiquetas = [...(nuevaConfig.etiquetas || []), etiqueta].slice(-max);

                  return { ...c, config: nuevaConfig };
                });

                return { ...slide, componentes: nuevosComponentes };
              })
            );
          }
        }
      });
    });

    unsubPorComponente.current[comp.id] = unsub;
  };


  useEffect(() => {
    if (!user || !idTablero || !diapositivaActual) return;

    subscripcionesActivas.current.forEach(unsub => unsub());
    subscripcionesActivas.current = [];

    diapositivaActual.componentes.forEach((comp) => {
      const config = comp.config;
      const esMultiple = comp.tipo === 'grafico-area-stack' || comp.tipo === 'grafico-linea-multiple';


      if (comp.tipo === 'texto' || comp.tipo?.startsWith('forma')) return;

      if (esMultiple && Array.isArray(config.fuentes)) {
        config.fuentes
          .filter(f => typeof f === 'object' && typeof f.id_dispositivo === 'string' && typeof f.campo === 'string' && f.id_dispositivo.trim() && f.campo.trim())
          .forEach((fuente) => {
            const { id_dispositivo, campo } = fuente;

            const q = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(1)
            );

            const qHist = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(config?.cantidadMaxima || 20)
            );

            getDocs(qHist).then((snapshot) => {
              const nuevosValores = snapshot.docs.reverse().map(doc => doc.data()?.datos?.[campo]).filter(v => v !== undefined);
              const nuevasEtiquetas = snapshot.docs.reverse().map(doc => new Date(doc.data().timestamp.toDate()).toLocaleTimeString());

              setDiapositivas((prev) =>
                prev.map((slide) => {
                  if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

                  const nuevosComponentes = slide.componentes.map((c) => {
                    if (c.id !== comp.id) return c;

                    const nuevaConfig = { ...c.config };
                    if (!nuevaConfig.series) nuevaConfig.series = {};
                    if (!nuevaConfig.etiquetas) nuevaConfig.etiquetas = [];

                    const fuente = config.fuentes.find(f => f.id_dispositivo === id_dispositivo && f.campo === campo);
                    const nombreSerie = `${fuente?.nombre_dispositivo || id_dispositivo} - ${campo}`;

                    nuevaConfig.series[nombreSerie] = nuevosValores;
                    nuevaConfig.etiquetas = nuevasEtiquetas;

                    return {
                      ...c,
                      config: nuevaConfig
                    };
                  });

                  return {
                    ...slide,
                    componentes: nuevosComponentes
                  };
                })
              );
            });

            const unsubscribe = onSnapshot(q, (snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                  const data = change.doc.data();
                  const timestampDato = data.timestamp?.toDate?.().getTime?.();
                  const actualizado = componentesRef.current.find(c => c.id === comp.id);
                  const limite = actualizado?.config?.timestampUltimoDato;



                  if (!comp?.config?.modoTiempoReal) return;

                  if (limite && timestampDato && timestampDato <= limite) {
                    return;
                  }




                  const valor = data.datos?.[campo];
                  const etiqueta = new Date().toLocaleTimeString();

                  if (valor !== undefined) {
                    const clave = `${comp.id}-${id_dispositivo}-${campo}`;
                    if (actualizacionesRef.current[clave] === valor) return;
                    actualizacionesRef.current[clave] = valor;
                    // Verifica si el componente tiene modoTiempoReal activado
                    if (!comp?.config?.modoTiempoReal) return;

                    setDiapositivas((prev) =>
                      prev.map((slide) => {
                        if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

                        const nuevosComponentes = slide.componentes.map((c) => {
                          if (c.id !== comp.id) return c;

                          const nuevaConfig = { ...c.config };
                          if (!nuevaConfig.series) nuevaConfig.series = {};
                          if (!nuevaConfig.etiquetas) nuevaConfig.etiquetas = [];

                          const fuente = config.fuentes.find(f => f.id_dispositivo === id_dispositivo && f.campo === campo);
                          const nombreSerie = `${fuente?.nombre_dispositivo || id_dispositivo} - ${campo}`;

                          const claveSerie = nombreSerie;
                          if (!nuevaConfig.series[claveSerie]) nuevaConfig.series[claveSerie] = [];

                          const max = config?.cantidadMaxima || 20;
                          nuevaConfig.series[claveSerie] = [...nuevaConfig.series[claveSerie], valor].slice(-max);
                          nuevaConfig.etiquetas = [...nuevaConfig.etiquetas, etiqueta].slice(-max);

                          return {
                            ...c,
                            config: nuevaConfig
                          };
                        });

                        return {
                          ...slide,
                          componentes: nuevosComponentes
                        };
                      })
                    );
                  }
                }
              });
            });

            subscripcionesActivas.current.push(unsubscribe);
          });
      }

      else if (['grafico-line', 'grafico-bar', 'grafico-area'].includes(comp.tipo)) {

        const { id_dispositivo, campo } = config;
        if (!id_dispositivo || !campo) return;

        const q = query(
          collection(db, 'mediciones'),
          where('id_dispositivo', '==', id_dispositivo),
          orderBy('timestamp', 'desc'),
          limit(config?.cantidadMaxima || 20)
        );

        getDocs(q).then((snapshot) => {
          const nuevosValores = snapshot.docs.reverse().map(doc => doc.data()?.datos?.[campo]).filter(v => v !== undefined);
          const nuevasEtiquetas = snapshot.docs.reverse().map(doc => new Date(doc.data().timestamp.toDate()).toLocaleTimeString());

          setDiapositivas((prev) =>
            prev.map((slide) => {
              if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

              const nuevosComponentes = slide.componentes.map((c) => {
                if (c.id !== comp.id) return c;

                const nuevaConfig = { ...c.config };
                nuevaConfig.valores = nuevosValores;
                nuevaConfig.etiquetas = nuevasEtiquetas;

                return {
                  ...c,
                  config: nuevaConfig
                };
              });

              return {
                ...slide,
                componentes: nuevosComponentes
              };
            })
          );
        });

        const unsub = onSnapshot(
          query(
            collection(db, 'mediciones'),
            where('id_dispositivo', '==', id_dispositivo),
            orderBy('timestamp', 'desc'),
            limit(1)
          ),
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();

                const timestampDato = data.timestamp?.toDate?.().getTime?.();
                const actualizado = componentesRef.current.find(c => c.id === comp.id);
                const limite = actualizado?.config?.timestampUltimoDato;

                if (!comp?.config?.modoTiempoReal) return;

                if (limite && timestampDato && timestampDato <= limite) {
                  return;
                }




                const valor = data.datos?.[campo];
                const etiqueta = new Date().toLocaleTimeString();

                if (valor !== undefined) {
                  const clave = `${comp.id}-${id_dispositivo}-${campo}`;
                  if (actualizacionesRef.current[clave] === valor) return;
                  actualizacionesRef.current[clave] = valor;
                  // Verifica si el componente tiene modoTiempoReal activado
                  if (!comp?.config?.modoTiempoReal) return;

                  setDiapositivas((prev) =>
                    prev.map((slide) => {
                      if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

                      const nuevosComponentes = slide.componentes.map((c) => {
                        if (c.id !== comp.id) return c;

                        const nuevaConfig = { ...c.config };
                        const max = config?.cantidadMaxima || 20;
                        nuevaConfig.valores = [...(nuevaConfig.valores || []), valor].slice(-max);
                        nuevaConfig.etiquetas = [...(nuevaConfig.etiquetas || []), etiqueta].slice(-max);

                        return {
                          ...c,
                          config: nuevaConfig
                        };
                      });

                      return {
                        ...slide,
                        componentes: nuevosComponentes
                      };
                    })
                  );
                }
              }
            });
          }
        );

        subscripcionesActivas.current.push(unsub);
      }

      else if (comp.tipo === 'grafico-gauge' || comp.tipo === 'gauge-stage' || comp.tipo === 'gauge-grade') {
        const { id_dispositivo, campo } = config;
        if (!id_dispositivo || !campo) return;

        if (comp?.config?.modoTiempoReal) {
          const unsub = onSnapshot(
            query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(1)
            ),
            (snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                  const data = change.doc.data();
                  const timestampDato = data.timestamp?.toDate?.().getTime?.();
                  const actualizado = componentesRef.current.find(c => c.id === comp.id);
                  const limite = actualizado?.config?.timestampUltimoDato;

                  if (!comp?.config?.modoTiempoReal) return;

                  if (limite && timestampDato && timestampDato <= limite) {
                    return;
                  }


                  const valor = data.datos?.[campo];
                  if (valor !== undefined) {
                    const clave = `${comp.id}-${id_dispositivo}-${campo}`;
                    if (actualizacionesRef.current[clave] === valor) return;
                    actualizacionesRef.current[clave] = valor;

                    setDiapositivas((prev) =>
                      prev.map((slide) => {
                        if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

                        const nuevosComponentes = slide.componentes.map((c) => {
                          if (c.id !== comp.id) return c;

                          const nuevaConfig = { ...c.config, valor };
                          return { ...c, config: nuevaConfig };
                        });

                        return {
                          ...slide,
                          componentes: nuevosComponentes
                        };
                      })
                    );
                  }
                }
              });
            }
          );

          subscripcionesActivas.current.push(unsub);
        }

      }
    });

    return () => subscripcionesActivas.current.forEach(unsub => unsub());
  }, [user, idTablero, indiceActual, reiniciarSubscripciones,
    diapositivaActual?.componentes.map(c => `${c.id}-${c.config?.modoTiempoReal}`).join(',')]);


  useEffect(() => {
    const cargarDiapositivas = async () => {
      if (!user || !idTablero) return;
      const ref = collection(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas');
      const snapshot = await getDocs(ref);
      const slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (slides.length > 0) setDiapositivas(slides);
      else setDiapositivas([{ id: 'slide-1', nombre: '1', componentes: [] }]);
    };
    cargarDiapositivas();
  }, [user, idTablero]);

  useEffect(() => {
    const guardarDiapositivas = async () => {
      if (!user || !idTablero) return;
      for (const slide of diapositivas) {
        const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas', slide.id);
        await setDoc(ref, { nombre: slide.nombre, componentes: slide.componentes });
      }
    };
    if (diapositivas.length > 0) guardarDiapositivas();
  }, [diapositivas, user, idTablero]);

  const actualizarPosicionComponentePorId = (id, data) => {
    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes = copia[indiceActual].componentes.map(comp =>
        comp.id === id ? { ...comp, ...data } : comp
      );
      return copia;
    });
  };


  const actualizarComponentePorId = (id, nuevaConfig) => {
    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes = copia[indiceActual].componentes.map(comp =>
        comp.id === id ? { ...comp, config: JSON.parse(JSON.stringify(nuevaConfig)) } : comp
      );
      return copia;
    });
  };


  const eliminarComponentePorId = (id) => {
    const confirmar = confirm("¿Deseas eliminar este componente?");
    if (!confirmar) return;

    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes = copia[indiceActual].componentes.filter(comp => comp.id !== id);
      return copia;
    });
  };


  const agregarComponente = (tipo) => {
    const configInicial = {
      'forma-cuadro': {
        colorRelleno: '#D1D5DB',
        colorBorde: '#111827',
        grosorBorde: 2,
        rotacion: 0,
      },
      'forma-rectangulo': {
        colorRelleno: '#D1D5DB',
        colorBorde: '#111827',
        grosorBorde: 2,
        rotacion: 0,
      },
      'forma-circulo': {
        colorRelleno: '#D1D5DB',
        colorBorde: '#111827',
        grosorBorde: 2,
        rotacion: 0,
      },
      'forma-triangulo': {
        colorRelleno: '#D1D5DB',
        colorBorde: '#111827',
        grosorBorde: 2,
        rotacion: 0,
      },
      'forma-linea': {
        colorBorde: '#111827',
        grosorBorde: 2,
        rotacion: 0,
      },
      'forma-flecha': {
        colorBorde: '#111827',
        grosorBorde: 2,
        rotacion: 0,
      },
      'forma-flecha-doble': {
        colorBorde: '#111827',
        grosorBorde: 2,
        rotacion: 0,
      },
      'texto': {
        contenido: 'Texto de ejemplo',
        color: '#000000',
        fontSize: 18,
        fontFamily: 'Arial',
        alineacion: 'center',
        sinSombra: false
      },
      'grafico-line': {
        titulo: 'Nuevo Gráfico',
        id_dispositivo: '',
        campo: '',
        valores: [],
        etiquetas: [],
        minY: 0,
        maxY: 100,
      },
      'grafico-gauge': {
        titulo: 'Nuevo Gauge',
        id_dispositivo: '',
        campo: '',
        valor: 0,
        minY: 0,
        maxY: 100,
      },
      'grafico-bar': {
        titulo: 'Gráfico de Barras',
        fuentes: [],
        valores: [],
      },
      'grafico-linea-multiple': {
        titulo: 'Múltiples Sensores',
        fuentes: [],
        series: {},
        etiquetas: [],
      },
      'grafico-area-stack': {
        titulo: 'Área Apilada',
        fuentes: [],
        series: {},
        etiquetas: [],
      }
    };

    const nuevo = {
      id: `${tipo}-${Date.now()}`,
      tipo,
      x: 200,
      y: 200,
      width: 400,
      height: 300,
      config: configInicial[tipo] || {
        titulo: '',
        fuentes: []
      }
    };

    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes.push(nuevo);
      return copia;
    });
  };


  const toggleFullScreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setIsFullScreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullScreen(false));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
        if (document.fullscreenElement) document.exitFullscreen();
      } else if (e.key === 'ArrowRight') {
        setIndiceActual((prev) => Math.min(prev + 1, diapositivas.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setIndiceActual((prev) => Math.max(prev - 1, 0));
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [diapositivas.length]);

  const agregarNuevaDiapositiva = () => {
    const nueva = {
      id: `slide-${Date.now()}`,
      nombre: `${diapositivas.length + 1}`,
      componentes: []
    };
    setDiapositivas((prev) => [...prev, nueva]);
    setIndiceActual(diapositivas.length);
  };

  const eliminarDiapositiva = async (index) => {
    const confirmar = confirm("¿Eliminar esta diapositiva?");
    if (!confirmar) return;

    const diapositivaAEliminar = diapositivas[index];

    // Eliminar del estado
    setDiapositivas((prev) => {
      const copia = [...prev];
      copia.splice(index, 1);
      return copia;
    });

    // Ajustar el índice actual
    setIndiceActual((prev) => {
      if (index === prev && prev > 0) return prev - 1;
      if (index < prev) return prev - 1;
      return prev;
    });

    // Eliminar Firestore
    if (user && idTablero && diapositivaAEliminar?.id) {
      const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas', diapositivaAEliminar.id);
      await deleteDoc(ref);
    }
  };


  return (
    <div className={`flex flex-col bg-white  h-screen ${isFullScreen ? 'bg-white' : ''}`}>
      {!isFullScreen && (
        <ToolBar
          onAgregar={agregarComponente}
          zoomPercent={zoomPercent}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
        />
      )}

      <div className="flex-1 relative overflow-hidden bg-white border border-gray-50  rounded-lg">
        {[...diapositivaActual?.componentes || []]
          .sort((a, b) => {
            if (a.tipo?.startsWith('forma') && !b.tipo?.startsWith('forma')) return -1;
            if (!a.tipo?.startsWith('forma') && b.tipo?.startsWith('forma')) return 1;
            return 0;
          })
          .map((comp, i) => (

            <Rnd
              key={comp.id || i}
              style={{ zIndex: comp.tipo?.startsWith('forma') ? 1 : 10 }}
              default={{ x: comp.x, y: comp.y, width: comp.width, height: comp.height }}
              bounds="parent"
              className="absolute group"
              onDragStop={(e, d) => actualizarPosicionComponentePorId(comp.id, {
                ...comp,
                x: d.x,
                y: d.y
              })}
              onResizeStop={(e, direction, ref, delta, position) => {
                actualizarPosicionComponentePorId(comp.id, {
                  ...comp,
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  ...position
                });
              }}
            >
              <div
                className={`bg-transparent ${comp.config?.sinSombra ? '' : 'shadow-md'} rounded-lg h-full w-full p-2 pt-4 relative`}
                style={{
                  transform: `rotate(${comp.config?.rotacion || 0}deg)`
                }}
              >

                {comp.tipo === 'herramienta-ml' ? (
                  <HerramientaML ancho={comp.width} alto={comp.height} config={comp.config} />
                ) : (
                  <ComponenteDinamico componente={comp} />
                )}


                <button onClick={() => eliminarComponentePorId(comp.id)}
                  className="absolute top-1 right-1 bg-red-500 cursor-pointer hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition"
                  title="Eliminar gráfico"
                >
                  X
                </button>

                <button
                  onClick={() => setComponenteEditando({ id: comp.id, comp })}
                  className="absolute top-1 right-8 bg-gray-200 hover:bg-gray-300 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                  title="Editar gráfico"
                >
                  <FaCog size={12} />
                </button>

                <button
                  onClick={() => {
                    const ahora = Date.now();
                    const reiniciar = !comp.config.modoTiempoReal;

                    const nuevaConfig = {
                      ...comp.config,
                      modoTiempoReal: reiniciar,
                      timestampUltimoDato: reiniciar ? ahora : null,
                    };

                    actualizarComponentePorId(comp.id, nuevaConfig);

                    if (reiniciar) {
                      iniciarSuscripcionParaComp(comp, ahora);
                    } else {
                      if (unsubPorComponente.current[comp.id]) {
                        unsubPorComponente.current[comp.id]();
                        unsubPorComponente.current[comp.id] = null;
                      }
                    }
                  }}


                  className="absolute top-1 right-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition"
                  title={comp.config?.modoTiempoReal ? "Pausar" : "Reanudar"}
                >
                  {comp.config?.modoTiempoReal ? '⏸' : '▶'}
                </button>

              </div>
            </Rnd>
          ))}
      </div>

      {!isFullScreen && (
        <div className="flex gap-2 justify-center items-center p-3 mb-2 ml-1 mr-1  bg-white  rounded-xl shadow-lg border border-gray-300  ">
          {diapositivas.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => setIndiceActual(index)}
              className={`relative w-16 h-12 border-2 rounded flex items-center justify-center cursor-pointer text-xs select-none transition-all duration-200 ${index === indiceActual ? 'border-blue-500 bg-white' : 'border-gray-300 bg-gray-50'} group`}
              title={`Diapositiva ${index + 1}`}
            >
              🖥️ {index + 1}
              {diapositivas.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarDiapositiva(index);
                  }}
                  className="absolute -top-1.5 -right-1.5 cursor-pointer bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow hover:bg-red-700 opacity-0 group-hover:opacity-100 transition"
                  title="Eliminar diapositiva"
                >
                  X
                </button>
              )}
            </div>
          ))}

          <button
            onClick={agregarNuevaDiapositiva}
            className="w-10 h-12 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xl"
          >
            +
          </button>
        </div>
      )}

      {componenteEditando && (
        <ModalEditarComponente
          componente={componenteEditando.comp}
          onClose={() => setComponenteEditando(null)}
          onGuardar={(nuevaConfig) => {
            actualizarComponentePorId(componenteEditando.comp.id, nuevaConfig);
            setComponenteEditando(null);
            setReiniciarSubscripciones(prev => !prev);

          }}
        />
      )}
    </div>
  );
};
