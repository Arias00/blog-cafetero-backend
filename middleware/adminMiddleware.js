// backend/middleware/adminMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Primero, usamos la misma lógica del authMiddleware para verificar el token.
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ message: 'No hay token, autorización denegada.' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    
    // --- AQUÍ LA NUEVA LÓGICA ---
    // Después de verificar el token, revisamos el rol del usuario.
    if (req.user.role !== 'admin') {
      // Si el rol no es 'admin', le denegamos el acceso con un error 403 Forbidden.
      return res.status(403).json({ message: 'Acceso denegado. No tienes permisos de administrador.' });
    }
    
    // Si es admin, le dejamos continuar.
    next();
  } catch (error) {
    res.status(401).json({ message: 'El token no es válido.' });
  }
};