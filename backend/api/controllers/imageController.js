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
                    // Build search query based on manual inputs and filename
                    let queryConditions = [];
                    let queryParams = [];
                    let paramCount = 1;

                    // STRATEGY: 
                    // 1. If User Keywords are provided, use them with AND logic (Specific Search).
                    //    This allows the user to filter precisely (e.g. "Esmalte Tersuave").
                    // 2. If NO User Keywords, use Filename with OR logic (Broad Search).

                    if (userKeywords && userKeywords.trim().length > 0) {
                        const userKws = userKeywords.split(' ').filter(w => w.length > 0);

                        // For user keywords, we want ALL of them to match (AND logic between words)
                        // But each word can match EITHER description OR code
                        const andConditions = [];

                        userKws.forEach(kw => {
                            andConditions.push(`(description ILIKE $${paramCount} OR code ILIKE $${paramCount})`);
                            queryParams.push(`%${kw}%`);
                            paramCount++;
                        });

                        if (andConditions.length > 0) {
                            queryConditions.push(andConditions.join(' AND '));
                        }

                    } else {
                        // Fallback: Use filename keywords with OR logic
                        // Clean filename: remove extension, remove common words like 'removebg', 'preview'
                        const cleanFileName = originalName.replace(/\.[^/.]+$/, "").replace(/-|_/g, " ");

                        // Prepare ignore list
                        const ignoreList = ['removebg', 'preview', 'image', 'img', 'copy', 'copia'];
                        if (ignoreWords) {
                            const customIgnores = ignoreWords.split(/[\s,]+/).map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
                            ignoreList.push(...customIgnores);
                        }

                        const fileKeywords = cleanFileName.split(' ')
                            .filter(w => w.length > 2)
                            .filter(w => !ignoreList.includes(w.toLowerCase()));

                        if (fileKeywords.length > 0) {
                            // Use up to 4 keywords from filename
                            fileKeywords.slice(0, 4).forEach(kw => {
                                queryConditions.push(`(description ILIKE $${paramCount} OR code ILIKE $${paramCount})`);
                                queryParams.push(`%${kw}%`);
                                paramCount++;
                            });
                        }
                    }

                    if (queryConditions.length > 0) {
                        // Note: queryConditions currently has 1 element (the AND block) or multiple (the OR block)
                        // If it's the AND block, join with AND (trivial). If OR block, join with OR.

                        const joinOperator = (userKeywords && userKeywords.trim().length > 0) ? ' AND ' : ' OR ';

                        const sql = `
                            SELECT id, code, description, price, stock 
                            FROM products 
                            WHERE (${queryConditions.join(joinOperator)})
                            AND price > 0 
                            AND description IS NOT NULL
                            LIMIT 250
                        `;

                        console.log('SQL Query:', sql);
                        console.log('Params:', queryParams);

                        const dbRes = await pool.query(sql, queryParams);
                        foundProducts = dbRes.rows;
                        console.log(`Found ${foundProducts.length} products`);
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
