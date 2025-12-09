const fs = require('fs');
const { uploadImage } = require('../services/cloudinaryService');
const { identifyProductFromImage } = require('../services/geminiService');
const { saveProductImage } = require('../services/imageService');
const { pool } = require('../db'); // DB1 for reading products
const logger = require('../utils/logger');

const uploadAndAssignImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided.' });
        }

        const filePath = req.file.path;
        logger.info(`Processing image upload: ${filePath}`);

        // 1. Identify product using Gemini
        let productCode = await identifyProductFromImage(filePath);
        logger.info(`Gemini identified product code: ${productCode}`);

        if (productCode === 'UNKNOWN') {
            // Fallback: Try to use filename if Gemini fails? Or just error?
            // For now, let's try to use the filename as a fallback if it looks like a code
            // But the requirement says "using Gemini". Let's return an error or warning.
            // Actually, let's proceed but mark it.
            // For this implementation, let's return an error to the user so they know AI failed.
            // return res.status(422).json({ error: 'AI could not identify the product.' });

            // BETTER UX: Allow user to manually enter code if AI fails?
            // For this specific request, let's just return the error.
            return res.status(422).json({ error: 'AI could not identify the product.' });
        }

        // Clean up product code (remove potential markdown or extra spaces)
        productCode = productCode.replace(/`/g, '').trim();

        // 2. Find product in DB1
        const productQuery = 'SELECT id FROM products WHERE code = $1';
        const productResult = await pool.query(productQuery, [productCode]);

        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: `Product with code ${productCode} not found.` });
        }

        const productId = productResult.rows[0].id;

        // 3. Upload to Cloudinary
        // We use the product code as the public_id prefix or part of it to keep it organized
        // But Cloudinary service takes publicId. Let's use code + timestamp to avoid collisions if multiple images
        const publicId = `${productCode}_${Date.now()}`;
        const uploadResult = await uploadImage(filePath, publicId);
        const imageUrl = uploadResult.secure_url;

        // 4. Save to DB2
        const savedImage = await saveProductImage(productId, imageUrl);

        // 5. Cleanup local file
        fs.unlinkSync(filePath);

        res.status(201).json({
            message: 'Image uploaded and assigned successfully.',
            productCode,
            image: savedImage,
        });

    } catch (error) {
        logger.error('Error in uploadAndAssignImage:', error);
        // Cleanup file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    uploadAndAssignImage,
};
