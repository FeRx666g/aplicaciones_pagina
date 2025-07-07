import React, { useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { db } from '../firebase';
import { TablaTiempoReal } from './TablaTiempoReal';
import { HerramientaML } from '../componentes/HerramientaML';
import { collection, getDocs, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

/**
 * ComponenteDinamico
 *
 * Componente visual dinámico que renderiza diferentes tipos de elementos gráficos o de texto
 * en función del tipo y configuración especificados en las props.
 *
 * Permite renderizar:
 * - Gráficos con ECharts: línea, barras, área, gauges, múltiples series y áreas apiladas.
 * - Figuras geométricas básicas: círculo, rectángulo, cuadrado, línea, triángulo, flechas.
 * - Texto personalizado con estilos.
 * - Tabla de predicción en tiempo real (`tabla-ml-tiempo-real`).
 * - Herramienta de Machine Learning (`herramienta-ml`).
 *
 * Obtiene los datos desde Firestore para:
 * - Gráficos históricos o en tiempo real.
 * - Última medición de un conjunto de dispositivos/campos para tablas en tiempo real.
 *
 * Props:
 * - componente: Objeto con la siguiente estructura:
 *     - tipo: String con el tipo de componente a renderizar.
 *     - config: Objeto de configuración con las opciones específicas del componente:
 *         - id_dispositivo, campo, valores, etiquetas, colores, series, etc.
 *         - Puede incluir además banderas como `modoTiempoReal` o rangos de fechas.
 *
 * Usa:
 * - ReactECharts para gráficos interactivos.
 * - Firestore para consultar y suscribirse a datos.
 * - CSS y SVG para figuras geométricas.
 * - TablaTiempoReal y HerramientaML para casos especializados.
 *
 * También:
 * - Escucha los cambios en Firestore si `modoTiempoReal` está activado.
 * - Cierra las suscripciones a Firestore cuando el componente se desmonta.
 * - Aplica colores, etiquetas y configuraciones definidas en `config`.
 *
 * Devuelve:
 * - JSX.Element: representación visual del componente solicitado.
 */

export const ComponenteDinamico = ({ componente }) => {
  // Extrae el tipo de componente y su configuración del prop `componente`, con valor por defecto a objeto vacío
  const { tipo, config = {} } = componente;

  // Referencia para manipular el gráfico (ReactECharts)
  const chartRef = useRef();

  // Determina si aplicar o no la sombra al componente, según la configuración
  const claseSombra = config.sinSombra ? '' : 'shadow-xl';

  // Estado para almacenar datos históricos o en tiempo real
  const [datos, setDatos] = useState([]);

  // Estado para almacenar valores individuales en tiempo real de la tabla `tabla-ml-tiempo-real`
  const [datosTiempoReal, setDatosTiempoReal] = useState({});

  // useEffect para la tabla de predicción en tiempo real (tipo === tabla-ml-tiempo-real)
  useEffect(() => {
    if (tipo !== 'tabla-ml-tiempo-real' || !config?.columnas) return;

    // Array para acumular las suscripciones activas
    const unsubscribes = [];

    // Para cada columna definida en la configuración
    config.columnas.forEach((col) => {
      if (!col.id_dispositivo || !col.campo) return;

      // Consulta Firestore para la última medición de ese dispositivo/campo
      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', col.id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      // Suscripción a cambios en tiempo real de esa consulta
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const datos = doc.data()?.datos || {};
          const valor = datos[col.campo];

          // Actualiza el estado de datosTiempoReal con la nueva medición
          setDatosTiempoReal((prev) => ({
            ...prev,
            [col.nombre]: valor ?? 'N/A'
          }));
        }
      });

      // Guarda el unsubscribe para limpiar al desmontar
      unsubscribes.push(unsubscribe);
    });

    // Limpia todas las suscripciones al desmontar
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [tipo, config]);


  // useEffect para obtener datos históricos o en tiempo real para gráficos
  useEffect(() => {
    if (!config?.id_dispositivo) return;

    const modoTiempoReal = config.modoTiempoReal ?? false;

    // Construye los filtros de la consulta
    const filtros = [where('id_dispositivo', '==', config.id_dispositivo)];

    if (config.fechaInicio) {
      const fechaInicioDate = new Date(config.fechaInicio);
      filtros.push(where('timestamp', '>=', fechaInicioDate));
    }

    if (config.fechaFin) {
      const fechaFinDate = new Date(config.fechaFin);
      filtros.push(where('timestamp', '<=', fechaFinDate));
    }

    // Construye la consulta a Firestore con filtros y orden
    const q = query(
      collection(db, 'mediciones'),
      ...filtros,
      orderBy('timestamp', 'asc'),
      ...(config?.cantidadMaxima ? [limit(config.cantidadMaxima)] : [])
    );

    let unsubscribe = () => { };

    if (modoTiempoReal) {
      // Si está en modo tiempo real: suscríbete a los cambios
      unsubscribe = onSnapshot(q, (snapshot) => {
        const datos = snapshot.docs.map(doc => doc.data());
        setDatos(datos);
      });
    } else {
      // Si no está en tiempo real: consulta una vez
      getDocs(q).then((snapshot) => {
        const datos = snapshot.docs.map(doc => doc.data());
        setDatos(datos);
      });
    }

    // Limpia la suscripción al desmontar
    return () => unsubscribe();
  }, [
    config.id_dispositivo,
    config.campo,
    config.fechaInicio,
    config.fechaFin,
    config.cantidadMaxima,
    config.modoTiempoReal
  ]);

  // Extrae los valores del campo configurado a partir de los datos obtenidos
  const valores = datos.map((d) => d.datos?.[config.campo]).filter(v => v !== undefined);

  // Extrae las etiquetas (horas) a partir de los timestamps de los datos
  const etiquetas = datos.map((d) => new Date(d.timestamp?.toDate?.() || d.timestamp).toLocaleTimeString());

  // Configuración base para los gráficos de ECharts
  const opcionesBase = {
    title: { text: config.titulo || 'Ejemplo' },
    tooltip: { trigger: 'axis' },
    grid: {
      top: 40,
      left: 50,
      right: 30,
      bottom: tipo.includes('gauge') ? 0 : 30,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      name: config.descripcionX || '',
      nameLocation: 'middle',
      nameGap: 30,
      data: config.etiquetas || ['Lun', 'Mar', 'Mié'],
    },
    yAxis: {
      type: 'value',
      name: config.descripcionY || '',
      nameLocation: 'middle',
      nameGap: 50,
      min: config.minY ?? null,
      max: config.maxY ?? null,
    },
  };

  // Props comunes para pasar a ReactECharts
  const chartProps = {
    ref: chartRef,
    style: { height: '100%', width: '100%' },
    opts: { renderer: 'canvas' },
    notMerge: false,
    lazyUpdate: true,
  };

  switch (tipo) {
    // Gráfico de barras (ECharts)
    case 'grafico-bar':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            ...opcionesBase,
            series: [{
              type: 'bar',
              data: config.valores || [],
              itemStyle: { color: config.color || '#5470C6' },
            }]
          }}
        />
      );

    // Gráfico de líneas (ECharts)
    case 'grafico-line':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            ...opcionesBase,
            series: [{
              type: 'line',
              data: config.valores || [],
              smooth: true,
              itemStyle: { color: config.color || '#5470C6' },
            }]
          }}
        />
      );

    // Medidor Gauge básico
    case 'grafico-gauge':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            title: { text: config.titulo, top: 10 },
            series: [{
              type: 'gauge',
              min: config.minY || 0,
              max: config.maxY || 100,
              radius: '95%',
              center: ['50%', '62%'],
              axisLine: {
                lineStyle: {
                  color: [[1, config.color || '#5470C6']],
                  width: 20
                }
              },
              detail: {
                formatter: '{value}',
                offsetCenter: [0, '40%'],
                fontSize: 20,
                color: 'auto'
              },
              data: [{ value: config.valor || 0, name: config.titulo }]
            }]
          }}
        />
      );

    // Medidor semicircular (stage)
    case 'gauge-stage':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            title: { text: config.titulo, top: 10 },
            series: [{
              type: 'gauge',
              startAngle: 180,
              endAngle: 0,
              min: config.minY || 0,
              max: config.maxY || 100,
              radius: '100%',
              center: ['50%', '70%'],
              axisLine: {
                lineStyle: {
                  width: 20,
                  color: [[0.3, '#58D9F9'], [0.7, '#FDDD60'], [1, '#FF6E76']]
                }
              },
              pointer: {
                icon: 'rect',
                length: '70%',
                width: 6,
                itemStyle: { color: 'auto' }
              },
              detail: {
                valueAnimation: true,
                formatter: '{value}',
                offsetCenter: [0, '40%'],
                fontSize: 20,
                color: 'auto'
              },
              data: [{ value: config.valor || 0, name: config.titulo }]
            }]
          }}
        />
      );

    // Medidor con grados (grade)
    case 'gauge-grade':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            title: { text: config.titulo, top: 5 },
            series: [{
              type: 'gauge',
              startAngle: 225,
              endAngle: -45,
              min: config.minY || 0,
              max: config.maxY || 100,
              radius: '95%',
              center: ['50%', '59%'],
              axisLine: {
                lineStyle: {
                  width: 15,
                  color: [
                    [0.25, '#FF6E76'],
                    [0.5, '#FDDD60'],
                    [0.75, '#58D9F9'],
                    [1, '#7CFFB2']
                  ]
                }
              },
              axisLabel: {
                distance: 15,
                formatter: (value) => {
                  if (value === 20) return 'D';
                  if (value === 40) return 'C';
                  if (value === 60) return 'B';
                  if (value === 80) return 'A';
                  return '';
                }
              },
              pointer: {
                icon: 'triangle',
                length: '60%',
                width: 8,
                itemStyle: { color: 'auto' }
              },
              detail: {
                formatter: '{value}',
                offsetCenter: [0, '60%'],
                fontSize: 30,
                color: 'auto'
              },
              data: [{ value: config.valor || 0, name: config.titulo }]
            }]
          }}
        />
      );

    // Área simple
    case 'grafico-area':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            ...opcionesBase,
            series: [{
              data: config.valores || [],
              type: 'line',
              areaStyle: {},
              smooth: true,
              itemStyle: { color: config.color || '#5470C6' },
            }]
          }}
        />
      );

    // Área apilada (múltiples series)
    case 'grafico-area-stack':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            ...opcionesBase,
            legend: { data: Object.keys(config.series || {}) },
            series: Object.keys(config.series || {}).map((nombre) => ({
              name: nombre,
              type: 'line',
              stack: 'Total',
              areaStyle: {},
              data: config.series[nombre],
              itemStyle: { color: config.colores?.[nombre] }
            }))
          }}
        />
      );

    // Líneas múltiples (varias series)
    case 'grafico-linea-multiple':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            ...opcionesBase,
            legend: { data: Object.keys(config.series || {}) },
            series: Object.keys(config.series || {}).map((nombre) => ({
              name: nombre,
              type: 'line',
              smooth: true,
              data: config.series[nombre],
              itemStyle: { color: config.colores?.[nombre] }
            }))
          }}
        />
      );

    // Texto plano estilizado
    case 'texto':
      return (
        <div
          style={{
            color: config.color,
            fontSize: `${config.fontSize}px`,
            fontFamily: config.fontFamily,
            fontWeight: config.negrita ? 'bold' : 'normal',
            fontStyle: config.cursiva ? 'italic' : 'normal',
            textDecoration: config.subrayado ? 'underline' : 'none',
            textAlign: config.alineacion
          }}
        >
          {config.contenido}
        </div>
      );

    // Círculo
    case 'forma-circulo':
      return (
        <div
          className={`w-full h-full rounded-full ${claseSombra}`}
          style={{
            backgroundColor: config.colorRelleno,
            border: `${config.grosorBorde}px solid ${config.colorBorde}`
          }}
        />
      );

    // Rectángulo
    case 'forma-rectangulo':
      return (
        <div
          className={`w-full h-full ${claseSombra}`}
          style={{
            backgroundColor: config.colorRelleno,
            border: `${config.grosorBorde}px solid ${config.colorBorde}`
          }}
        />
      );

    // Cuadro (aspect ratio 1:1)
    case 'forma-cuadro':
      return (
        <div
          className={`aspect-square h-full ${claseSombra}`}
          style={{
            backgroundColor: config.colorRelleno,
            border: `${config.grosorBorde}px solid ${config.colorBorde}`
          }}
        />
      );

    // Triángulo
    case 'forma-triangulo':
      return (
        <div className={`w-full h-full flex justify-center items-center ${claseSombra}`}>
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '50px solid transparent',
            borderRight: '50px solid transparent',
            borderBottom: `100px solid ${config.colorRelleno}`
          }} />
        </div>
      );

    // Línea horizontal
    case 'forma-linea':
      return (
        <div
          className={`w-full h-full ${claseSombra}`}
          style={{
            borderTop: `${config.grosorBorde}px solid ${config.colorBorde}`
          }}
        />
      );

    // Flecha simple
    case 'forma-flecha':
      return (
        <div className={`w-full h-full ${claseSombra}`}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <line
              x1="10" y1="50" x2="90" y2="50"
              stroke={config.colorBorde}
              strokeWidth={config.grosorBorde}
              markerEnd="url(#arrowhead)"
            />
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7"
                refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={config.colorBorde} />
              </marker>
            </defs>
          </svg>
        </div>
      );

    // Flecha doble
    case 'forma-flecha-doble':
      return (
        <div className={`w-full h-full ${claseSombra}`}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <line
              x1="10" y1="50" x2="90" y2="50"
              stroke={config.colorBorde}
              strokeWidth={config.grosorBorde}
              markerStart="url(#arrowStart)"
              markerEnd="url(#arrowEnd)"
            />
            <defs>
              <marker id="arrowStart" markerWidth="10" markerHeight="7"
                refX="10" refY="3.5" orient="auto">
                <polygon points="10 0, 0 3.5, 10 7" fill={config.colorBorde} />
              </marker>
              <marker id="arrowEnd" markerWidth="10" markerHeight="7"
                refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={config.colorBorde} />
              </marker>
            </defs>
          </svg>
        </div>
      );

    // Herramienta de Machine Learning
    case 'herramienta-ml':
      return <HerramientaML />;

    // Tabla con datos en tiempo real
    case 'tabla-ml-tiempo-real':
      return <TablaTiempoReal config={config} datosTiempoReal={datosTiempoReal} />;

    // Caso por defecto: no soportado
    default:
      return <div>No soportado</div>;
  }
};
