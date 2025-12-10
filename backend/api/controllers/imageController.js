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
                const aiResult = await identifyProductFromImage(filePath);
                logger.info(`AI Analysis for ${originalName}:`, aiResult);

                // 2. Upload to Cloudinary
                const publicId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const uploadResult = await uploadImage(filePath, publicId, 'temp_uploads');
                const imageUrl = uploadResult.secure_url;

                // 3. Search for potential product matches in DB1
                let foundProducts = [];

                try {
                    // Build search query based on AI results
                    let queryConditions = [];
                    let queryParams = [];
                    let paramCount = 1;

                    if (aiResult.code) {
                        queryConditions.push(`code ILIKE $${paramCount}`);
                        queryParams.push(`%${aiResult.code}%`);
                        paramCount++;
                    }

                    if (aiResult.brand) {
                        queryConditions.push(`description ILIKE $${paramCount}`);
                        queryParams.push(`%${aiResult.brand}%`);
                        paramCount++;
                    }

                    // Also search by some keywords if available
                    if (aiResult.keywords && aiResult.keywords.length > 0) {
                        // Take top 2 keywords to avoid over-complicating
                        const keywords = aiResult.keywords.slice(0, 2);
                        keywords.forEach(kw => {
                            queryConditions.push(`description ILIKE $${paramCount}`);
                            queryParams.push(`%${kw}%`);
                            paramCount++;
                        });
                    }

                    // Fallback if AI didn't find anything useful, maybe search by filename?
                    // For now, if no conditions, we might return empty or generic
                    if (queryConditions.length > 0) {
                        const sql = `
                            SELECT id, code, description, price, stock 
                            FROM products 
                            WHERE ${queryConditions.join(' OR ')}
                            LIMIT 10
                        `;
                        const dbRes = await pool.query(sql, queryParams);
                        foundProducts = dbRes.rows;
                    }

                } catch (dbErr) {
                    logger.error(`Database search error for ${originalName}:`, dbErr);
                    // Don't fail the whole upload, just return empty matches
                }

                results.push({
                    file: originalName,
                    imageUrl,
                    aiSuggestion: aiResult,
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
