// backend/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const adminMiddleware = require('../middleware/adminMiddleware');

// Aplicamos el middleware de admin a TODAS las rutas de este archivo
router.use(adminMiddleware);

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUserRole);
router.delete('/:id', userController.deleteUser);

module.exports = router;