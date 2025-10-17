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
import { FaCog, FaPlay, FaPause } from "react-icons/fa";
import Swal from 'sweetalert2';

/**
 * VistaTablero.jsx
 *
 * Componente principal para la visualización interactiva y en tiempo real
 * de un tablero con múltiples diapositivas y componentes dinámicos.
 *
 * Funcionalidades:
 * - Cargar, guardar y eliminar diapositivas asociadas a un tablero en Firestore.
 * - Gestionar componentes dinámicos dentro de cada diapositiva (gráficos, textos, formas, etc.).
 * - Escuchar datos en tiempo real desde Firestore para actualizar los componentes.
 * - Soporte para modo a pantalla completa, zoom y navegación por diapositivas.
 * - Edición, eliminación y reconfiguración de componentes mediante modales.
 * - Suscripciones dinámicas y pausables a los datos de sensores (modo tiempo real).
 * - Permite agregar nuevos componentes desde una toolbar y reposicionarlos libremente con `react-rnd`.
 *
 * Usa:
 * - Contexto `UserContext` para acceder al usuario autenticado.
 * - Firestore para almacenamiento de diapositivas y escucha de mediciones en tiempo real.
 * - `onSnapshot` para actualizaciones en vivo.
 * - `ToolBar` para herramientas de usuario y `ComponenteDinamico` para renderizar cada elemento.
 * - `Rnd` para arrastrar y redimensionar componentes dentro de la diapositiva.
 * - `ModalEditarComponente` para configurar los componentes.
 * - `HerramientaML` para componentes con capacidades de predicción usando Machine Learning.
 *
 * Características destacadas:
 * - Gestión completa de estado de las diapositivas y sus componentes.
 * - Múltiples tipos de componentes con configuraciones iniciales personalizadas.
 * - Renderizado ordenado de capas para formas y gráficos.
 * - Suscripciones separadas por componente para optimizar rendimiento.
 * - Manejo de eventos de teclado para navegación y salida de pantalla completa.
 * - Guardado automático de cambios en Firestore.
 *
 * Estilizado con TailwindCSS.
 */

