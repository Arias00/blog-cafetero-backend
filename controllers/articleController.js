// =================================================================
//                 CONTROLADOR DE LÓGICA DE ARTÍCULOS
// =================================================================

const db = require('../models/db');
const axios = require('axios'); 
const cheerio = require('cheerio');
const puppeteer = require('puppeteer'); 

// --- OPERACIONES CRUD (Create, Read, Update, Delete) ---

/**
 * @description Crea un nuevo artículo en la base de datos.
 * @route POST /api/articles
 * @access Private
 */
exports.createArticle = async (req, res) => {
  const { title, content, status } = req.body;
  const id_author = req.user.id;

  if (!title || !content) {
    return res.status(400).json({ message: 'El título y el contenido son obligatorios.' });
  }

  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');

  try {
    await db.query(
      'INSERT INTO articles (title, slug, content, id_author, status) VALUES (?, ?, ?, ?, ?)',
      [title, slug, content, id_author, status || 'draft']
    );
    res.status(201).json({ message: 'Artículo creado exitosamente.' });
  } catch (error) {
    console.error("Error al crear el artículo: ", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un artículo con un título muy similar. Por favor, modifícalo.' });
    }
    res.status(500).json({ message: 'Error en el servidor al crear el artículo.' });
  }
};

/**
 * @description Obtiene una lista de artículos públicos (publicados).
 * Admite paginación y ordenamiento, con un manejo robusto para orden aleatorio.
 * @route GET /api/articles/public
 * @access Public
 */
