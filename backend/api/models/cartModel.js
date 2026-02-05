const { pool } = require('../db');

const getCartByUserId = async (userId) => {
    try {
        const result = await pool.query('SELECT items, updated_at FROM carts WHERE user_id = $1', [userId]);
        if (result.rows.length > 0) {
            return {
                items: result.rows[0].items,
                updatedAt: result.rows[0].updated_at
            };
        }
        return { items: [], updatedAt: null };
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
        return {
            items: result.rows[0].items,
            updatedAt: result.rows[0].updated_at
        };
    } catch (error) {
        console.error('Error upserting cart:', error);
        throw error;
    }
};

const getCartItemCountsByUserIds = async (userIds) => {
    if (!userIds || userIds.length === 0) return {};

    try {
        const query = `
            SELECT user_id, items 
            FROM carts 
            WHERE user_id = ANY($1)
        `;
        const result = await pool.query(query, [userIds]);

        const cartCounts = {};
        // Initialize all to 0
        userIds.forEach(id => cartCounts[id] = 0);

        result.rows.forEach(row => {
            // items is JSONB or JSON, array of objects
            let count = 0;
            if (Array.isArray(row.items)) {
                count = row.items.length;
            }
            cartCounts[row.user_id] = count;
        });

        return cartCounts;
    } catch (error) {
        console.error('Error fetching cart counts:', error);
        return {}; // Return empty object on error to avoid crashing
    }
};

module.exports = {
    getCartByUserId,
    upsertCart,
    getCartItemCountsByUserIds,
};
