// backend/routes/auth.js

const express = require('express');
const router = express.Router();

// Importamos el controlador que tendrá la lógica
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
// --- Definición de Rutas de Autenticación ---

// Ruta para registrar un nuevo usuario
// Cuando llegue una petición POST a /api/auth/register, se ejecutará la función 'register' del controlador.
router.post('/register', authController.register);

// Ruta para iniciar sesión
// Cuando llegue una petición POST a /api/auth/login, se ejecutará la función 'login' del controlador.
router.post('/login', authController.login);

// --- RUTA PARA ESTADÍSTICAS ---
// GET /api/auth/stats
router.get('/stats', authMiddleware, authController.getStats);


// Exportamos el enrutador para que pueda ser usado en app.js
module.exports = router;