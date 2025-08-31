// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta para obtener las estadísticas del dashboard.
// Solo usuarios autenticados pueden acceder.
router.get('/stats', authMiddleware, dashboardController.getStats);

module.exports = router;