// backend/routes/articles.js

const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const authMiddleware = require('../middleware/authMiddleware');

// =================================================================
//     EL ORDEN DE ESTAS RUTAS ES CRÍTICO PARA QUE EXPRESS FUNCIONE
// =================================================================

// --- 1. RUTAS PRIVADAS Y ESPECÍFICAS (ADMIN/EDITAR) ---
// Estas son las más específicas con rutas fijas o parámetros complejos, por lo que van primero.

// GET /api/articles/admin -> Para la tabla del dashboard (todos los artículos para admin)
router.get('/admin', authMiddleware, articleController.getAdminArticles);

// GET /api/articles/my-articles/:userId -> Para la tabla del dashboard (solo artículos del editor)
router.get('/my-articles/:userId', authMiddleware, articleController.getMyArticles);

// GET /api/articles/edit/:id -> Para obtener datos de un artículo para rellenar el editor.
router.get('/edit/:id', authMiddleware, articleController.getArticleById);


// --- 2. RUTAS PÚBLICAS ESPECÍFICAS ---

// GET /api/articles/public -> Para la lista pública con paginación (para el frontend público)
router.get('/public', articleController.getPublicArticles);


// --- 3. RUTAS DE ACCIÓN (CRUD) ---
// (Estas no suelen conflictuar por el método HTTP)

// POST /api/articles -> Para CREAR un nuevo artículo (requiere autenticación)
router.post('/', authMiddleware, articleController.createArticle);

// PUT /api/articles/:id -> Para ACTUALIZAR un artículo (requiere autenticación)
router.put('/:id', authMiddleware, articleController.updateArticle);

// DELETE /api/articles/:id -> Para ELIMINAR un artículo (requiere autenticación)
router.delete('/:id', authMiddleware, articleController.deleteArticle);

// POST /api/articles/:id/reaction -> Para registrar una reacción (puede ser pública o privada según tu lógica)
// Se mantiene como POST para reacciones
router.post('/:id/reaction', articleController.updateReaction);


// --- 4. RUTA PÚBLICA GENÉRICA (DEBE IR AL FINAL PARA RUTAS GET) ---

// GET /api/articles/:slug -> Para obtener un artículo por su slug (para la vista pública de un solo artículo)
// Esta es la más genérica con un solo parámetro, por lo que DEBE ser la última ruta GET.
router.get('/:slug', articleController.getArticleBySlug);


module.exports = router;