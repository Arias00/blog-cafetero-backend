// backend/controllers/userController.js
const db = require('../models/db');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios (Admin Only)
exports.getAllUsers = async (req, res) => {
  try {
    // Nunca enviamos el hash de la contraseña al frontend
    const [users] = await db.query('SELECT id, username, email, role FROM users');
    res.json(users);
  } catch (error) { res.status(500).json({ message: 'Error en el servidor.' }); }
};

// Crear un nuevo usuario (Admin Only)
exports.createUser = async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await db.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, role]);
    res.status(201).json({ message: 'Usuario creado exitosamente.' });
  } catch (error) { res.status(500).json({ message: 'Error al crear el usuario.' }); }
};

// Actualizar el rol de un usuario (Admin Only)
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ message: 'Rol de usuario actualizado.' });
  } catch (error) { res.status(500).json({ message: 'Error al actualizar el rol.' }); }
};

// Eliminar un usuario (Admin Only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Usuario eliminado.' });
  } catch (error) { res.status(500).json({ message: 'Error al eliminar el usuario.' }); }
};