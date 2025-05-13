import React from 'react'
import { Link } from 'react-router-dom'
import Arbol from '../assets/Arbol.png'
import Planeta from '../assets/Planeta2.png'
import DeepSunLyLetras from '../assets/DeepSunLyLetras.png'

export const Inicio = () => {
  return (

    /* Primera Sección */
    <div className="flex flex-col items-center justify-start min-h-screen pt-40   bg-white dark:bg-black text-white text-center">

      <div className="text-center max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-yellow-400 text-transparent bg-clip-text">
          Bienvenido a Deep SunLy
        </h1>
        <p className="text-lg md:text-xl mb-6 text-gray-300">
          Un sistema inteligente basado en Machine Learning que predice la producción de energía solar
          usando sensores, visión por computadora y redes neuronales. 🌞⚡
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/dashboard">
            <button className="px-6 py-2 rounded-full bg-gradient-to-r from-green-400 to-yellow-400 font-bold hover:scale-105 transition transform">
              Ver Dashboard
            </button>
          </Link>
          <Link to="/camara">
            <button className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 font-bold hover:scale-105 transition transform">
              Cámara en Vivo
            </button>
          </Link>
          <Link to="/api-info">
            <button className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 font-bold hover:scale-105 transition transform">
              Conocer el Proyecto
            </button>
          </Link>
        </div>
      </div>

      <div className="mt-10 text-sm text-gray-500 text-center mb-36">
        Proyecto de Titulación | Fernando González & Dayana Paladines — ESPOCH 2025
      </div>

      {/* Segunda Sección */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 px-6 max-w-6xl">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-400 rounded-xl p-4 shadow-lg">
          <h3 className="font-bold text-lg mb-2">Adquisición de Datos</h3>
          <p className="text-sm text-white">Captura de variables climáticas como temperatura, humedad y luz desde sensores IoT.</p>
        </div>

        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-4 shadow-lg">
          <h3 className="font-bold text-lg mb-2">Predicción Inteligente</h3>
          <p className="text-sm text-white">Modelo LSTM entrenado para estimar la producción energética de manera precisa.</p>
        </div>

        <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl p-4 shadow-lg">
          <h3 className="font-bold text-lg mb-2">Visualización Web</h3>
          <p className="text-sm text-white">Dashboard en tiempo real con gráficos, datos históricos y vista de cámara solar.</p>
        </div>
      </div>



      {/* Cuarta sección */}
      <div className="mt-16 max-w-5xl px-4">
        <h2 className="text-2xl font-bold mb-6 text-cyan-400">¿Cómo funciona Deep SunLy?</h2>
        <div className="grid md:grid-cols-4 gap-6 text-sm text-left">

          <div className="bg-white dark:bg-zinc-700 p-4 rounded-xl shadow-xl transition-colors duration-300">
            <h3 className="font-bold mb-2 text-black dark:text-white">1. Sensado</h3>
            <p className="text-gray-700 dark:text-gray-200">
              Los sensores IoT capturan datos de luz, temperatura, humedad y más.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-700 p-4 rounded-xl shadow-xl transition-colors duration-300">
            <h3 className="font-bold mb-2 text-black dark:text-white">2. Procesamiento</h3>
            <p className="text-gray-700 dark:text-gray-200">
              Los datos se limpian y transforman en tiempo real usando Python.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-700 p-4 rounded-xl shadow-xl transition-colors duration-300">
            <h3 className="font-bold mb-2 text-black dark:text-white">3. Predicción</h3>
            <p className="text-gray-700 dark:text-gray-200">
              Una red neuronal LSTM predice la producción solar del día.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-700 p-4 rounded-xl shadow-xl transition-colors duration-300">
            <h3 className="font-bold mb-2 text-black dark:text-white">4. Visualización</h3>
            <p className="text-gray-700 dark:text-gray-200">
              Los resultados se muestran en dashboards gráficos y en la nube.
            </p>
          </div>

        </div>
      </div>


      {/* Quinta sección */}
      <div className="mt-20 max-w-6xl px-4 text-center transition-colors duration-300">
        <h2 className="text-3xl font-bold text-green-500 dark:text-green-300 mb-6">
          Nuestro compromiso con el planeta 🌍
        </h2>

        <p className="text-gray-700 dark:text-gray-300 mb-8">
          En Deep SunLy creemos que la tecnología puede ser una gran aliada para proteger el medio ambiente.
          Nuestro sistema busca impulsar el uso inteligente de energía solar, reducir el desperdicio energético
          y apoyar la sostenibilidad en comunidades educativas y rurales.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center justify-center">
          <div className="flex flex-col items-center bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-lg">
            <img src={Arbol} alt="Árbol" className="w-24 h-24" />
            <p className="mt-2 text-sm text-black dark:text-white">Monitoreamos variables naturales</p>
          </div>

          <div className="flex flex-col items-center bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-lg">
            <img src={Planeta} alt="Planeta Feliz" className="w-24 h-24" />
            <p className="mt-2 text-sm text-black dark:text-white">Reducimos la huella de carbono</p>
          </div>

          <div className="flex flex-col items-center bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-lg">
            <img src={DeepSunLyLetras} alt="Deep SunLy Logo" className="w-36 h-auto" />
            <p className="mt-2 text-sm text-black dark:text-white">Proyecto ESPOCH 2025</p>
          </div>
        </div>
      </div>


      {/* Sexta sección */}

      <div className="mt-20 max-w-6xl px-4 text-center">
        <h2 className="text-3xl font-bold text-yellow-400 mb-10">
          ¿Por qué usar Deep SunLy?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">

          <div className="bg-gradient-to-r from-green-400 to-yellow-400 p-6 rounded-2xl shadow-lg hover:scale-105 transition">
            <h3 className="text-lg font-bold mb-2">🔋 Optimiza tu Energía</h3>
            <p className="text-sm">Con predicciones diarias de producción solar, puedes planificar el uso de energía con eficiencia.</p>
          </div>

          <div className="bg-gradient-to-r from-blue-400 to-cyan-500 p-6 rounded-2xl shadow-lg hover:scale-105 transition">
            <h3 className="text-lg font-bold mb-2">📡 Visualiza en Tiempo Real</h3>
            <p className="text-sm">Dashboard interactivo, cámara solar y datos climáticos centralizados en un solo lugar.</p>
          </div>

          <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-6 rounded-2xl shadow-lg hover:scale-105 transition">
            <h3 className="text-lg font-bold mb-2">🌱 Ayuda al Planeta</h3>
            <p className="text-sm">Cada watt bien utilizado reduce emisiones y ayuda a construir un futuro más sostenible.</p>
          </div>

        </div>
      </div>


      {/* Séptima sección */}
      <div className="mt-20 mb-20 text-center px-4">
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-yellow-400 text-transparent bg-clip-text mb-4">
          ¡Gracias por visitarnos!
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
          Este proyecto ha sido desarrollado con dedicación, aprendizaje y mucho cariño por estudiantes apasionados por la tecnología y el planeta.
          Te invitamos a seguir explorando y ser parte del cambio hacia un futuro más sostenible 🌞🌿.
        </p>
      </div>




    </div>




  )
}
