/*
* =================================================================
* SERVIDOR API (Conectado a PostgreSQL)
* =================================================================
*
* Estructura modularizada:
* - server.js: (Este archivo) Configuración de Express y arranque.
* - controllers.js: Lógica de negocio y consultas a la BD.
* - routes.js: Definición de todos los endpoints de la API.
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
const mainRoutes = require('./routes'); // (NUEVO) Importar todas las rutas

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuración ---
app.use(cors());
app.use(express.json());

// (NUEVO) Servir archivos estáticos (para los comprobantes subidos)
// Si 'uploads' está en 'backend/api/uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =================================================================
// --- ENDPOINTS DE LA API ---
// =================================================================
// (NUEVO) Monta todas las rutas definidas en routes.js bajo el prefijo /api
app.use('/api', mainRoutes);

// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`   Servidor API (Conectado a PostgreSQL)`);
  console.log(`   Escuchando en http://localhost:${PORT}`);
  console.log(`=======================================================`);
});