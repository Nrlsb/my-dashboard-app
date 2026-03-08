// backend/api/models/contactRequestModel.js

const { pool2 } = require('../db');

/**
 * Crea la tabla contact_requests si no existe.
 */
const ensureTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS contact_requests (
      id SERIAL PRIMARY KEY,
      cuit_cuil VARCHAR(20) NOT NULL,
      nombre_apellido VARCHAR(255) NOT NULL,
      telefono VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      provincia VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'pendiente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool2.query(query);
};

// Ejecutar al cargar el módulo
ensureTable().catch((err) =>
  console.error('Error creando tabla contact_requests:', err.message)
);

/**
 * Inserta una nueva solicitud de contacto.
 */
const createContactRequest = async ({
  cuit_cuil,
  nombre_apellido,
  telefono,
  email,
  provincia,
}) => {
  const query = `
    INSERT INTO contact_requests (cuit_cuil, nombre_apellido, telefono, email, provincia)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await pool2.query(query, [
    cuit_cuil,
    nombre_apellido,
    telefono,
    email,
    provincia,
  ]);
  return result.rows[0];
};

module.exports = {
  createContactRequest,
};
