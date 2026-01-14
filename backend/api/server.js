/*
 * =================================================================
 * SERVIDOR API (Conectado a PostgreSQL)
 * =================================================================
 *
 * Estructura modularizada:
 * - server.js: (Este archivo) Configuración de Express y arranque.
 * - controllers.js: Lógica de negocio y consultas a la BD.
 * - routes/: Rutas modulares unidas por 'index.js'.
 * - middleware/upload.js: Configuración de Multer.
 * - utils/helpers.js: Funciones de ayuda (ej. formatCurrency).
 *
 * Para ejecutar:
 * 1. node server.js
 * =================================================================
 */

const path = require('path');
const dotenv = require('dotenv');

// Cargar configuración según el entorno
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile), override: true }); // FORCE OVERRIDE

// Validar conexión DB2 al inicio
console.log(`[SERVER-INIT] DB_HOST: ${process.env.DB_HOST} | DB2_HOST: ${process.env.DB2_HOST}`);
console.log(`[SERVER-INIT] DB_DATABASE: ${process.env.DB_DATABASE} | DB2_DATABASE: ${process.env.DB2_DATABASE}`);
const express = require('express');
const cors = require('cors');
// const path = require('path'); // Removed duplicate
const mainRoutes = require('./routes/index'); // (NUEVO) Importar el enrutador principal
const helmet = require('helmet');
const compression = require('compression'); // (OPTIMIZACIÓN) Importar compresión
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

// Usar Helmet para securizar la app
app.use(helmet());

// (OPTIMIZACIÓN) Habilitar compresión Gzip para todas las respuestas HTTP
// (OPTIMIZACIÓN) Habilitar compresión Gzip para todas las respuestas HTTP
app.use(compression());

// DEBUG LOGGER - Verify requests reach the server
app.use((req, res, next) => {
  console.log(`[SERVER-HIT] ${req.method} ${req.originalUrl} at ${new Date().toISOString()}`);
  next();
});

const PORT = process.env.PORT || 3001;

// --- Configuración ---
// (NUEVO) Opciones de CORS para mayor seguridad
const corsOptions = {
  origin: (origin, callback) => {
    // Lista de dominios permitidos
    const allowedOrigins = [
      'http://localhost:5173', // Desarrollo Frontend
      'http://localhost:5174', // Desarrollo Frontend (alternativo)
      'https://midashboard.com', // Producción Frontend
      'https://espint.pintureriasmercurio.com.ar', // (NUEVO) Frontend en Vercel
    ];

    // Permitir si el origen está en la lista o si no hay origen (peticiones de la misma máquina o Postman)
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  optionsSuccessStatus: 200, // Para compatibilidad con navegadores antiguos
};

app.use(cors(corsOptions));
app.use(express.json());

// (NUEVO) Servir archivos estáticos (para los comprobantes subidos)
// Si 'uploads' está en 'backend/api/uploads'
// (OPTIMIZACIÓN) Agregar caché de navegador para archivos estáticos (1 día)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  immutable: true
}));

// =================================================================
// --- ENDPOINTS DE LA API ---
// =================================================================
// (NUEVO) Monta todas las rutas definidas en routes.js bajo el prefijo /api
app.use('/api', mainRoutes);

// (NUEVO) Documentación Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// (NUEVO) Inicializar el programador de tareas (Cron Jobs)
const { initScheduler } = require('./services/schedulerService');
initScheduler();

// (NUEVO) Manejo de rutas no encontradas (404)
app.all('*splat', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// (NUEVO) Middleware Global de Manejo de Errores
app.use(globalErrorHandler);

const logger = require('./utils/logger'); // (NUEVO) Importar logger

// ... (rest of imports)

// --- Iniciar el servidor ---
app.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`   Servidor API (Conectado a PostgreSQL)`);
  logger.info(`   Modo: ${process.env.NODE_ENV || 'default'}`);
  logger.info(`   Escuchando en http://localhost:${PORT}`);
  logger.info(`=======================================================`);
});