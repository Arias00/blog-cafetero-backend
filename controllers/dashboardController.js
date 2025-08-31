// =================================================================
//          CONTROLADOR PARA FUNCIONES DEL DASHBOARD
// =================================================================

// 1. Importamos la conexión a la base de datos
const db = require('../models/db');

/**
 * Obtiene las estadísticas clave para el home del dashboard.
 * Realiza tres consultas concurrentes para contar los artículos publicados,
 * los comentarios totales y los usuarios registrados.
 */
exports.getStats = async (req, res) => {
  try {
    // 2. Ejecutamos todas las consultas de conteo en paralelo para máxima eficiencia.
    // Promise.all espera a que todas las promesas (consultas) se resuelvan.
    const [
      articleResults,
      commentResults,
      userResults
    ] = await Promise.all([
      db.query("SELECT COUNT(*) AS total FROM articles WHERE status = 'published'"),
      db.query("SELECT COUNT(*) AS total FROM comments"),
      db.query("SELECT COUNT(*) AS total FROM users")
    ]);

    // 3. Extraemos el resultado de forma segura de cada consulta.
    // El paquete `mysql2` devuelve un resultado como [rows, fields]. Nos interesa el array `rows` ([0]).
    // La consulta COUNT(*) siempre devuelve una fila, así que accedemos a esa primera fila `[0]`.
    // Finalmente, obtenemos el valor de la columna que nombramos 'total'.
    const stats = {
      articles: articleResults[0][0].total,
      comments: commentResults[0][0].total,
      users: userResults[0][0].total
    };
    
    // Log en el backend para confirmar en la terminal de Node.js qué estamos a punto de enviar.
    console.log("Enviando estadísticas al frontend:", stats);

    // 4. Enviamos la respuesta JSON al frontend con un código de estado 200 OK.
    res.json(stats);

  } catch (error) {
    // 5. Si algo falla durante el proceso (ej. un error en la base de datos),
    // lo capturamos, lo mostramos en la consola del backend y enviamos un error 500.
    console.error("¡ERROR GRAVE EN EL BACKEND AL OBTENER ESTADÍSTICAS!:", error);
    res.status(500).json({ message: "Error en el servidor al obtener las estadísticas." });
  }
};