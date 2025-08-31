// backend/controllers/commentController.js

const db = require('../models/db');

// =======================================================================
//   Obtiene comentarios APROBADOS para un artículo (para el frontend del blog)
// =======================================================================
exports.getCommentsForArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const offset = (page - 1) * limit;

    const countQuery = "SELECT COUNT(*) as total FROM comments WHERE id_article = ? AND status = 'approved'";
    const [countResult] = await db.query(countQuery, [articleId]);
    const totalComments = countResult[0].total;
    const totalPages = Math.ceil(totalComments / limit);

    const commentsQuery = `
      SELECT c.id, c.content, c.created_at, COALESCE(c.author_name, u.username) as author_name
      FROM comments c
      LEFT JOIN users u ON c.id_user = u.id
      WHERE c.id_article = ? AND c.status = 'approved'
      ORDER BY c.created_at DESC
      LIMIT ?
      OFFSET ?
    `;
    const [comments] = await db.query(commentsQuery, [articleId, limit, offset]);
    
    res.json({
      comments,
      pagination: {
        page,
        limit,
        totalComments,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error al obtener comentarios para el artículo (Público):", error);
    res.status(500).json({ message: 'Error en el servidor al obtener comentarios.' });
  }
};

// =======================================================================
//   Añadir un nuevo comentario a un artículo (desde el blog frontend, con usuario registrado)
// =======================================================================
exports.addComment = async (req, res) => {
  try {
    const { articleId } = req.params; // Asumo que el articleId viene de la URL
    const { content } = req.body;
    const userId = req.user.id; // Obtenido del token gracias al middleware

    if (!content) {
      return res.status(400).json({ message: 'El contenido del comentario no puede estar vacío.' });
    }

    // Usamos id_article para coincidir con la DB
    const query = 'INSERT INTO comments (content, id_article, id_user, status) VALUES (?, ?, ?, ?)';
    await db.query(query, [content, articleId, userId, 'pending']); // Estado inicial 'pending'

    res.status(201).json({ message: 'Comentario enviado. Estará visible una vez que sea aprobado.' });

  } catch (error) {
    console.error("Error al añadir comentario (Registrado):", error);
    res.status(500).json({ message: 'Error en el servidor al añadir el comentario.' });
  }
};

// =======================================================================
//   AÑADIR UN NUEVO COMENTARIO PÚBLICO (ANÓNIMO - desde el blog frontend)
// =======================================================================
exports.createPublicComment = async (req, res) => {
  try {
    const { articleId } = req.params; // Asumo que el articleId viene de la URL
    const { content, author_name, author_email } = req.body;

    if (!content || !author_name || !author_email) {
      return res.status(400).json({ message: 'Todos los campos de comentario son obligatorios (contenido, nombre, email).' });
    }

    // Usamos id_article para coincidir con la DB
    const query = 'INSERT INTO comments (content, id_article, author_name, author_email, status) VALUES (?, ?, ?, ?, ?)';
    await db.query(query, [content, articleId, author_name, author_email, 'pending']); // Estado inicial 'pending'

    res.status(201).json({ message: 'Comentario enviado. Estará visible una vez que sea aprobado.' });

  } catch (error) {
    console.error("Error al crear comentario público:", error);
    res.status(500).json({ message: 'Error en el servidor al añadir el comentario.' });
  }
};


// =======================================================================
//   ¡ACTUALIZADO! Obtiene TODOS los comentarios para el DASHBOARD (con filtrado por rol)
// =======================================================================
exports.getAllCommentsForDashboard = async (req, res) => {
    try {
        const userIdFromToken = req.user.id;
        const userRole = req.user.role;
        let query;
        let queryParams = [];

        // Base de la consulta, incluyendo el id_author del artículo
        const baseQuery = `
            SELECT 
                c.id, c.content, c.status, c.created_at, 
                COALESCE(c.author_name, u.username) as author_name, 
                a.title as article_title, 
                a.id_author as article_author_id  -- ¡CLAVE! ID del autor del artículo
            FROM comments c
            LEFT JOIN users u ON c.id_user = u.id
            JOIN articles a ON c.id_article = a.id  -- ¡CORREGIDO! Usamos c.id_article
        `;

        if (userRole === 'admin') {
            // Admin ve todos los comentarios
            query = `${baseQuery} ORDER BY c.created_at DESC`;
        } else if (userRole === 'editor') {
            // Editor ve solo los comentarios de SUS artículos
            query = `${baseQuery} WHERE a.id_author = ? ORDER BY c.created_at DESC`;
            queryParams.push(userIdFromToken);
        } else {
            return res.status(403).json({ message: 'Acceso denegado. Rol de usuario no válido.' });
        }

        const [comments] = await db.query(query, queryParams);
        res.status(200).json(comments);

    } catch (error) {
        console.error("Error al obtener comentarios para dashboard (filtrado por rol):", error);
        res.status(500).json({ message: 'Error en el servidor al obtener los comentarios.' });
    }
};

// =======================================================================
//   ¡ACTUALIZADO! Aprueba un comentario (con verificación de permisos)
// =======================================================================
exports.approveComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userIdFromToken = req.user.id;
        const userRole = req.user.role;

        // 1. Obtener el id_article del comentario (¡CORREGIDO!)
        const [commentResult] = await db.query('SELECT id_article FROM comments WHERE id = ?', [commentId]);
        if (commentResult.length === 0) {
            return res.status(404).json({ message: 'Comentario no encontrado.' });
        }
        const articleId = commentResult[0].id_article; // ¡CORREGIDO! Usamos id_article

        // 2. Obtener el autor del artículo
        const [articleResult] = await db.query('SELECT id_author FROM articles WHERE id = ?', [articleId]);
        if (articleResult.length === 0) {
            return res.status(404).json({ message: 'Artículo asociado al comentario no encontrado.' });
        }
        const articleAuthorId = articleResult[0].id_author;

        // 3. Lógica de autorización: Admin puede aprobar cualquiera, Editor solo los de sus artículos.
        if (userRole !== 'admin' && String(articleAuthorId) !== String(userIdFromToken)) {
            return res.status(403).json({ message: 'No tienes permiso para aprobar comentarios de este artículo.' });
        }

        // Si la autorización es exitosa, procedemos a aprobar
        await db.query("UPDATE comments SET status = 'approved' WHERE id = ?", [commentId]);
        res.status(200).json({ message: 'Comentario aprobado exitosamente.' });

    } catch (error) {
        console.error("Error al aprobar comentario (con auth):", error);
        res.status(500).json({ message: 'Error en el servidor al aprobar el comentario.' });
    }
};

