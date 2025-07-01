// =======================================
// IMPORTAR DEPENDENCIAS
// =======================================
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const publicarDatos = require('./routes/publicarDatos');
const firestore = require('./firebase');

// =======================================
// CONFIGURACIÓN DEL SERVIDOR
// =======================================
const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());

// =======================================
// RUTAS
// =======================================

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.send('Backend Express.js funcionando correctamente');
});

// Ruta de prueba para Firestore
app.get('/prueba-firestore', async (req, res) => {
  try {
    const resultado = await firestore.collection('test').add({
      mensaje: '¡Hola Firestore desde el backend!',
      timestamp: new Date()
    });

    res.send(`Documento creado con ID: ${resultado.id}`);
  } catch (error) {
    console.error('Error al escribir en Firestore:', error);
    res.status(500).send('Error al escribir en Firestore');
  }
});

// Ruta para publicar datos desde dispositivos
app.use('/api/datos', publicarDatos);

// =======================================
// INICIAR SERVIDOR
// =======================================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