export const VistaTablero = () => {
  // Obtiene el parámetro de la URL correspondiente al ID del tablero
  const { idTablero } = useParams();

  // Obtiene el usuario autenticado desde el contexto
  const { user } = useContext(UserContext);

  // Estado para almacenar todas las diapositivas del tablero
  const [diapositivas, setDiapositivas] = useState([]);

  // Índice de la diapositiva actualmente activa
  const [indiceActual, setIndiceActual] = useState(0);

  // Estado para indicar si la vista está en pantalla completa
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Porcentaje de zoom actual en la vista
  const [zoomPercent, setZoomPercent] = useState(100);

  // Estado que guarda el componente actualmente en modo de edición
  const [componenteEditando, setComponenteEditando] = useState(null);

  // Estado para forzar reinicio de suscripciones
  const [reiniciarSubscripciones, setReiniciarSubscripciones] = useState(false);

  // Referencia a la diapositiva actualmente activa
  const diapositivaActual = diapositivas[indiceActual];

  // Ref para almacenar los últimos valores actualizados por componente, evita duplicados
  const actualizacionesRef = useRef({});

  // Ref para almacenar todas las suscripciones activas a Firestore y poder cancelarlas
  const subscripcionesActivas = useRef([]);

  // Ref para almacenar una suscripción individual por componente
  const unsubPorComponente = useRef({});

  // Estado para almacenar los componentes actuales (redundante aquí, probablemente para manipulación externa)
  const [componentes, setComponentes] = useState([]);

  // Ref para tener siempre disponible el array actual de componentes sin depender del render
  const componentesRef = useRef([]);

  // Efecto para mantener actualizada la referencia con los componentes de la diapositiva actual
  useEffect(() => {
    componentesRef.current = diapositivaActual?.componentes || [];
  }, [diapositivaActual?.componentes]);

  // Efecto de limpieza: al desmontar el componente cancela todas las suscripciones activas
  useEffect(() => {
    return () => {
      subscripcionesActivas.current.forEach(unsub => unsub());
      subscripcionesActivas.current = [];
    };
  }, []);

  /**
   * Inicia una suscripción en tiempo real a las mediciones de un componente específico.
   * @param {Object} comp - El componente al que suscribirse.
   * @param {Number} timestampDesde - Fecha/hora desde la cual escuchar nuevas mediciones.
   */
  const iniciarSuscripcionParaComp = (comp, timestampDesde) => {
    const { id_dispositivo, campo } = comp.config;

    // Si no hay dispositivo o campo configurado, no hace nada
    if (!id_dispositivo || !campo) return;

    // Si ya hay una suscripción para este componente, la cancela antes de crear una nueva
    if (unsubPorComponente.current[comp.id]) {
      unsubPorComponente.current[comp.id]();
    }

    // Crea la consulta para escuchar mediciones posteriores a timestampDesde
    const q = query(
      collection(db, 'mediciones'),
      where('id_dispositivo', '==', id_dispositivo),
      where('timestamp', '>', new Date(timestampDesde)),
      orderBy('timestamp', 'asc')
    );

    // Inicia la suscripción en tiempo real
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const valor = data.datos?.[campo];
          const etiqueta = new Date().toLocaleTimeString();

          // Si hay un valor nuevo y el componente está en modoTiempoReal, actualiza el estado
          if (valor !== undefined && comp.config?.modoTiempoReal) {
            setDiapositivas((prev) =>
              prev.map((slide) => {
                if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

                const nuevosComponentes = slide.componentes.map((c) => {
                  if (c.id !== comp.id) return c;

                  const nuevaConfig = { ...c.config };
                  const max = nuevaConfig?.cantidadMaxima || 20;

                  // Actualiza las listas de valores y etiquetas, limitando al máximo configurado
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

    // Guarda la suscripción para poder cancelarla más adelante si es necesario
    unsubPorComponente.current[comp.id] = unsub;
  };

  useEffect(() => {
    // Si no hay usuario, ni idTablero, ni diapositiva actual, no se continúa
    if (!user || !idTablero || !diapositivaActual) return;

    // Cancela todas las suscripciones activas antes de reiniciarlas
    subscripcionesActivas.current.forEach(unsub => unsub());
    subscripcionesActivas.current = [];

    // Recorre todos los componentes de la diapositiva actual
    diapositivaActual.componentes.forEach((comp) => {
      const config = comp.config;

      // Determina si es un gráfico de múltiples fuentes
      const esMultiple = comp.tipo === 'grafico-area-stack' || comp.tipo === 'grafico-linea-multiple';

      // Si es un componente de texto o una forma, no requiere suscripción
      if (comp.tipo === 'texto' || comp.tipo?.startsWith('forma')) return;

      // Si es un gráfico de múltiples fuentes y tiene fuentes configuradas
      if (esMultiple && Array.isArray(config.fuentes)) {
        // Filtra fuentes válidas
        config.fuentes
          .filter(f =>
            typeof f === 'object' &&
            typeof f.id_dispositivo === 'string' &&
            typeof f.campo === 'string' &&
            f.id_dispositivo.trim() &&
            f.campo.trim()
          )
          .forEach((fuente) => {
            const { id_dispositivo, campo } = fuente;

            // Consulta para obtener la última medición
            const q = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(1)
            );

            // Consulta para obtener un histórico limitado de mediciones
            const qHist = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(config?.cantidadMaxima || 20)
            );

            // Carga las mediciones históricas para inicializar el gráfico
            getDocs(qHist).then((snapshot) => {
              const nuevosValores = snapshot.docs.reverse()
                .map(doc => doc.data()?.datos?.[campo])
                .filter(v => v !== undefined);

              const nuevasEtiquetas = snapshot.docs.reverse()
                .map(doc => new Date(doc.data().timestamp.toDate()).toLocaleTimeString());

              // Actualiza los valores iniciales del gráfico en el estado
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

                    return { ...c, config: nuevaConfig };
                  });

                  return { ...slide, componentes: nuevosComponentes };
                })
              );
            });

            // Suscripción en tiempo real a las nuevas mediciones
            const unsubscribe = onSnapshot(q, (snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                  const data = change.doc.data();
                  const timestampDato = data.timestamp?.toDate?.().getTime?.();

                  // Busca el componente actualizado en la referencia
                  const actualizado = componentesRef.current.find(c => c.id === comp.id);
                  const limite = actualizado?.config?.timestampUltimoDato;

                  // Si no está en modoTiempoReal, no actualiza
                  if (!comp?.config?.modoTiempoReal) return;

                  // Ignora si el dato ya es antiguo
                  if (limite && timestampDato && timestampDato <= limite) return;

                  const valor = data.datos?.[campo];
                  const etiqueta = new Date().toLocaleTimeString();

                  if (valor !== undefined) {
                    const clave = `${comp.id}-${id_dispositivo}-${campo}`;
                    if (actualizacionesRef.current[clave] === valor) return;
                    actualizacionesRef.current[clave] = valor;

                    // Actualiza los valores del gráfico en el estado
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

                          nuevaConfig.series[claveSerie] =
                            [...nuevaConfig.series[claveSerie], valor].slice(-max);
                          nuevaConfig.etiquetas =
                            [...nuevaConfig.etiquetas, etiqueta].slice(-max);

                          return { ...c, config: nuevaConfig };
                        });

                        return { ...slide, componentes: nuevosComponentes };
                      })
                    );
                  }
                }
              });
            });

            // Guarda esta suscripción para poder cancelarla después
            subscripcionesActivas.current.push(unsubscribe);
          });
      }

      // Si el tipo del componente es uno de estos gráficos simples: línea, barra o área
      else if (['grafico-line', 'grafico-bar', 'grafico-area'].includes(comp.tipo)) {

        const { id_dispositivo, campo } = config;

        // Si no tiene dispositivo o campo definidos, no se suscribe
        if (!id_dispositivo || !campo) return;

        // Consulta para cargar las últimas mediciones históricas (hasta cantidadMaxima)
        const q = query(
          collection(db, 'mediciones'),
          where('id_dispositivo', '==', id_dispositivo),
          orderBy('timestamp', 'desc'),
          limit(config?.cantidadMaxima || 20)
        );

        // Ejecuta la consulta para inicializar el gráfico con datos históricos
        getDocs(q).then((snapshot) => {
          // Extrae valores y etiquetas de las mediciones, en orden cronológico
          const nuevosValores = snapshot.docs.reverse()
            .map(doc => doc.data()?.datos?.[campo])
            .filter(v => v !== undefined);

          const nuevasEtiquetas = snapshot.docs.reverse()
            .map(doc => new Date(doc.data().timestamp.toDate()).toLocaleTimeString());

          // Actualiza el estado con los valores iniciales
          setDiapositivas((prev) =>
            prev.map((slide) => {
              if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

              const nuevosComponentes = slide.componentes.map((c) => {
                if (c.id !== comp.id) return c;

                const nuevaConfig = { ...c.config };
                nuevaConfig.valores = nuevosValores;
                nuevaConfig.etiquetas = nuevasEtiquetas;

                return { ...c, config: nuevaConfig };
              });

              return { ...slide, componentes: nuevosComponentes };
            })
          );
        });

        // Prepara una suscripción en tiempo real para recibir nuevas mediciones
        const unsub = onSnapshot(
          query(
            collection(db, 'mediciones'),
            where('id_dispositivo', '==', id_dispositivo),
            orderBy('timestamp', 'desc'),
            limit(1) // solo la última medición
          ),
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();

                const timestampDato = data.timestamp?.toDate?.().getTime?.();
                const actualizado = componentesRef.current.find(c => c.id === comp.id);
                const limite = actualizado?.config?.timestampUltimoDato;

                // Si no está en modoTiempoReal o el dato es viejo, no actualiza
                if (!comp?.config?.modoTiempoReal) return;
                if (limite && timestampDato && timestampDato <= limite) return;

                const valor = data.datos?.[campo];
                const etiqueta = new Date().toLocaleTimeString();

                if (valor !== undefined) {
                  const clave = `${comp.id}-${id_dispositivo}-${campo}`;

                  // Si ya se procesó este valor previamente, lo ignora
                  if (actualizacionesRef.current[clave] === valor) return;
                  actualizacionesRef.current[clave] = valor;

                  // Verifica de nuevo modoTiempoReal antes de actualizar
                  if (!comp?.config?.modoTiempoReal) return;

                  // Actualiza el estado de la diapositiva con el nuevo valor y etiqueta
                  setDiapositivas((prev) =>
                    prev.map((slide) => {
                      if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

                      const nuevosComponentes = slide.componentes.map((c) => {
                        if (c.id !== comp.id) return c;

                        const nuevaConfig = { ...c.config };
                        const max = config?.cantidadMaxima || 20;

                        nuevaConfig.valores =
                          [...(nuevaConfig.valores || []), valor].slice(-max);
                        nuevaConfig.etiquetas =
                          [...(nuevaConfig.etiquetas || []), etiqueta].slice(-max);

                        return { ...c, config: nuevaConfig };
                      });

                      return { ...slide, componentes: nuevosComponentes };
                    })
                  );
                }
              }
            });
          }
        );

        // Guarda la suscripción para poder cancelarla más tarde
        subscripcionesActivas.current.push(unsub);
      }

      // Si el componente es uno de los tipos de gauge (medidor)
      else if (comp.tipo === 'grafico-gauge' || comp.tipo === 'gauge-stage' || comp.tipo === 'gauge-grade') {

        // Extrae el id del dispositivo y el campo a escuchar desde la configuración
        const { id_dispositivo, campo } = config;

        // Si no hay dispositivo o campo configurado, no hace nada
        if (!id_dispositivo || !campo) return;

        // Si el componente está en modo tiempo real, se suscribe a los cambios
        if (comp?.config?.modoTiempoReal) {

          // Crea una suscripción en Firestore para recibir la última medición del dispositivo y campo
          const unsub = onSnapshot(
            query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(1) // solo toma la última
            ),
            (snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                  const data = change.doc.data();

                  // Obtiene el timestamp del dato recibido
                  const timestampDato = data.timestamp?.toDate?.().getTime?.();

                  // Busca el componente actualizado en el estado actual
                  const actualizado = componentesRef.current.find(c => c.id === comp.id);

                  // Límite: para no procesar datos antiguos
                  const limite = actualizado?.config?.timestampUltimoDato;

                  // Si ya no está en modo tiempo real, sale
                  if (!comp?.config?.modoTiempoReal) return;

                  // Si el dato es más antiguo que el límite, lo ignora
                  if (limite && timestampDato && timestampDato <= limite) {
                    return;
                  }

                  // Extrae el valor del campo de los datos
                  const valor = data.datos?.[campo];

                  // Si hay un valor válido
                  if (valor !== undefined) {
                    const clave = `${comp.id}-${id_dispositivo}-${campo}`;

                    // Si el valor es igual al último registrado, no hace nada para evitar duplicados
                    if (actualizacionesRef.current[clave] === valor) return;

                    // Actualiza la referencia del último valor conocido
                    actualizacionesRef.current[clave] = valor;

                    // Actualiza el estado de las diapositivas con el nuevo valor
                    setDiapositivas((prev) =>
                      prev.map((slide) => {
                        // Solo actualiza la diapositiva que tiene este componente
                        if (!slide.componentes.some((c) => c.id === comp.id)) return slide;

                        // Mapea los componentes de esa diapositiva
                        const nuevosComponentes = slide.componentes.map((c) => {
                          if (c.id !== comp.id) return c;

                          // Sobrescribe la configuración con el nuevo valor
                          const nuevaConfig = { ...c.config, valor };
                          return { ...c, config: nuevaConfig };
                        });

                        // Retorna la diapositiva actualizada
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

          // Guarda la función para cancelar la suscripción más tarde
          subscripcionesActivas.current.push(unsub);
        }
      }
    });

    // Al finalizar el efecto, limpia todas las suscripciones activas para evitar fugas de memoria
    return () => subscripcionesActivas.current.forEach(unsub => unsub());
  }, [
    user,
    idTablero,
    indiceActual,
    reiniciarSubscripciones,
    // Dependencia: cambia cuando cambia la lista de componentes o su modoTiempoReal
    diapositivaActual?.componentes.map(c => `${c.id}-${c.config?.modoTiempoReal}`).join(',')
  ]);

  // Cargar las diapositivas desde Firestore cuando cambia user o idTablero
  useEffect(() => {
    const cargarDiapositivas = async () => {
      if (!user || !idTablero) return; // Si no hay usuario o tablero, no hace nada
      const ref = collection(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas');
      const snapshot = await getDocs(ref); // Obtiene las diapositivas del tablero
      const slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (slides.length > 0) setDiapositivas(slides); // Si hay diapositivas, las guarda en el estado
      else setDiapositivas([{ id: 'slide-1', nombre: '1', componentes: [] }]); // Si no, crea una por defecto
    };
    cargarDiapositivas();
  }, [user, idTablero]);

  // Guarda las diapositivas en Firestore cuando cambian
  useEffect(() => {
    const guardarDiapositivas = async () => {
      if (!user || !idTablero) return; // Verifica usuario y tablero
      for (const slide of diapositivas) {
        const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas', slide.id);
        await setDoc(ref, { nombre: slide.nombre, componentes: slide.componentes }); // Sobreescribe cada diapositiva
      }
    };
    if (diapositivas.length > 0) guardarDiapositivas();
  }, [diapositivas, user, idTablero]);

  // Actualiza la posición y/o tamaño de un componente por su ID
  const actualizarPosicionComponentePorId = (id, data) => {
    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes = copia[indiceActual].componentes.map(comp =>
        comp.id === id ? { ...comp, ...data } : comp
      );
      return copia;
    });
  };

  // Actualiza la configuración completa de un componente por su ID
  const actualizarComponentePorId = (id, nuevaConfig) => {
    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes = copia[indiceActual].componentes.map(comp =>
        comp.id === id ? { ...comp, config: JSON.parse(JSON.stringify(nuevaConfig)) } : comp
      );
      return copia;
    });
  };

  // Elimina un componente del estado por su ID, previa confirmación
  const eliminarComponentePorId = (id) => {
    const confirmar = confirm("¿Deseas eliminar este componente?");
    if (!confirmar) return;

    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes = copia[indiceActual].componentes.filter(comp => comp.id !== id);
      return copia;
    });
  };

  // Agrega un nuevo componente al tablero actual según su tipo
  const agregarComponente = (tipo) => {
    // Configuraciones iniciales por defecto para cada tipo de componente
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

    // Crea un objeto para el nuevo componente con su configuración inicial
    const nuevo = {
      id: `${tipo}-${Date.now()}`, // ID único usando timestamp
      tipo,
      x: 200, // Posición inicial X
      y: 200, // Posición inicial Y
      width: 400, // Ancho por defecto
      height: 300, // Alto por defecto
      config: configInicial[tipo] || {
        titulo: '',
        fuentes: []
      }
    };

    // Agrega el nuevo componente a la diapositiva actual
    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes.push(nuevo);
      return copia;
    });
  };

  // Cambia entre modo pantalla completa y modo normal
  const toggleFullScreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      // Si no está en fullscreen, lo solicita y actualiza estado
      elem.requestFullscreen().then(() => setIsFullScreen(true));
    } else {
      // Si ya está en fullscreen, lo sale y actualiza estado
      document.exitFullscreen().then(() => setIsFullScreen(false));
    }
  };

  // Detecta teclas para controlar la vista: ESC para salir de fullscreen, flechas para cambiar diapositiva
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Sale de fullscreen al presionar ESC
        setIsFullScreen(false);
        if (document.fullscreenElement) document.exitFullscreen();
      } else if (e.key === 'ArrowRight') {
        // Avanza a la siguiente diapositiva
        setIndiceActual((prev) => Math.min(prev + 1, diapositivas.length - 1));
      } else if (e.key === 'ArrowLeft') {
        // Retrocede a la diapositiva anterior
        setIndiceActual((prev) => Math.max(prev - 1, 0));
      }
    };
    // Escucha eventos de teclado
    document.addEventListener('keydown', handleKeyDown);
    // Limpia el listener al desmontar
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [diapositivas.length]);

  // Crea y agrega una nueva diapositiva vacía
  const agregarNuevaDiapositiva = () => {
    const nueva = {
      id: `slide-${Date.now()}`,  // ID único basado en timestamp
      nombre: `${diapositivas.length + 1}`, // Nombre incremental
      componentes: []            // Vacía al inicio
    };
    setDiapositivas((prev) => [...prev, nueva]); // La añade al estado
    setIndiceActual(diapositivas.length);        // La selecciona
  };

  // Elimina una diapositiva por su índice, previa confirmación
  const eliminarDiapositiva = async (index) => {
    const confirmar = confirm("¿Eliminar esta diapositiva?");
    if (!confirmar) return;

    const diapositivaAEliminar = diapositivas[index];

    // La elimina del estado local
    setDiapositivas((prev) => {
      const copia = [...prev];
      copia.splice(index, 1);
      return copia;
    });

    // Ajusta el índice actual para evitar quedarse en un índice inválido
    setIndiceActual((prev) => {
      if (index === prev && prev > 0) return prev - 1;
      if (index < prev) return prev - 1;
      return prev;
    });

    // También la elimina de Firestore si existe en la base de datos
    if (user && idTablero && diapositivaAEliminar?.id) {
      const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas', diapositivaAEliminar.id);
      await deleteDoc(ref);
    }
  };

  return (
    <div className={`flex flex-col bg-white  h-screen ${isFullScreen ? 'bg-white' : ''}`}>
      {/* Si no está en pantalla completa, se muestra la barra de herramientas superior */}
      {!isFullScreen && (
        <ToolBar
          onAgregar={agregarComponente}
          zoomPercent={zoomPercent}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
          todasLasDiapositivas={diapositivas}
        />
      )}

      {/* Contenedor principal de la diapositiva actual */}
      <div className="flex-1 relative overflow-hidden bg-white border border-gray-50 rounded-lg">

        {/* Se renderizan los componentes de la diapositiva actual */}
        {[...diapositivaActual?.componentes || []]
          .sort((a, b) => {
            // Ordena: primero las formas para que queden debajo de los gráficos
            if (a.tipo?.startsWith('forma') && !b.tipo?.startsWith('forma')) return -1;
            if (!a.tipo?.startsWith('forma') && b.tipo?.startsWith('forma')) return 1;
            return 0;
          })
          .map((comp, i) => (

            // Cada componente se renderiza como una caja redimensionable y movible
            <Rnd
              key={comp.id || i}
              style={{ zIndex: comp.tipo?.startsWith('forma') ? 1 : 10 }} // Las formas detrás
              default={{ x: comp.x, y: comp.y, width: comp.width, height: comp.height }} // Posición y tamaño inicial
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

              {/* Contenedor interno del componente */}
              <div
                className={`bg-transparent ${comp.config?.sinSombra ? '' : 'shadow-md'} rounded-lg h-full w-full p-2 pt-4 relative`}
                style={{
                  transform: `rotate(${comp.config?.rotacion || 0}deg)` // Rotación configurada
                }}
              >

                {/* Renderiza el componente: herramienta ML o genérico */}
                {comp.tipo === 'herramienta-ml' ? (
                  <HerramientaML ancho={comp.width} alto={comp.height} config={comp.config} />
                ) : (
                  <ComponenteDinamico componente={comp} />
                )}

                {/* Botón para eliminar el componente */}
                <button onClick={() => eliminarComponentePorId(comp.id)}
                  className="absolute top-1 right-1 bg-red-500 cursor-pointer hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition"
                  title="Eliminar gráfico"
                >
                  X
                </button>

                {/* Botón para abrir el modal de edición */}
                <button
                  onClick={() => setComponenteEditando({ id: comp.id, comp })}
                  className="absolute top-1 right-8 bg-gray-200 hover:bg-gray-300 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                  title="Editar gráfico"
                >
                  <FaCog size={12} />
                </button>

                {/* Botón para pausar o reanudar tiempo real */}
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
                      iniciarSuscripcionParaComp(comp, ahora); // Reanuda suscripción
                    } else {
                      if (unsubPorComponente.current[comp.id]) {
                        unsubPorComponente.current[comp.id](); // Detiene suscripción
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

      {/* Selector inferior de diapositivas (solo si no está en pantalla completa) */}
      {!isFullScreen && (
        <div className="flex gap-2 justify-center items-center p-3 mb-2 ml-1 mr-1 bg-white rounded-xl shadow-lg border border-gray-300">
          {diapositivas.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => setIndiceActual(index)}
              className={`relative w-16 h-12 border-2 rounded flex items-center justify-center cursor-pointer text-xs select-none transition-all duration-200 ${index === indiceActual ? 'border-blue-500 bg-white' : 'border-gray-300 bg-gray-50'} group`}
              title={`Diapositiva ${index + 1}`}
            >
              🖥️ {index + 1}

              {/* Botón para eliminar una diapositiva */}
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

          {/* Botón para agregar nueva diapositiva */}
          <button
            onClick={agregarNuevaDiapositiva}
            className="w-10 h-12 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xl"
          >
            +
          </button>
        </div>
      )}

      {/* Modal para editar un componente si está seleccionado */}
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
