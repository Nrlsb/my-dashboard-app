const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// (LA SOLUCIÓN)
// Esta línea faltaba. Exporta la instancia de 'pool'
// para que otros archivos (como controllers.js) puedan importarla.
module.exports = pool;