// backend/routes/categories.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Ruta pública para obtener artículos de una categoría específica
router.get('/:slug/articles', categoryController.getArticlesByCategorySlug);

module.exports = router;