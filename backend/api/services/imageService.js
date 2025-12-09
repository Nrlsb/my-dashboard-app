const { pool2 } = require('../db');
const logger = require('../utils/logger');

/**
 * Saves the product image association to the database.
 * @param {number} productId - The ID of the product.
 * @param {string} imageUrl - The URL of the image.
 * @returns {Promise<object>} - The saved record.
 */
const saveProductImage = async (productId, imageUrl) => {
    const query = `
    INSERT INTO product_images (product_id, image_url, updated_at)
    VALUES ($1, $2, NOW())
    RETURNING *;
  `;
    const values = [productId, imageUrl];

    try {
        const result = await pool2.query(query, values);
        return result.rows[0];
    } catch (error) {
        logger.error('Error saving product image:', error);
        throw error;
    }
};

module.exports = {
    saveProductImage,
};
