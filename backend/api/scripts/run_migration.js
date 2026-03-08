require('dotenv').config();
const { pool2 } = require('../db');

pool2.query(`
  ALTER TABLE product_offer_status
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS offer_price NUMERIC(12,2) DEFAULT NULL
`)
  .then(() => {
    console.log('Migración ejecutada correctamente.');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error en migración:', e.message);
    process.exit(1);
  });