exports.getPublicArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'recent'; 
    const seed = req.query.seed ? parseInt(req.query.seed) : null; 
    const orderedIds = req.query.orderedIds ? req.query.orderedIds.split(',').map(Number) : null; // ¡NUEVO! Recibe IDs ya ordenados

    let orderByClause = '';
    let articles = [];
    let totalArticles = 0;

    // --- 1. Obtener el total de artículos publicados ---
    const countQuery = "SELECT COUNT(*) as total FROM articles WHERE status = 'published'";
    const [totalResult] = await db.query(countQuery);
    totalArticles = totalResult[0].total;
    const totalPages = Math.ceil(totalArticles / limit);

    // --- 2. Lógica de ordenamiento ---
    if (sort === 'random' && !orderedIds) {
        // Si es la primera vez que se pide aleatorio, obtenemos TODOS los IDs y los ordenamos aleatoriamente
        const randomSeedToUse = seed !== null ? seed : Math.floor(Math.random() * 1000000);
        const [allIdsResult] = await db.query(
            `SELECT id FROM articles WHERE status = 'published' ORDER BY RAND(${randomSeedToUse})`
        );
        const allRandomIds = allIdsResult.map(row => row.id);
        
        // Enviamos los IDs ordenados al frontend para que los reutilice en futuras peticiones de paginación
        // y para obtener la página actual de esos IDs
        const paginatedIds = allRandomIds.slice(offset, offset + limit);

        if (paginatedIds.length > 0) {
            const placeholders = paginatedIds.map(() => '?').join(',');
            const findArticlesQuery = `
                SELECT 
                    a.id, a.title, a.slug, a.featured_image_url, a.content, a.created_at, 
                    u.username as author_name 
                FROM articles a
                JOIN users u ON a.id_author = u.id 
                WHERE a.id IN (${placeholders})
                ORDER BY FIELD(a.id, ${placeholders}) -- ¡Mantiene el orden original de los IDs!
            `;
            [articles] = await db.query(findArticlesQuery, [...paginatedIds, ...paginatedIds]);
        }
        
        // El frontend necesita los IDs aleatorios completos para la paginación
        res.status(200).json({
            featuredArticle: null, // No featuredArticle para random, o lo obtienes aparte
            articles: articles.map(article => ({
                ...article,
                excerpt: article.content.replace(/<[^>]+>/g, '').substring(0, 100),
                content: undefined
            })),
            totalPages,
            currentPage: page,
            allRandomIds: allRandomIds.join(',') // ¡NUEVO! Envía todos los IDs ordenados para el frontend
        });
        return; // Salir de la función aquí para la lógica de random
        
    } else if (sort === 'random' && orderedIds) {
        // Si el frontend ya nos envió los IDs ordenados, solo paginamos sobre ellos
        const paginatedIds = orderedIds.slice(offset, offset + limit);

        if (paginatedIds.length > 0) {
            const placeholders = paginatedIds.map(() => '?').join(',');
            const findArticlesQuery = `
                SELECT 
                    a.id, a.title, a.slug, a.featured_image_url, a.content, a.created_at, 
                    u.username as author_name 
                FROM articles a
                JOIN users u ON a.id_author = u.id 
                WHERE a.id IN (${placeholders})
                ORDER BY FIELD(a.id, ${placeholders}) -- ¡Mantiene el orden original de los IDs!
            `;
            [articles] = await db.query(findArticlesQuery, [...paginatedIds, ...paginatedIds]);
        }
    } else {
        // --- Ordenamiento no aleatorio (recent/oldest) ---
        switch (sort) {
            case 'oldest':
                orderByClause = 'ORDER BY a.created_at ASC';
                break;
            case 'recent': // Por defecto
            default:
                orderByClause = 'ORDER BY a.created_at DESC';
                break;
        }
        const articlesQuery = `
            SELECT 
                a.id, a.title, a.slug, a.featured_image_url, a.content, a.created_at, 
                u.username as author_name 
            FROM articles a
            JOIN users u ON a.id_author = u.id 
            WHERE a.status = 'published' 
            ${orderByClause}  
            LIMIT ? OFFSET ?`;
        [articles] = await db.query(articlesQuery, [limit, offset]);
    }

    // --- Obtener el artículo más reciente para la sección Hero (siempre el más reciente) ---
    // No queremos que el random afecte el hero, el hero siempre es el más reciente de los publicados
    let featuredArticle = null;
    if (page === 1) { // Solo buscar featured si es la primera página
        const featuredQuery = `
            SELECT id, title, slug, content, featured_image_url, created_at
            FROM articles 
            WHERE status = 'published' 
            ORDER BY created_at DESC 
            LIMIT 1`;
        const [featuredResult] = await db.query(featuredQuery);
        featuredArticle = featuredResult[0] || null;

        if (featuredArticle) {
            const textOnly = featuredArticle.content.replace(/<[^>]+>/g, '');
            featuredArticle.excerpt = textOnly.substring(0, 150);
            delete featuredArticle.content; 
        }
    }

    // 6. Generar excerpts para los artículos de la lista.
    const articlesWithExcerpts = articles.map(article => {
      const textOnly = article.content.replace(/<[^>]+>/g, '');
      const excerpt = textOnly.substring(0, 100); 
      return { ...article, excerpt, content: undefined };
    });

    // 7. Enviar la respuesta JSON.
    res.status(200).json({
      featuredArticle,
      articles: articlesWithExcerpts,
      totalPages,
      currentPage: page
    });

  } catch (error) {
    console.error("Error al obtener artículos públicos:", error);
    res.status(500).json({ message: 'Error en el servidor al obtener los artículos.' });
  }
};

/**
 * @description Obtiene una lista de artículos para la administración.
 * @route GET /api/articles/admin
 * @access Private (Admin)
 */
exports.getAdminArticles = async (req, res) => {
    try {
      // Esta consulta SIEMPRE devuelve TODOS los artículos, sin importar su estado.
      const query = `
        SELECT articles.id, articles.title, articles.status, articles.created_at, users.username as author_name 
        FROM articles 
        JOIN users ON articles.id_author = users.id 
        ORDER BY articles.created_at DESC
      `;
      const [articles] = await db.query(query);
      res.json(articles);
    } catch (error) {
      console.error("Error al obtener artículos para admin: ", error);
      res.status(500).json({ message: 'Error en el servidor al obtener los artículos.' });
    }
  };

/**
 * @description Obtiene los artículos de un usuario específico.
 * @route GET /api/articles/user/:userId
 * @access Private (Author/Admin)
 */
