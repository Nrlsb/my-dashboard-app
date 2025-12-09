const fs = require('fs');
const { uploadImage } = require('../services/cloudinaryService');
const { identifyProductFromImage } = require('../services/geminiService');
const { saveProductImage } = require('../services/imageService');
const { pool } = require('../db'); // DB1 for reading products
const logger = require('../utils/logger');

// Step 1: Upload to Cloudinary and Analyze with AI
const uploadAndAnalyzeImage = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No image files provided.' });
        }

        const results = [];
        const errors = [];

        logger.info(`Analyzing ${req.files.length} images...`);

        for (const file of req.files) {
            const filePath = file.path;
            const originalName = file.originalname;

            try {
                logger.info(`Processing image: ${originalName}`);

                // 1. Identify product using Gemini
                let productCode = await identifyProductFromImage(filePath);
                logger.info(`Gemini identified product code for ${originalName}: ${productCode}`);

                // Clean up product code
                if (productCode !== 'UNKNOWN') {
                    productCode = productCode.replace(/`/g, '').trim();
                }

                // 2. Upload to Cloudinary (We need the URL to show it to the user)
                // Use a temp ID initially, or just a timestamp. We can't use productCode reliably yet if it's unknown.
                // But if we want to keep the file, we should upload it.
                const publicId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const uploadResult = await uploadImage(filePath, publicId, 'temp_uploads'); // Upload to a temp folder? Or just products?
                // Let's stick to 'products' folder for now, or maybe 'unassigned'.
                // User wants to assign it later.
                const imageUrl = uploadResult.secure_url;

                // 3. Search for potential product matches in DB1
                let foundProducts = [];

                if (productCode !== 'UNKNOWN') {
                    // Search by Code
                    let productQuery = 'SELECT id, code, description FROM products WHERE code = $1';
                    let productResult = await pool.query(productQuery, [productCode]);

                    if (productResult.rows.length > 0) {
                        foundProducts = productResult.rows;
                    } else {
                        // Fallback: Search by description
                        logger.info(`Product with code ${productCode} not found. Trying search by description...`);
                        productQuery = 'SELECT id, code, description FROM products WHERE description ILIKE $1 LIMIT 5';
                        productResult = await pool.query(productQuery, [`%${productCode}%`]);
                        foundProducts = productResult.rows;
                    }
                }

                results.push({
                    file: originalName,
                    imageUrl,
                    aiSuggestion: productCode,
                    foundProducts // Array of { id, code, description }
                });

                // 4. Cleanup local file
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            } catch (err) {
                console.error(`Error processing file ${originalName}:`, err);
                errors.push({ file: originalName, error: err.message });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }

        res.status(200).json({
            message: 'Analysis completed.',
            results,
            errors
        });

    } catch (error) {
        logger.error('Error in uploadAndAnalyzeImage:', error);
        if (req.files) {
            req.files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
        }
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Step 2: Assign Image to Selected Products
const assignImageToProducts = async (req, res) => {
    const { imageUrl, productIds } = req.body;

    if (!imageUrl || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'Invalid request. imageUrl and productIds (array) are required.' });
    }

    try {
        const results = [];
        for (const productId of productIds) {
            try {
                const savedImage = await saveProductImage(productId, imageUrl);
                results.push({ productId, status: 'success', data: savedImage });
            } catch (err) {
                console.error(`Error assigning image to product ${productId}:`, err);
                results.push({ productId, status: 'error', error: err.message });
            }
        }

        res.status(200).json({
            message: 'Assignment processing completed.',
            results
        });

    } catch (error) {
        logger.error('Error in assignImageToProducts:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    uploadAndAnalyzeImage,
    assignImageToProducts
};
