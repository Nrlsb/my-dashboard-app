const { Pool } = require('pg');
// require('dotenv').config(); // Configuración cargada en server.js
const logger = require('./utils/logger'); // (NUEVO) Importar logger

// Configuración optimizada del Pool
const poolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // (OPTIMIZACIÓN) Ajustes para producción
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas tras 30s
  connectionTimeoutMillis: 2000, // Fallar si no conecta en 2s
};

const pool = new Pool(poolConfig);

// (OPTIMIZACIÓN) Manejo de errores en el pool para evitar caídas silenciosas
pool.on('error', (err, client) => {
  logger.error('Error inesperado en cliente inactivo de Pool 1', err);
  // No salir del proceso, dejar que el pool maneje la reconexión o eliminación del cliente
});

const requiredDb2Vars = [
  'DB2_USER',
  'DB2_HOST',
  'DB2_DATABASE',
  'DB2_PASSWORD',
  'DB2_PORT',
];

let db2ConfigError = false;
requiredDb2Vars.forEach((v) => {
  if (!process.env[v]) {
    logger.error(
      `[DB2 Config Error] La variable de entorno ${v} no está definida. Revisa tu archivo .env.`
    );
    db2ConfigError = true;
  }
});

const pool2Config = {
  user: process.env.DB2_USER,
  host: process.env.DB2_HOST,
  database: process.env.DB2_DATABASE,
  password: process.env.DB2_PASSWORD,
  port: process.env.DB2_PORT,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool2 = new Pool(pool2Config);

pool2.on('error', (err, client) => {
  logger.error('Error inesperado en cliente inactivo de Pool 2', err);
  // No salimos del proceso aquí si la DB2 es secundaria, pero logueamos fuerte.
});

// Si hay un error de configuración, podrías querer manejarlo aquí,
// por ejemplo, no exportando un pool que sabes que fallará.
// Por ahora, solo se loguea el error.

module.exports = { pool, pool2 };