const express = require('express');
const router = express.Router();
const firestore = require('../firebase');
const validarApiKey = require('../middleware/validarApiKey');

router.post('/', validarApiKey, async (req, res) => {
  const { id_dispositivo, datos } = req.body;

  if (!id_dispositivo || typeof datos !== 'object') {
    return res.status(400).json({ error: 'Faltan datos o formato inválido' });
  }

  try {
    const doc = await firestore.collection('dispositivos').doc(id_dispositivo).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Dispositivo no registrado' });
    }

    const timestamp = new Date();

    await firestore.collection('mediciones').add({
      id_dispositivo,
      datos,
      timestamp
    });

    res.status(200).json({ mensaje: 'Datos guardados correctamente' });
  } catch (error) {
    console.error('Error al guardar datos:', error);
    res.status(500).json({ error: 'Error interno al guardar los datos' });
  }
});

module.exports = router;
