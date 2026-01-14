const { Pool } = require('pg');
// require('dotenv').config(); // Configuración cargada en server.js
const logger = require('./utils/logger');

// Configuración de base de datos única (BD2 - Protheus)
// Anteriormente pool2, ahora es la única conexión.

const requiredDbVars = [
  'DB2_USER',
  'DB2_HOST',
  'DB2_DATABASE',
  'DB2_PASSWORD',
  'DB2_PORT',
];

requiredDbVars.forEach((v) => {
  if (!process.env[v]) {
    logger.error(
      `[DB Config Error] La variable de entorno ${v} no está definida. Revisa tu archivo .env.`
    );
  }
});

const poolConfig = {
  user: process.env.DB2_USER,
  host: process.env.DB2_HOST,
  database: process.env.DB2_DATABASE,
  password: process.env.DB2_PASSWORD,
  port: process.env.DB2_PORT,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool2 = new Pool(poolConfig);

pool2.on('error', (err, client) => {
  logger.error('Error inesperado en cliente inactivo de BD (pool2)', err);
});

// Exportamos pool2 como 'pool2' para mantener contratos existentes donde se usa especificamente pool2,
// y TAMBIÉN como 'pool' para reemplazar la vieja conexión donde se importaba 'pool'.
// De esta forma, 'pool' y 'pool2' apuntan a la MISMA base de datos (BD2).

module.exports = {
  pool: pool2,
  pool2
};