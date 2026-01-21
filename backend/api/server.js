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
dotenv.config({ path: path.resolve(__dirname, envFile) }); // Do not force override so Docker envs work

// (SEGURIDAD) Validar Variables de Entorno
const validateEnv = require('./config/envValidator');
validateEnv();

// Validar conexión DB2 al inicio
console.log(`[SERVER-INIT] DB_HOST: ${process.env.DB_HOST} | DB2_HOST: ${process.env.DB2_HOST}`);
console.log(`[SERVER-INIT] DB_DATABASE: ${process.env.DB_DATABASE} | DB2_DATABASE: ${process.env.DB2_DATABASE}`);
const express = require('express');
const cors = require('cors');
// const path = require('path'); // Removed duplicate
const mainRoutes = require('./routes/index'); // (NUEVO) Importar el enrutador principal
const helmet = require('helmet');
const compression = require('compression'); // (OPTIMIZACIÓN) Importar compresión
const rateLimit = require('express-rate-limit'); // (SEGURIDAD) Importar Rate Limit
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

// (SEGURIDAD) Confiar en el proxy de Render/Cloudflare para obtener la IP real
app.set('trust proxy', 1);

// Usar Helmet para securizar la app
app.use(helmet());

// DEBUG LOGGER - Verify requests reach the server (Moved UP)
app.use((req, res, next) => {
  console.log(`[SERVER-HIT] ${req.method} ${req.originalUrl} at ${new Date().toISOString()}`);
  next();
});

// (OPTIMIZACIÓN) Habilitar compresión Gzip para todas las respuestas HTTP
// Excluir endpoints de SSE para evitar buffering
app.use(compression({
  filter: (req, res) => {
    if (req.originalUrl.includes('/api/admin/sync-events')) {
      // console.log('Disabling compression for SSE endpoint: ' + req.originalUrl);
      return false;
    }
    // fallback to standard filter function
    return compression.filter(req, res);
  }
}));

// (SEGURIDAD) Configurar Rate Limiter Global
// Limita a cada IP a 100 peticiones por ventana de 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones
  standardHeaders: true, // Devuelve info del límite en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo en 15 minutos.',
  // Skip preflight requests (OPTIONS)
  skip: (req) => req.method === 'OPTIONS' || req.originalUrl.includes('/api/admin/sync-events'),
});

// Aplicar limiter global
app.use(limiter);

// (SEGURIDAD) Limiter específico más estricto para Login/Register
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Max 20 intentos de logueo por hora (ajustado a 10 para ser más estricto como pedido)
  message: 'Demasiados intentos de inicio de sesión, intente de nuevo en una hora.'
});

// Aplicar authLimiter solo a rutas de autenticación si existen aquí o en el router.
// Nota: Como usamos un mainRoutes, podemos aplicar el middleware condicionalmente o en routes/index.js
// Aquí lo aplicamos a las rutas conocidas de auth si pasaran por aquí, pero mejor lo pasamos
// para que se use en routes/authRoutes.js si fuera posible.
// Como no vamos a editar routes/authRoutes.js ahora, lo aplicamos globalmente a rutas que empiecen con /api/auth
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);


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