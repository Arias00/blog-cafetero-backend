// backend/controllers/locationController.js
const db = require('../models/db');

// Obtener todas las ubicaciones
exports.getAllLocations = async (req, res) => {
  try {
    const [locations] = await db.query('SELECT * FROM locations');
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};

// --- FUNCIONES DE ADMINISTRACIÓN ---

// Crear una nueva ubicación (Admin Only)
exports.createLocation = async (req, res) => {
    const { name, type, description, latitude, longitude, image_url } = req.body;
    if (!name || !type || !latitude || !longitude) {
        return res.status(400).json({ message: 'Nombre, tipo y coordenadas son obligatorios.' });
    }
    try {
        await db.query(
            'INSERT INTO locations (name, type, description, latitude, longitude, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, type, description, latitude, longitude, image_url]
        );
        res.status(201).json({ message: 'Ubicación creada exitosamente.' });
    } catch (error) { res.status(500).json({ message: 'Error en el servidor.' }); }
};

// Actualizar una ubicación (Admin Only)
exports.updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, description, latitude, longitude, image_url } = req.body;
        await db.query(
            'UPDATE locations SET name = ?, type = ?, description = ?, latitude = ?, longitude = ?, image_url = ? WHERE id = ?',
            [name, type, description, latitude, longitude, image_url, id]
        );
        res.json({ message: 'Ubicación actualizada.' });
    } catch (error) { res.status(500).json({ message: 'Error en el servidor.' }); }
};

// Eliminar una ubicación (Admin Only)
exports.deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM locations WHERE id = ?', [id]);
        res.json({ message: 'Ubicación eliminada.' });
    } catch (error) { res.status(500).json({ message: 'Error en el servidor.' }); }
};