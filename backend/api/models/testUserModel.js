const { pool2 } = require('../db');

/**
 * Crea la tabla de usuarios de prueba si no existe.
 */
const createTestUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS test_users (
      id SERIAL PRIMARY KEY,
      vendedor_code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      cellphone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP DEFAULT NULL,
      deletion_reason VARCHAR(50) DEFAULT NULL
    );
  `;
  try {
    await pool2.query(query);
    // Intentar agregar la columna por si la tabla ya existía sin ella
    try {
      await pool2.query('ALTER TABLE test_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;');
      await pool2.query('ALTER TABLE test_users ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(50) DEFAULT NULL;');
      console.log('Columnas deleted_at y deletion_reason verificadas en test_users');
    } catch (alterErr) {
      console.log('Omitiendo alter table (posiblemente ya existen columnas):', alterErr.message);
    }
    console.log('Tabla test_users verificada/creada en BD2');
  } catch (err) {
    console.error('Error creando tabla test_users en BD2:', err);
  }
};

// Inicializar la tabla al cargar el modelo (o invocar explícitamente en server start)
createTestUsersTable();

const createTestUser = async (vendedorCode, data) => {
  const { name, password, cellphone } = data;
  const query = `
    INSERT INTO test_users (vendedor_code, name, password, cellphone)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const result = await pool2.query(query, [vendedorCode, name, password, cellphone]);
  return result.rows[0];
};

const getTestUsersByVendor = async (vendedorCode) => {
  const query = `
    SELECT * FROM test_users 
    WHERE vendedor_code = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC;
  `;
  const result = await pool2.query(query, [vendedorCode]);
  return result.rows;
};

const deleteTestUser = async (id, vendedorCode) => {
  const query = `
    UPDATE test_users 
    SET deleted_at = CURRENT_TIMESTAMP, deletion_reason = 'MANUAL'
    WHERE id = $1 AND vendedor_code = $2
    RETURNING id;
  `;
  const result = await pool2.query(query, [id, vendedorCode]);
  return result.rowCount > 0;
};


const getTestUserByName = async (name) => {
  const query = `
    SELECT * FROM test_users 
    WHERE name = $1 AND deleted_at IS NULL;
  `;
  const result = await pool2.query(query, [name]);
  return result.rows[0];
};

const getAllTestUsers = async () => {
  const query = `
    SELECT * FROM test_users 
    ORDER BY created_at DESC;
  `;
  const result = await pool2.query(query);
  return result.rows;
};

const softDeleteExpiredTestUsers = async () => {
  const query = `
        UPDATE test_users 
        SET deleted_at = CURRENT_TIMESTAMP, deletion_reason = 'EXPIRED'
        WHERE created_at < NOW() - INTERVAL '7 days' 
        AND deleted_at IS NULL 
        RETURNING id;
    `;
  try {
    const result = await pool2.query(query);
    if (result.rowCount > 0) {
      console.log(`[Auto-Expiration] Soft-deleted ${result.rowCount} expired test users.`);
    }
    return result.rowCount;
  } catch (err) {
    console.error('[Auto-Expiration] Error expiring test users:', err);
    return 0;
  }
};



module.exports = {
  createTestUser,
  getTestUsersByVendor,
  deleteTestUser,
  getTestUserByName,
  getAllTestUsers,
  softDeleteExpiredTestUsers
};
