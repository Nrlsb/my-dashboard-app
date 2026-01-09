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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool2.query(query);
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
    WHERE vendedor_code = $1 
    ORDER BY created_at DESC;
  `;
  const result = await pool2.query(query, [vendedorCode]);
  return result.rows;
};

const deleteTestUser = async (id, vendedorCode) => {
  const query = `
    DELETE FROM test_users 
    WHERE id = $1 AND vendedor_code = $2
    RETURNING id;
  `;
  const result = await pool2.query(query, [id, vendedorCode]);
  return result.rowCount > 0;
};

const getTestUserByName = async (name) => {
  const query = `
    SELECT * FROM test_users 
    WHERE name = $1;
  `;
  const result = await pool2.query(query, [name]);
  return result.rows[0];
};

module.exports = {
  createTestUser,
  getTestUsersByVendor,
  deleteTestUser,
  getTestUserByName
};
