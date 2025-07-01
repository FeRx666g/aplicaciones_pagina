import React from 'react';
import { Link } from 'react-router-dom';
import Arbol from '../assets/Arbol.png';
import Planeta from '../assets/Planeta2.png';
import DeepSunLyLetras from '../assets/DeepSunLyLetras.png';

export const Inicio = () => {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-40 bg-gradient-to-b from-white via-white dark:from-black dark:via-zinc-900 dark:to-black text-center px-4">

      {/* Hero principal */}
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-extrabold  text-cyan-400 bg-clip-text mb-6">
          Bienvenido a Deep SunLy
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          Predice la producción de energía solar con inteligencia artificial, sensores IoT y visión por computadora.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/dashboard">
            <div className="p-[2px] rounded-full bg-gradient-to-r from-green-400 to-yellow-400 transition transform hover:scale-105">
              <button className="px-6 py-2 rounded-full bg-white dark:bg-black text-black dark:text-white font-bold">
                Ver Dashboard
              </button>
            </div>
          </Link>
          <Link to="/camara">
            <div className="p-[2px] rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 transition transform hover:scale-105">
              <button className="px-6 py-2 rounded-full bg-white dark:bg-black text-black dark:text-white font-bold">
                Cámara en Vivo
              </button>
            </div>
          </Link>
          <Link to="/api-info">
            <div className="p-[2px] rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition transform hover:scale-105">
              <button className="px-6 py-2 rounded-full bg-white dark:bg-black text-black dark:text-white font-bold">
                Conocer el Proyecto
              </button>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer de créditos */}
      <div className="mt-10 text-sm text-gray-500 text-center mb-36">
        Proyecto de Titulación | Fernando González & Dayana Paladines — ESPOCH 2025
      </div>

      {/* Beneficios */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 px-6 max-w-6xl">
        {[{
          title: 'Adquisición de Datos',
          text: 'Captura de variables climáticas como temperatura, humedad y luz desde sensores IoT.',
          gradient: 'from-yellow-500 to-orange-400'
        }, {
          title: 'Predicción Inteligente',
          text: 'Modelo LSTM entrenado para estimar la producción energética de manera precisa.',
          gradient: 'from-cyan-500 to-blue-500'
        }, {
          title: 'Visualización Web',
          text: 'Dashboard en tiempo real con gráficos, datos históricos y vista de cámara solar.',
          gradient: 'from-pink-500 to-purple-500'
        }].map((item, idx) => (
          <div key={idx} className={`p-[2px] rounded-xl bg-gradient-to-r ${item.gradient} shadow-lg hover:ring-2 hover:ring-opacity-40 transition`}>
            <div className="bg-white dark:bg-black rounded-xl h-full p-5 text-black dark:text-white">
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-base">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cómo funciona */}
      <div className="mt-16 max-w-5xl px-4">
        <h2 className="text-3xl font-bold mb-6 text-cyan-400">¿Cómo funciona Deep SunLy?</h2>
        <div className="grid md:grid-cols-4 gap-6 text-left">
          {[
            'Sensado',
            'Procesamiento',
            'Predicción',
            'Visualización'
          ].map((title, idx) => (
            <div key={idx} className="relative bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-xl">
              <div className="absolute -top-3 -left-3 bg-gradient-to-r from-sky-400 to-lime-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow">
                {idx + 1}
              </div>
              <h3 className="font-bold mb-2 text-black dark:text-white mt-2">{title}</h3>
              <p className="text-gray-700 dark:text-gray-200">
                {[
                  'Los sensores IoT capturan datos de luz, temperatura, humedad y más.',
                  'Los datos se limpian y transforman en tiempo real usando Python.',
                  'Una red neuronal LSTM predice la producción solar del día.',
                  'Los resultados se muestran en dashboards gráficos y en la nube.'
                ][idx]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Compromiso */}
      <div className="mt-20 max-w-6xl px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-green-500 dark:text-green-300 mb-6">
          Nuestro compromiso con el planeta 🌍
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-10">
          En Deep SunLy creemos que la tecnología puede proteger el medio ambiente.
          Buscamos impulsar el uso inteligente de energía solar y apoyar comunidades sostenibles.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center justify-center">
          {[{
            img: Arbol,
            text: 'Monitoreamos variables naturales'
          }, {
            img: Planeta,
            text: 'Reducimos la huella de carbono'
          }, {
            img: DeepSunLyLetras,
            text: 'Proyecto ESPOCH 2025'
          }].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-lg">
              <img src={item.img} alt={item.text} className="w-24 h-24 object-contain" />
              <p className="mt-2 text-sm text-black dark:text-white">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ¿Por qué usar Deep SunLy? */}
      <div className="mt-20 max-w-6xl px-4 text-center">
        <h2 className="text-3xl font-bold text-yellow-400 mb-10">
          ¿Por qué usar Deep SunLy?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[{
            title: '🔋 Optimiza tu Energía',
            text: 'Con predicciones diarias de producción solar, puedes planificar el uso de energía con eficiencia.',
            gradient: 'from-green-400 to-yellow-400'
          }, {
            title: '📡 Visualiza en Tiempo Real',
            text: 'Dashboard interactivo, cámara solar y datos climáticos centralizados en un solo lugar.',
            gradient: 'from-blue-400 to-cyan-500'
          }, {
            title: '🌱 Ayuda al Planeta',
            text: 'Cada watt bien utilizado reduce emisiones y ayuda a construir un futuro más sostenible.',
            gradient: 'from-pink-500 to-purple-500'
          }].map((item, idx) => (
            <div key={idx} className={`p-[2px] rounded-2xl bg-gradient-to-r ${item.gradient} shadow-lg`}>
              <div className="bg-white dark:bg-black rounded-2xl p-6 text-black dark:text-white hover:scale-105 transition h-full">
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Despedida */}
      <div className="mt-20 mb-20 text-center px-4">
        <h2 className="text-4xl md:text-5xl font-bold  text-cyan-400 bg-clip-text mb-4">
          ¡Gracias por visitarnos!
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
          Este proyecto ha sido desarrollado con dedicación, aprendizaje y mucho cariño por estudiantes apasionados por la tecnología y el planeta.
          Te invitamos a seguir explorando y ser parte del cambio hacia un futuro más sostenible 🌞🌿.
        </p>
      </div>

    </div>
  );
};
