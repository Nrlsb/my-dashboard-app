const fs = require('fs');
const { uploadImage } = require('../services/cloudinaryService');
const { identifyProductFromImage, selectBestMatch } = require('../services/geminiService');
const { saveProductImage, replaceProductImage } = require('../services/imageService');
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

        const { userKeywords, ignoreWords, brand, useAI } = req.body;

        logger.info(`Analyzing ${req.files.length} images... Keywords: ${userKeywords || 'None'}, Ignore: ${ignoreWords || 'None'}`);

        for (const file of req.files) {
            const filePath = file.path;
            const originalName = file.originalname;

            try {
                logger.info(`Processing image: ${originalName}`);

                // 1. Identify product using Gemini
                let aiResult = { code: null, brand: null, keywords: [] };
                let aiSelection = null; // Initialize here to be available in catch/finally blocks
                if (useAI === 'true') {
                    aiResult = await identifyProductFromImage(filePath, userKeywords);
                    logger.info(`AI Analysis for ${originalName}: ${JSON.stringify(aiResult)}`);
                } else {
                    logger.info(`AI Analysis for ${originalName}: SKIPPED (useAI=false)`);
                }

                // 2. Upload to Cloudinary
                const publicId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const uploadResult = await uploadImage(filePath, publicId, 'temp_uploads');
                console.log('Upload Result:', JSON.stringify(uploadResult, null, 2));
                const imageUrl = uploadResult.secure_url;
                console.log('Generated Image URL:', imageUrl);

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
                        const userKws = userKeywords.trim().split(/\s+/).filter(w => w.length > 0);

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
                        // Fallback: Use filename keywords AND AI keywords
                        // STRATEGY: Prioritize AI Code/Brand if available

                        // 1. If AI found a code, try to search by code FIRST (High Precision)
                        if (aiResult && aiResult.code) {
                            queryConditions.push(`code ILIKE $${paramCount}`);
                            queryParams.push(`%${aiResult.code}%`);
                            paramCount++;
                        }
                        // 2. If no code, but AI found brand/name, try strict description match
                        else if (aiResult && aiResult.brand && aiResult.name) {
                            // Try to find products that have BOTH brand and name parts
                            queryConditions.push(`(description ILIKE $${paramCount} AND description ILIKE $${paramCount + 1})`);
                            queryParams.push(`%${aiResult.brand}%`);
                            queryParams.push(`%${aiResult.name.split(' ')[0]}%`); // First word of name
                            paramCount += 2;
                        }
                        // 3. Fallback: Broad Search (Bag of Words)
                        else {
                            const cleanFileName = originalName.replace(/\.[^/.]+$/, "").replace(/-|_/g, " ");
                            const ignoreList = ['removebg', 'preview', 'image', 'img', 'copy', 'copia'];

                            if (ignoreWords) {
                                const customIgnores = ignoreWords.split(/[\s,]+/).map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
                                ignoreList.push(...customIgnores);
                            }

                            let searchTerms = cleanFileName.split(' ')
                                .filter(w => w.length > 2)
                                .filter(w => !ignoreList.includes(w.toLowerCase()));

                            if (aiResult && aiResult.keywords && Array.isArray(aiResult.keywords)) {
                                searchTerms = [...searchTerms, ...aiResult.keywords];
                            }

                            // Deduplicate
                            searchTerms = [...new Set(searchTerms)];

                            if (searchTerms.length > 0) {
                                searchTerms.slice(0, 6).forEach(kw => {
                                    queryConditions.push(`(description ILIKE $${paramCount} OR code ILIKE $${paramCount})`);
                                    queryParams.push(`%${kw}%`);
                                    paramCount++;
                                });
                            }
                        }
                    }

                    // Common Ignore Logic: Apply to BOTH strategies
                    // We want to EXCLUDE products that contain any of the ignore words in their description
                    let ignoreConditions = [];
                    if (ignoreWords && ignoreWords.trim().length > 0) {
                        const ignores = ignoreWords.split(/[\s,]+/).map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
                        ignores.forEach(ignoreKw => {
                            ignoreConditions.push(`description NOT ILIKE $${paramCount}`);
                            queryParams.push(`%${ignoreKw}%`);
                            paramCount++;
                        });
                    }

                    // STRICT BRAND FILTER (New)
                    // If user provided a brand, we enforce it as a hard requirement using the brand column
                    let brandCondition = "";
                    if (brand && brand.trim().length > 0) {
                        brandCondition = `AND brand = $${paramCount}`;
                        queryParams.push(brand.trim());
                        paramCount++;
                    }

                    if (queryConditions.length > 0) {
                        const joinOperator = (userKeywords && userKeywords.trim().length > 0) ? ' AND ' : ' OR ';

                        // Combine positive matches with negative filters
                        let finalWhereClause = `(${queryConditions.join(joinOperator)})`;

                        if (ignoreConditions.length > 0) {
                            finalWhereClause += ` AND ${ignoreConditions.join(' AND ')}`;
                        }

                        const sql = `
                            SELECT id, code, description, price, stock_disponible as stock 
                            FROM products 
                            WHERE ${finalWhereClause}
                            ${brandCondition}
                            AND price > 0 
                            AND description IS NOT NULL
                            LIMIT 250
                        `;

                        console.log('SQL Query:', sql);
                        console.log('Params:', queryParams);
                        console.log('Pool defined:', !!pool);

                        try {
                            const dbRes = await pool.query(sql, queryParams);
                            foundProducts = dbRes.rows;
                            console.log(`Found ${foundProducts.length} products`);
                        } catch (queryErr) {
                            console.error('CRITICAL SQL ERROR:', queryErr);
                            // Do not rethrow, just let foundProducts be empty
                        }
                    }

                    // 4. AI Selection (Second Opinion)
                    if (useAI === 'true' && foundProducts.length > 0) {
                        try {
                            // Send top 15 candidates to AI to save tokens/time
                            const candidates = foundProducts.slice(0, 15);
                            logger.info(`Asking AI to select best match from ${candidates.length} candidates...`);

                            aiSelection = await selectBestMatch(filePath, candidates);
                            logger.info(`AI Selection Result: ${JSON.stringify(aiSelection)}`);

                        } catch (aiSelErr) {
                            console.error('Error in AI Selection step:', aiSelErr);
                        }
                    }

                } catch (dbErr) {
                    console.error(`Database search error for ${originalName}:`, dbErr);
                    // Don't fail the whole upload, just return empty matches
                }

                results.push({
                    file: originalName,
                    imageUrl,
                    aiSuggestion: aiResult,
                    aiSelection, // New field with the best match
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
        console.error('Error in uploadAndAnalyzeImage:', error);
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
    const { imageUrl, productIds, replace } = req.body;
    console.log('Assigning Image - Body:', JSON.stringify(req.body, null, 2));

    if (!imageUrl || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'Invalid request. imageUrl and productIds (array) are required.' });
    }

    try {
        const results = [];
        for (const productId of productIds) {
            try {
                let savedImage;
                if (replace) {
                    savedImage = await replaceProductImage(productId, imageUrl);
                } else {
                    savedImage = await saveProductImage(productId, imageUrl);
                }
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
