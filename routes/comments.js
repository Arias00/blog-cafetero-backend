// backend/routes/comments.js

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware para proteger rutas

// =================================================================
//     EL ORDEN DE ESTAS RUTAS ES CRÍTICO PARA QUE EXPRESS FUNCIONE
// =================================================================

// --- 1. RUTAS PRIVADAS Y ESPECÍFICAS DEL DASHBOARD (GET, PUT, DELETE) ---
// Estas son las más específicas o las rutas principales para el dashboard, van primero.

// RUTA PRIVADA: para obtener TODOS los comentarios para el dashboard (filtrado por rol en el controlador).
// URL Final: GET /api/comments/
router.get('/', authMiddleware, commentController.getAllCommentsForDashboard);

// RUTA PRIVADA: para aprobar un comentario.
// URL Final: PUT /api/comments/:id/approve (Usamos :id para consistencia con req.params.id en el controller)
router.put('/:id/approve', authMiddleware, commentController.approveComment);

// RUTA PRIVADA: para eliminar un comentario.
// URL Final: DELETE /api/comments/:id (Usamos :id para consistencia con req.params.id en el controller)
router.delete('/:id', authMiddleware, commentController.deleteComment);


// --- 2. RUTAS PÚBLICAS Y DE AUTENTICACIÓN (para el frontend del blog) ---
// Estas rutas gestionan comentarios desde la parte pública del blog o por usuarios registrados.

// RUTA PÚBLICA: para obtener los comentarios APROBADOS de un artículo específico.
// URL Final: GET /api/comments/article/:articleId
router.get('/article/:articleId', commentController.getCommentsForArticle);

// RUTA PRIVADA: para añadir un nuevo comentario (por un usuario registrado).
// URL Final: POST /api/comments/article/:articleId
router.post('/article/:articleId', authMiddleware, commentController.addComment);

// RUTA PÚBLICA: para que CUALQUIERA (incluso no registrados) pueda añadir un comentario.
// URL Final: POST /api/comments/public/article/:articleId
router.post('/public/article/:articleId', commentController.createPublicComment);


module.exports = router;