exports.getMyArticles = async (req, res) => {
    try {
        const userId = req.params.userId; 
        const userIdFromToken = req.user.id; 
        const userRole = req.user.role;      

        if (String(userId) !== String(userIdFromToken) && userRole !== 'admin') {
            return res.status(403).json({ message: 'No tienes permiso para ver los artículos de otro usuario.' });
        }

        const query = `
            SELECT articles.id, articles.title, articles.status, articles.created_at, articles.id_author, users.username as author_name 
            FROM articles 
            JOIN users u ON articles.id_author = u.id 
            WHERE articles.id_author = ?
            ORDER BY articles.created_at DESC
        `;
        const [articles] = await db.query(query, [userId]);
        res.json(articles);
    } catch (error) {
        console.error("Error al obtener mis artículos: ", error);
        res.status(500).json({ message: 'Error en el servidor al obtener los artículos.' });
    }
};

/**
 * @description Obtiene los detalles completos de un solo artículo para la vista pública.
 * @route GET /api/articles/:slug
 * @access Public
 */
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const sqlQuery = `
      SELECT 
        a.id, 
        a.title, 
        a.slug, 
        a.content, 
        a.featured_image_url, 
        a.status, 
        a.created_at, 
        u.username as author_name,
        a.reactions  
      FROM articles a
      JOIN users u ON a.id_author = u.id
      WHERE a.slug = ? AND a.status = 'published'
    `;
    const [articles] = await db.query(sqlQuery, [slug]);

    if (articles.length === 0) {
      return res.status(404).json({ message: 'Artículo no encontrado o no está publicado.' });
    }

    const article = articles[0];

    // --- PROCESAR LA COLUMNA 'reactions' ---
    let articleReactions = article.reactions;

    // MySQL Connector/Node.js debería parsear automáticamente JSON,
    // pero si no lo hace, esta parte lo asegura.
    if (typeof articleReactions === 'string') {
        try {
            articleReactions = JSON.parse(articleReactions);
        } catch (parseError) {
            console.error("Error al parsear JSON de reacciones para el artículo:", article.id, parseError);
            articleReactions = null; 
        }
    }
    
    // Asegurarse de que 'reactions' siempre sea un objeto con los conteos por defecto
    const safeReactions = { 
        like: 0, 
        love: 0, 
        wow: 0, 
        proud: 0,
        ...(articleReactions || {}) 
    };

    // --- ENVIAR LA RESPUESTA AL FRONTEND ---
    res.status(200).json({
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        featured_image_url: article.featured_image_url,
        status: article.status,
        created_at: article.created_at,
        author_name: article.author_name,
        reactions: safeReactions, 
    });

  } catch (error) {
    console.error("Error al obtener el artículo por slug: ", error);
    res.status(500).json({ message: 'Error en el servidor al obtener el artículo.' });
  }
};

/**
 * @description Crea un nuevo artículo en la base de datos.
 * @route POST /api/articles
 * @access Private
 */
// Ya tienes esta función al principio, no la duplicamos.

/**
 * @description Actualiza un artículo existente de forma dinámica.
 * @route PUT /api/articles/:id
 * @access Private
 */
