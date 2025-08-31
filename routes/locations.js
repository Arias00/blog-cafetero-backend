// backend/routes/locations.js
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationsController');
const adminMiddleware = require('../middleware/adminMiddleware'); // ¡Importamos el guardián!

// RUTA PÚBLICA: Para que el mapa pueda obtener las ubicaciones
router.get('/', locationController.getAllLocations);

// --- RUTAS DE ADMINISTRACIÓN (PROTEGIDAS) ---
router.post('/', adminMiddleware, locationController.createLocation);
router.put('/:id', adminMiddleware, locationController.updateLocation);
router.delete('/:id', adminMiddleware, locationController.deleteLocation);

module.exports = router;