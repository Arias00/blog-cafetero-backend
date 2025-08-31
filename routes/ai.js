// backend/routes/ai.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Esta ruta no necesita middleware de autenticación, es pública
router.post('/chat', aiController.chatWithAI);

module.exports = router;