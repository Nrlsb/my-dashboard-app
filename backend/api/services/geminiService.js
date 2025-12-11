const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Identifies the product from an image using Gemini 2.5 Flash.
 * @param {string} imagePath - Absolute path to the image file.
 * @param {string} userContext - Optional context provided by the user.
 * @returns {Promise<Object>} - The identified product info (code, name, keywords).
 */
const identifyProductFromImage = async (imagePath, userContext = '') => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString("base64");

        const prompt = `
            Analyze this product image. 
            ${userContext ? `Context provided by user: "${userContext}". Use this to help identify the product.` : ''}
            Identify any visible product codes, model numbers, brand names, and a brief description.
            Return the result ONLY as a valid JSON object with the following structure:
            {
                "code": "found code or null",
                "brand": "found brand or null",
                "name": "short product name",
                "keywords": ["keyword1", "keyword2", "keyword3"]
            }
            Do not include markdown formatting (like \`\`\`json). Just the raw JSON string.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const response = await result.response;
        let text = response.text();

        // Clean up any potential markdown formatting if the model ignores the instruction
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini JSON response:", text);
            return { code: null, name: "Unknown", keywords: [] };
        }

    } catch (error) {
        console.error("Error calling Gemini:", error);
        // Return a safe fallback instead of throwing to avoid breaking the whole batch
        return { code: null, name: "Error", keywords: [] };
    }
};

module.exports = {
    identifyProductFromImage,
    selectBestMatch
};

/**
 * Selects the best matching product from a list of candidates using Gemini.
 * @param {string} imagePath - Absolute path to the image file.
 * @param {Array} candidates - List of product candidates (id, code, description).
 * @returns {Promise<Object>} - The best match ID and confidence.
 */
const selectBestMatch = async (imagePath, candidates) => {
    if (!candidates || candidates.length === 0) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString("base64");

        // Format candidates for the prompt
        const candidatesList = candidates.map(c =>
            `- ID: ${c.id} | Code: ${c.code} | Description: ${c.description}`
        ).join('\n');

        const prompt = `
            I have an image of a product and a list of potential database matches.
            Your task is to identify which product from the list corresponds to the image.

            List of Candidates:
            ${candidatesList}

            Analyze the image (text, packaging, colors, type) and compare it with the candidates.
            
            Return the result ONLY as a valid JSON object:
            {
                "bestMatchId": "ID of the best matching product or null if none match",
                "confidence": "high/medium/low",
                "reasoning": "Short explanation of why this is the match"
            }
            Do not include markdown formatting.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini Selection JSON:", text);
            return null;
        }

    } catch (error) {
        console.error("Error in selectBestMatch:", error);
        return null;
    }
};
