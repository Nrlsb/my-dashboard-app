const { pool2 } = require('../db');
const logger = require('../utils/logger');

/**
 * Saves the product image association to the database.
 * @param {number} productId - The ID of the product.
 * @param {string} productCode - The Code of the product.
 * @param {string} imageUrl - The URL of the image.
 * @returns {Promise<object>} - The saved record.
 */
const saveProductImage = async (productId, productCode, imageUrl) => {
    const query = `
    INSERT INTO product_images (product_id, product_code, image_url, updated_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING *;
  `;
    const values = [productId, productCode, imageUrl];

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
 * @param {string} productCode - The Code of the product.
 * @param {string} imageUrl - The URL of the new image.
 * @returns {Promise<object>} - The saved record.
 */
const replaceProductImage = async (productId, productCode, imageUrl) => {
    const client = await pool2.connect();
    try {
        await client.query('BEGIN');

        // Delete existing images for this product (using code as primary reference, but could use ID too)
        await client.query('DELETE FROM product_images WHERE product_code = $1 OR product_id = $2', [productCode, productId]);

        // Insert the new image
        const query = `
            INSERT INTO product_images (product_id, product_code, image_url, updated_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING *;
        `;
        const result = await client.query(query, [productId, productCode, imageUrl]);

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
