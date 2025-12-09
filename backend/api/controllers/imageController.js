const fs = require('fs');
const { uploadImage } = require('../services/cloudinaryService');
const { identifyProductFromImage } = require('../services/geminiService');
const { saveProductImage } = require('../services/imageService');
const { pool } = require('../db'); // DB1 for reading products
const logger = require('../utils/logger');

const uploadAndAssignImage = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No image files provided.' });
        }

        const results = [];
        const errors = [];

        logger.info(`Processing ${req.files.length} images...`);

        for (const file of req.files) {
            const filePath = file.path;
            const originalName = file.originalname;

            try {
                logger.info(`Processing image: ${originalName}`);

                // 1. Identify product using Gemini
                let productCode = await identifyProductFromImage(filePath);
                logger.info(`Gemini identified product code for ${originalName}: ${productCode}`);

                if (productCode === 'UNKNOWN') {
                    errors.push({ file: originalName, error: 'AI could not identify the product.' });
                    // Cleanup
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    continue;
                }

                // Clean up product code
                productCode = productCode.replace(/`/g, '').trim();

                // 2. Find product in DB1
                let productQuery = 'SELECT id, code FROM products WHERE code = $1';
                let productResult = await pool.query(productQuery, [productCode]);

                if (productResult.rows.length === 0) {
                    logger.info(`Product with code ${productCode} not found. Trying search by description...`);
                    // Fallback: Search by description
                    productQuery = 'SELECT id, code FROM products WHERE description ILIKE $1 LIMIT 1';
                    productResult = await pool.query(productQuery, [`%${productCode}%`]);
                }

                if (productResult.rows.length === 0) {
                    errors.push({ file: originalName, error: `Product with code or description matching "${productCode}" not found.` });
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    continue;
                }

                const productId = productResult.rows[0].id;
                // Update productCode to the actual code found in DB if we matched by description
                productCode = productResult.rows[0].code;

                // 3. Upload to Cloudinary
                const publicId = `${productCode}_${Date.now()}`;
                const uploadResult = await uploadImage(filePath, publicId);
                const imageUrl = uploadResult.secure_url;

                // 4. Save to DB2
                const savedImage = await saveProductImage(productId, imageUrl);

                results.push({
                    file: originalName,
                    productCode,
                    image: savedImage
                });

                // 5. Cleanup local file
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            } catch (err) {
                console.error(`Error processing file ${originalName}:`, err);
                errors.push({ file: originalName, error: err.message });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }

        res.status(200).json({
            message: 'Batch processing completed.',
            results,
            errors
        });

    } catch (error) {
        logger.error('Error in uploadAndAssignImage:', error);
        // Cleanup all files if catastrophic failure
        if (req.files) {
            req.files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
        }
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    uploadAndAssignImage,
};
