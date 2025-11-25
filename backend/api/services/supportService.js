const { pool } = require('../db'); // Assuming db.js is in the parent directory

/**
 * Guarda una nueva consulta de un usuario
 */
const saveProtheusQuery = async (queryData, userId) => {
  const { subject, message } = queryData;

  try {
    // Adaptado a script.sql: Se quita la dependencia de 'a1_cod'.
    const query = `
      INSERT INTO queries (user_id, subject, message, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [userId, subject, message, 'Recibida']; // 'Recibida' es el default en el script

    const result = await pool.query(query, values);

    console.log(`Consulta guardada para usuario ${userId}`);

    // (PENDIENTE) Aquí se podría enviar un email de notificación al administrador

    return {
      success: true,
      message: 'Consulta enviada con éxito.',
      query: result.rows[0],
    };
  } catch (error) {
    console.error('Error en saveProtheusQuery (service):', error); // Added (service) for clarity
    throw error;
  }
};

/**
 * Guarda la información de un comprobante subido
 */
const saveProtheusVoucher = async (fileInfo, userId) => {
  // Extraemos los datos de fileInfo que SÍ existen en la BD
  const { originalName, path, mimeType, size } = fileInfo;

  try {
    // (CORREGIDO) Inserta en la tabla 'vouchers' (no 'protheus_vouchers')
    // (CORREGIDO) Se eliminaron las columnas 'filename', 'status', 'a1_cod' que NO existen en la tabla.
    // (CORREGIDO) Se cambió 'size' por 'file_size' para que coincida con la BD.
    const query = `
      INSERT INTO vouchers 
        (user_id, original_name, file_path, mime_type, file_size)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [userId, originalName, path, mimeType, size];

    const result = await pool.query(query, values);

    console.log(`Comprobante subido por usuario ${userId}: ${originalName}`);

    // (PENDIENTE) Aquí se podría enviar un email de notificación al administrador

    return result.rows[0]; // Devuelve la info guardada en la BD
  } catch (error) {
    console.error('Error en saveProtheusVoucher (service):', error); // Added (service) for clarity
    throw error;
  }
};

module.exports = {
  saveProtheusQuery,
  saveProtheusVoucher,
};
