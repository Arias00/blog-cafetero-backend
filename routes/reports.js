// backend/routes/reports.js

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

// --- RUTA PÚBLICA ---
// GET /api/reports/latest -> Devuelve el último informe para el panel público
router.get('/latest', reportController.getLatestReport);

// --- RUTAS PRIVADAS (SOLO ADMINS) ---

// ¡NUEVO! GET /api/reports -> Obtiene todos los informes para el dashboard
// Asumo que solo los admins deberían ver todos los informes, por eso el authMiddleware
router.get('/', authMiddleware, reportController.getAllReports);

// POST /api/reports -> Guarda un nuevo informe desde el dashboard
router.post('/', authMiddleware, reportController.createReport);

// ¡NUEVO! DELETE /api/reports/:id -> Elimina un informe específico
router.delete('/:id', authMiddleware, reportController.deleteReport);

module.exports = router;