// backend/controllers/authController.js

const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ===================================
// FUNCIÓN PARA REGISTRAR UN USUARIO
// ===================================
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Por favor, ingrese todos los campos.' });
  }

  try {
    const [existingUser] = await db.query('SELECT email FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'El email o nombre de usuario ya está en uso.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    res.status(201).json({ message: 'Usuario registrado exitosamente.' });
  } catch (error) {
    console.error("Error en el registro: ", error);
    res.status(500).json({ message: 'Error en el servidor al registrar el usuario.' });
  }
};

// ===================================
// FUNCIÓN PARA INICIAR SESIÓN
// ===================================
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, ingrese email y contraseña.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;

        res.json({ 
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
      }
    );
  } catch (error) {
    console.error("Error en el login: ", error);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión.' });
  }
};

// ====================================================================
// FUNCIÓN PARA OBTENER ESTADÍSTICAS DEL DASHBOARD (VERSIÓN CORREGIDA)
// ====================================================================
exports.getStats = async (req, res) => {
  try {
    // 1. Ejecutamos las consultas en paralelo
    const [
      articleResult,
      commentResult,
      userResult
    ] = await Promise.all([
      db.query("SELECT COUNT(*) as total FROM articles WHERE status = 'published'"),
      db.query("SELECT COUNT(*) as total FROM comments"),
      db.query("SELECT COUNT(*) as total FROM users")
    ]);

    // 2. CORRECCIÓN CLAVE: Extraemos el valor correctamente de la respuesta de la DB.
    // La estructura de la respuesta es un array con los resultados y otro con los campos: [ [ { total: N } ], [ ...fields ] ]
    // Por eso accedemos al primer elemento del array de resultados [0],
    // luego al primer (y único) objeto de esa lista [0], y finalmente a su propiedad 'total'.
    const stats = {
      articles: articleResult[0][0].total,
      comments: commentResult[0][0].total,
      users: userResult[0][0].total
    };
    
    // 3. Enviamos el objeto de estadísticas ya construido y correcto
    res.json(stats);

  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({ message: "Error en el servidor al obtener las estadísticas." });
  }
};