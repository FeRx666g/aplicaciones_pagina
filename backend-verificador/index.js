const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
    credential: admin.credential.cert(require('./firebase-service-account.json')),
});

const db = admin.firestore();

// Middleware para validar token Firebase
const verificarToken = async (req, res, next) => {
    // Verificar si el token está presente en los headers
    const authHeader = req.headers.authorization;
    // Si no hay token o no es del tipo Bearer, retornar un error 401
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Extraer el token del header
    const token = authHeader.split('Bearer ')[1];
    
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.uid = decoded.uid;
        next();
    } 
    // Manejo de errores al verificar el token
    catch (error) {
        console.error('Token inválido:', error);
        res.status(403).json({ error: 'Token inválido' });
    }
};

let verificacionActiva = true;

// Ruta para activar/desactivar la verificación
app.post('/configurar-verificador', (req, res) => {
    const { comando } = req.body;
    // Validar el comando
    if (comando === 'activar') verificacionActiva = true;
    else if (comando === 'desactivar') verificacionActiva = false;
    // Si el comando no es válido, retornar un error
    else return res.status(400).json({ mensaje: 'Comando no válido' });
    // Retornar el estado actual de la verificación
    res.json({ mensaje: `Verificación ${verificacionActiva ? 'activada' : 'desactivada'}` });
});


// Ruta protegida: devuelve el rol
app.get('/verificar-rol', verificarToken, async (req, res) => {
    // Verificar si la verificación está activa
    if (!verificacionActiva) {
        return res.status(503).json({ error: 'Verificación desactivada temporalmente' });
    }
    // Consultar Firestore para obtener el rol del usuario
    try {
        // Verificar si el UID está presente en la solicitud
        const doc = await db.collection('usuarios').doc(req.uid).get();
        // Registro del user-agent
        const userAgent = req.headers['user-agent'] || 'desconocido';

        // Si el documento no existe, retornar un error 404
        if (!doc.exists) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        // Si el documento existe, obtener los datos
        const datos = doc.data();
        // Recolleción de la IP del cliente
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

        // Guardar auditoría en nueva colección
        await db.collection('auditoria_roles').add({
            uid: req.uid,
            email: datos.email || null,
            rol: datos.rol,
            ip,
            userAgent,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ rol: datos.rol });
    }
    // Manejo de errores al consultar Firestore
    catch (error) {
        console.error('Error al consultar Firestore:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor backend-verificador escuchando en puerto ${PORT}`);
});
