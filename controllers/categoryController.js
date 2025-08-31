// backend/controllers/categoryController.js
const db = require('../models/db');

// Obtener artículos por el slug de una categoría
exports.getArticlesByCategorySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const query = `
            SELECT a.id, a.title, a.slug, a.created_at
            FROM articles a
            JOIN categories c ON a.id_categoria = c.id
            WHERE c.slug = ? AND a.status = 'published'
            ORDER BY a.created_at DESC
        `;
        const [articles] = await db.query(query, [slug]);
        res.json(articles);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};