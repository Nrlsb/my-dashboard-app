const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
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
    console.error(
      `[DB2 Config Error] La variable de entorno ${v} no está definida. Revisa tu archivo .env.`
    );
    db2ConfigError = true;
  }
});

const pool2 = new Pool({
  user: process.env.DB2_USER,
  host: process.env.DB2_HOST,
  database: process.env.DB2_DATABASE,
  password: process.env.DB2_PASSWORD,
  port: process.env.DB2_PORT,
});

// Si hay un error de configuración, podrías querer manejarlo aquí,
// por ejemplo, no exportando un pool que sabes que fallará.
// Por ahora, solo se loguea el error.

module.exports = { pool, pool2 };
