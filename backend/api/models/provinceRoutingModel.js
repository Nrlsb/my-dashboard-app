const { pool2 } = require('../db');

const ensureTable = async () => {
  await pool2.query(`
    CREATE TABLE IF NOT EXISTS province_seller_routing (
      id SERIAL PRIMARY KEY,
      provincia VARCHAR(100) NOT NULL UNIQUE,
      seller_name VARCHAR(255),
      seller_email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

ensureTable().catch((err) =>
  console.error('Error creando tabla province_seller_routing:', err.message)
);

const getAll = async () => {
  const result = await pool2.query(
    'SELECT * FROM province_seller_routing ORDER BY provincia ASC'
  );
  return result.rows;
};

const getByProvincia = async (provincia) => {
  const result = await pool2.query(
    'SELECT * FROM province_seller_routing WHERE provincia = $1',
    [provincia]
  );
  return result.rows[0] || null;
};

const upsert = async (provincia, seller_name, seller_email) => {
  const result = await pool2.query(
    `INSERT INTO province_seller_routing (provincia, seller_name, seller_email, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (provincia) DO UPDATE SET
       seller_name = EXCLUDED.seller_name,
       seller_email = EXCLUDED.seller_email,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *;`,
    [provincia, seller_name || null, seller_email]
  );
  return result.rows[0];
};

const deleteByProvincia = async (provincia) => {
  await pool2.query(
    'DELETE FROM province_seller_routing WHERE provincia = $1',
    [provincia]
  );
};

module.exports = { getAll, getByProvincia, upsert, deleteByProvincia };
