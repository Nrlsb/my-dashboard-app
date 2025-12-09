const fs = require('fs');
const { uploadImage } = require('../services/cloudinaryService');
// const { identifyProductFromImage } = require('../services/geminiService'); // AI Disabled
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

                // 1. Identify product using Gemini (DISABLED)
                // let productCode = await identifyProductFromImage(filePath);
                let productCode = 'AI_DISABLED';
                logger.info(`AI Analysis disabled for ${originalName}`);

                // 2. Upload to Cloudinary (We need the URL to show it to the user)
                const publicId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const uploadResult = await uploadImage(filePath, publicId, 'temp_uploads');
                const imageUrl = uploadResult.secure_url;

                // 3. Search for potential product matches in DB1 (DISABLED or Optional)
                let foundProducts = [];
                // We could search by filename if we wanted, but let's keep it simple as requested.

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
