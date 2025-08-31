// =================================================================
//                      CONEXIÓN A LA BASE DE DATOS MYSQL
// =================================================================

const mysql = require('mysql2/promise'); // Usamos la versión de promesas para async/await

// Obtener las variables de entorno para la conexión a la base de datos
// Render te permitirá configurar estas variables en su panel.
const dbConfig = {
  host: process.env.DB_HOST,         // Ej: 'us-east.connect.psdb.cloud' o 'localhost'
  user: process.env.DB_USER,         // Ej: 'admin'
  password: process.env.DB_PASSWORD, // Ej: 'miContraseñaSegura'
  database: process.env.DB_DATABASE, // Ej: 'blog_cafetero_db'
  port: process.env.DB_PORT || 3306, // Puerto de MySQL, Render a veces lo especifica, si no, 3306
  ssl: process.env.DB_SSL ? JSON.parse(process.env.DB_SSL) : undefined // Para conexiones SSL/TLS si tu DB lo requiere (ej. PlanetScale, AWS RDS)
};

// Crear un pool de conexiones para manejar múltiples solicitudes de manera eficiente
let pool;

async function connectToDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    // Intentar una conexión para verificar que las credenciales son correctas
    const connection = await pool.getConnection();
    console.log('🎉 Conectado exitosamente a la base de datos MySQL 🎉');
    connection.release(); // Liberar la conexión de vuelta al pool
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos MySQL:', error.message);
    // Puedes decidir si la aplicación debe salir o intentar reconectar
    // process.exit(1); // Descomenta esta línea si quieres que la aplicación falle al no poder conectar
  }
}

connectToDatabase();

// Exportar el pool de conexiones para que otros módulos puedan usarlo
module.exports = {
  getPool: () => pool // Función para obtener el pool de conexiones
};

/*
// Si usas Sequelize, tu models/db.js podría verse así:
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false, // Desactiva el log de Sequelize si no lo necesitas
        dialectOptions: {
            ssl: process.env.DB_SSL ? {
                require: true,
                rejectUnauthorized: false // Puede ser necesario para algunos proveedores de DB
            } : undefined
        }
    }
);

async function connectToDatabase() {
    try {
        await sequelize.authenticate();
        console.log('🎉 Conectado exitosamente a la base de datos MySQL con Sequelize 🎉');
        // Si tienes modelos y quieres sincronizarlos
        // await sequelize.sync({ force: false }); 
    } catch (error) {
        console.error('❌ Error al conectar a la base de datos MySQL con Sequelize:', error.message);
        // process.exit(1);
    }
}

connectToDatabase();

module.exports = sequelize;
*/