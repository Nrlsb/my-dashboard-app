/*
* =================================================================
* GESTOR DE CONEXIÓN A POSTGRESQL (pg)
* =================================================================
* Este archivo centraliza la conexión a la base de datos.
* Utiliza "dotenv" para cargar las credenciales de forma segura
* desde un archivo .env que NO se debe subir a un repositorio.
* =D================================================================
*/

// Carga las variables de entorno (DB_USER, DB_PASSWORD, etc.) desde el archivo .env
require('dotenv').config();

const { Pool } = require('pg');

// Crea un "pool" de conexiones.
// El pool maneja eficientemente las conexiones a la BD, abriéndolas
// y reutilizándolas según sea necesario para cada petición.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Exportamos un objeto con un método "query" para que
// el resto de la aplicación pueda ejecutar consultas
// usando este pool.
module.exports = {
  query: (text, params) => pool.query(text, params),
};
