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

require('dotenv').config(); // Cargar variables de .env
const express = require('express');
const cors = require('cors');
const path = require('path');
const mainRoutes = require('./routes/index'); // (NUEVO) Importar el enrutador principal
const helmet = require('helmet');
const compression = require('compression'); // (OPTIMIZACIÓN) Importar compresión

const app = express();

// Usar Helmet para securizar la app
app.use(helmet());

// (OPTIMIZACIÓN) Habilitar compresión Gzip para todas las respuestas HTTP
app.use(compression());

const PORT = process.env.PORT || 3001;

// --- Configuración ---
// (NUEVO) Opciones de CORS para mayor seguridad
const corsOptions = {
  origin: (origin, callback) => {
    // Lista de dominios permitidos
    const allowedOrigins = [
      'http://localhost:5173', // Desarrollo Frontend
      'https://midashboard.com', // Producción Frontend
      'https://my-dashboard-app-lake.vercel.app', // (NUEVO) Frontend en Vercel
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

// (NUEVO) Inicializar el programador de tareas (Cron Jobs)
const { initScheduler } = require('./services/schedulerService');
initScheduler();

// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`   Servidor API (Conectado a PostgreSQL)`);
  console.log(`   Escuchando en http://localhost:${PORT}`);
  console.log(`=======================================================`);
});