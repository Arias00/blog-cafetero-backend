// =================================================================
//                      ARCHIVO PRINCIPAL DEL BACKEND
// =================================================================

// --- 1. IMPORTACIÓN DE MÓDULOS ---
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables de entorno de .env

// --- 2. CONEXIÓN A LA BASE DE DATOS ---
// NOTA: Esta línea ahora gestionará la conexión a MySQL usando variables de entorno.
require('./models/db'); 

// --- 3. IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const commentRoutes = require('./routes/comments');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const locationRoutes = require('./routes/locations');
const reportsRoutes = require('./routes/reports');

// --- 4. INICIALIZACIÓN DE EXPRESS ---
const app = express();

// --- 5. MIDDLEWARES ESENCIALES ---

// Configuración de CORS
// ¡IMPORTANTE! Reemplaza 'https://tu-dominio-en-hostinger.com'
// con el dominio REAL de tu frontend que está alojado en Hostinger.
// Si tu frontend tiene varios subdominios que necesitan acceder, puedes
// usar un array: ['https://www.tudominio.com', 'https://sub.tudominio.com']
const corsOptions = {
  origin: 'https://tu-dominio-en-hostinger.com', // <--- ¡CAMBIA ESTO!
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
  credentials: true // Permite enviar cookies/encabezados de autorización (si los usas)
};
app.use(cors(corsOptions)); // Aplica el middleware CORS con tus opciones

app.use(express.json({ limit: '50mb' })); // Para parsear JSON en el cuerpo de la solicitud
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Para parsear datos de formularios

// --- 6. CONEXIÓN DE LAS RUTAS A LA APLICACIÓN ---
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/reports', reportsRoutes);

// --- 7. RUTA RAÍZ DE PRUEBA ---
app.get('/api', (req, res) => {
  res.json({ message: '¡La API del Blog Cafetero funciona correctamente!' });
});

// --- 8. INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000; // Render proveerá el puerto en `process.env.PORT`
app.listen(PORT, () => {
  console.log(`Servidor Node.js corriendo y escuchando en el puerto ${PORT}`);
});