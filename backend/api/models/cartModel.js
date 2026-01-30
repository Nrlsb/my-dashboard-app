const { pool } = require('../db');

const getCartByUserId = async (userId) => {
    try {
        const result = await pool.query('SELECT items FROM carts WHERE user_id = $1', [userId]);
        if (result.rows.length > 0) {
            return result.rows[0].items;
        }
        return [];
    } catch (error) {
        console.error('Error fetching cart:', error);
        throw error;
    }
};

const upsertCart = async (userId, items) => {
    try {
        const query = `
      INSERT INTO carts (user_id, items, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET items = $2, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
        const result = await pool.query(query, [userId, JSON.stringify(items)]);
        return result.rows[0];
    } catch (error) {
        console.error('Error upserting cart:', error);
        throw error;
    }
};

module.exports = {
    getCartByUserId,
    upsertCart,
};