// =======================================================================
//   ¡ACTUALIZADO! Elimina un comentario (con verificación de permisos)
// =======================================================================
exports.deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userIdFromToken = req.user.id;
        const userRole = req.user.role;

        // 1. Obtener el id_article del comentario (¡CORREGIDO!)
        const [commentResult] = await db.query('SELECT id_article FROM comments WHERE id = ?', [commentId]);
        if (commentResult.length === 0) {
            return res.status(404).json({ message: 'Comentario no encontrado.' });
        }
        const articleId = commentResult[0].id_article; // ¡CORREGIDO! Usamos id_article

        // 2. Obtener el autor del artículo
        const [articleResult] = await db.query('SELECT id_author FROM articles WHERE id = ?', [articleId]);
        if (articleResult.length === 0) {
            return res.status(404).json({ message: 'Artículo asociado al comentario no encontrado.' });
        }
        const articleAuthorId = articleResult[0].id_author;

        // 3. Lógica de autorización: Admin puede eliminar cualquiera, Editor solo los de sus artículos.
        if (userRole !== 'admin' && String(articleAuthorId) !== String(userIdFromToken)) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar comentarios de este artículo.' });
        }

        // Si la autorización es exitosa, procedemos a eliminar
        await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
        res.status(200).json({ message: 'Comentario eliminado exitosamente.' });

    } catch (error) {
        console.error("Error al eliminar comentario (con auth):", error);
        res.status(500).json({ message: 'Error en el servidor al eliminar el comentario.' });
    }
};