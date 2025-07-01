const express = require('express');
const router = express.Router();
const firestore = require('../firebase');
const validarApiKey = require('../middleware/validarApiKey');

router.post('/', validarApiKey, async (req, res) => {
  const { mediciones } = req.body;

  if (!Array.isArray(mediciones) || mediciones.length === 0) {
    return res.status(400).json({ error: 'Se esperaba una lista de mediciones' });
  }

  const resultados = [];

  for (const medicion of mediciones) {
    const { id_dispositivo, datos } = medicion;

    if (!id_dispositivo || typeof datos !== 'object') {
      resultados.push({ id_dispositivo, estado: 'error', motivo: 'Formato inválido' });
      continue;
    }

    try {
      const docRef = firestore.collection('dispositivos').doc(id_dispositivo);
      const doc = await docRef.get();

      if (!doc.exists) {
        resultados.push({ id_dispositivo, estado: 'error', motivo: 'Dispositivo no registrado' });
        continue;
      }

      // Limpieza de valores no numéricos
      const datosLimpios = {};
      for (const [clave, valor] of Object.entries(datos)) {
        const num = Number(valor);
        datosLimpios[clave] = Number.isFinite(num) ? num : 0;
      }

      await firestore.collection('mediciones').add({
        id_dispositivo,
        datos: datosLimpios,
        timestamp: new Date(),
        uid: req.id_usuario
      });


      resultados.push({ id_dispositivo, estado: 'ok' });
    } catch (error) {
      console.error(`Error al guardar medición para ${id_dispositivo}:`, error);
      resultados.push({ id_dispositivo, estado: 'error', motivo: 'Error interno' });
    }
  }
  console.log('Datos recibidos en /api/datos:', JSON.stringify(req.body, null, 2));

  return res.status(200).json({ mensaje: 'Procesamiento completo', resultados });
});

module.exports = router;