exports.updateArticle = async (req, res) => {
  try {
    const articleId = req.params.id;
    const { id: userId, role: userRole } = req.user; 

    const [existingArticles] = await db.query('SELECT id_author FROM articles WHERE id = ?', [articleId]);

    if (existingArticles.length === 0) {
      return res.status(404).json({ message: 'Artículo no encontrado.' });
    }
    
    const authorId = existingArticles[0].id_author;

    if (authorId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Acción no autorizada. No eres el autor ni un administrador.' });
    }

    const { title, content, status, featured_image_url } = req.body;
    const fieldsToUpdate = [];
    const values = [];

    if (title) {
      fieldsToUpdate.push('title = ?');
      values.push(title);
      fieldsToUpdate.push('slug = ?');
      values.push(title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-'));
    }
    if (content) {
      fieldsToUpdate.push('content = ?');
      values.push(content);
    }
    if (status) {
      fieldsToUpdate.push('status = ?');
      values.push(status);
    }

    if (featured_image_url !== undefined) { 
      fieldsToUpdate.push('featured_image_url = ?');
      values.push(featured_image_url);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
    }

    const query = `UPDATE articles SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    values.push(articleId);

    await db.query(query, values);
    res.json({ message: 'Artículo actualizado exitosamente.' });
  } catch (error) {
    console.error("Error al actualizar el artículo: ", error);
    res.status(500).json({ message: 'Error en el servidor al actualizar el artículo.' });
  }
};

/**
 * @description Elimina un artículo de la base de datos.
 * @route DELETE /api/articles/:id
 * @access Private
 */
exports.deleteArticle = async (req, res) => {
  try {
    const articleId = req.params.id;
    const userIdFromToken = req.user.id;
    const userRole = req.user.role;

    const [articles] = await db.query('SELECT id_author FROM articles WHERE id = ?', [articleId]);
    if (articles.length === 0) {
      return res.status(404).json({ message: 'Artículo no encontrado.' });
    }
    
    const authorId = articles[0].id_author;

    if (String(authorId) !== String(userIdFromToken) && userRole !== 'admin') {
      return res.status(403).json({ message: 'Acción no autorizada. No eres el autor ni un administrador.' });
    }

    await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
    res.json({ message: 'Artículo eliminado exitosamente.' });
  } catch (error) {
    console.error("Error al eliminar el artículo: ", error);
    res.status(500).json({ message: 'Error en el servidor al eliminar el artículo.' });
  }
};


// --- FUNCIONES AUXILIARES ---

/**
 * @description Obtiene los datos de un artículo por su ID para rellenar el editor.
 * @route GET /api/articles/edit/:id
 * @access Private
 */
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role: userRole } = req.user; 

    const [articles] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);

    if (articles.length === 0) {
      return res.status(404).json({ message: 'Artículo no encontrado.' });
    }

    const authorId = articles[0].id_author;

    if (authorId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Acción no autorizada para ver este borrador o editar.' });
    }

    res.json(articles[0]);
  } catch (error) {
    console.error("Error al obtener artículo por ID:", error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};

// Función para añadir una reacción a un artículo
exports.updateReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { newReaction, oldReaction } = req.body; 

    const allowedReactions = ['like', 'love', 'wow', 'proud'];
    if (!allowedReactions.includes(newReaction) && newReaction !== null) { // newReaction puede ser null al quitar la última reacción
      return res.status(400).json({ message: 'Tipo de reacción no válido.' });
    }
    
    let updates = [];

    // Si hay una nueva reacción y es diferente a la antigua (o no había antigua)
    if (newReaction && newReaction !== oldReaction) {
        updates.push(
            `reactions = JSON_SET(COALESCE(reactions, '{}'), '$.${newReaction}', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(reactions, '$.${newReaction}')), 0) + 1)`
        );
    }
    
    // Si había una reacción anterior que es diferente a la nueva
    if (oldReaction && oldReaction !== newReaction && allowedReactions.includes(oldReaction)) {
      updates.push(
        `reactions = JSON_SET(COALESCE(reactions, '{}'), '$.${oldReaction}', GREATEST(0, COALESCE(JSON_UNQUOTE(JSON_EXTRACT(reactions, '$.${oldReaction}')), 0) - 1))`
      );
    } 
    // Si la nueva reacción es null (se está quitando la última reacción)
    else if (newReaction === null && oldReaction && allowedReactions.includes(oldReaction)) {
         updates.push(
            `reactions = JSON_SET(COALESCE(reactions, '{}'), '$.${oldReaction}', GREATEST(0, COALESCE(JSON_UNQUOTE(JSON_EXTRACT(reactions, '$.${oldReaction}')), 0) - 1))`
        );
    }


    if (updates.length === 0) {
        // No hay cambios reales en las reacciones si el mismo botón se presionó para desmarcar
        // o si newReaction es null y oldReaction también es null (lo cual no debería ocurrir)
        const [currentReactions] = await db.query('SELECT reactions FROM articles WHERE id = ?', [id]);
        return res.status(200).json(currentReactions[0].reactions || {});
    }
    
    const query = `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`;

    await db.query(query, [id]);

    const [updatedArticle] = await db.query('SELECT reactions FROM articles WHERE id = ?', [id]);
    res.status(200).json(updatedArticle[0].reactions || {}); // Asegurar que siempre se envíe un objeto
  } catch (error) {
    console.error("Error al actualizar reacción:", error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};