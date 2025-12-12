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

/**
 * Replaces the product image association in the database.
 * Deletes existing images for the product and inserts the new one.
 * @param {number} productId - The ID of the product.
 * @param {string} imageUrl - The URL of the new image.
 * @returns {Promise<object>} - The saved record.
 */
const replaceProductImage = async (productId, imageUrl) => {
    const client = await pool2.connect();
    try {
        await client.query('BEGIN');

        // Delete existing images for this product
        await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);

        // Insert the new image
        const query = `
            INSERT INTO product_images (product_id, image_url, updated_at)
            VALUES ($1, $2, NOW())
            RETURNING *;
        `;
        const result = await client.query(query, [productId, imageUrl]);

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error replacing product image:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    saveProductImage,
    replaceProductImage,
};
