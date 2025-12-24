const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Identifies the product from an image using Gemini 1.5 Flash.
 * @param {string} imagePath - Absolute path to the image file.
 * @param {string} userContext - Optional context provided by the user.
 * @returns {Promise<Object>} - The identified product info (code, name, keywords).
 */
const identifyProductFromImage = async (imagePath, userContext = '') => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString("base64");

        const prompt = `
            Analyze this product image acting as an expert inventory manager.
            ${userContext ? `Context provided by user: "${userContext}". Use this to help identify the product.` : ''}
            
            Follow this logic:
            1. **Anchors**: Identify the strongest identifier, usually a large Model Number (e.g., "505", "520", "105"). This is the "code".
            2. **Line Distinction**: Look for sub-brands or lines (e.g., "ACA" vs "AAT") to distinguish similar products.
            3. **Translation**: If the label is in English (e.g., "Rubbing Compound"), include the Spanish translation in keywords (e.g., "Compuesto de Corte").
            
            Return the result ONLY as a valid JSON object with the following structure:
            {
                "code": "found model number/code or null",
                "brand": "found brand or null",
                "name": "short product name (including sub-brand)",
                "keywords": ["translated_keyword1", "original_keyword2", "keyword3"]
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

/**
 * Selects the best matching product from a list of candidates using Gemini.
 * @param {string} imagePath - Absolute path to the image file.
 * @param {Array} candidates - List of product candidates (id, code, description).
 * @returns {Promise<Object>} - The best match ID and confidence.
 */
const selectBestMatch = async (imagePath, candidates) => {
    if (!candidates || candidates.length === 0) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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

            Follow this matching logic strictly:
            1. **Anchor Matching**: The Model Number (e.g., "505") is the most important factor. Match it against the Description or Code in the list.
            2. **Line Distinction**: Ensure the sub-brand (e.g., "ACA" vs "AAT") matches exactly.
            3. **Language**: The image might be in English ("Rubbing Compound") and the list in Spanish ("Crema de Corte"). Treat them as matches.
            4. **Volume/Size**: If multiple candidates match the product but differ only by size/volume (e.g., 16oz vs 32oz, or 500ml vs 1L), and you cannot determine the size from the image, pick one but mention the ambiguity in the reasoning.

            Analyze the image and compare it with the candidates.
            
            Return the result ONLY as a valid JSON object:
            {
                "bestMatchId": "ID of the best matching product or null if none match",
                "confidence": "high/medium/low",
                "reasoning": "Explain why. If multiple sizes found, mention it here."
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

/**
 * Generates a creative product description using Gemini.
 * @param {string} productName - The name of the product.
 * @param {object} productDetails - Additional details (price, brand, etc.).
 * @returns {Promise<string>} - The generated description.
 */
const generateProductDescription = async (productName, productDetails = {}) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
            Act as an expert technical writer for an e-commerce store specialized in car care, detailing, and paint products.
            Generate a structured technical product sheet for:
            
            Product Name: ${productName}
            Brand: ${productDetails.brand || 'N/A'}
            
            Context:
            - Language: Spanish (Argentina).
            - Style: Technical, professional, precise.
            - Format: Use the following structure EXACTLY. Do not include "Health and Safety" sections.
            
            Structure:
            
            **Descripción del Producto**
            [Write a technical paragraph describing the formula, technology, and main benefits. approx 50-80 words]
            
            **Información Principal**
            [Generate 3-5 bullet points with key technical specifications RELEVANT TO THE SPECIFIC PRODUCT TYPE.
             Examples (do not copy, adapt to product):
             - For Paints/Liquids: Terminación, Rendimiento, Tiempo de secado, Manos.
             - For Tools/Brushes: Material, Largo de pelo, Tipo de mango, Resistencia.
             - For Machines: Potencia, Velocidad (RPM), Peso, Voltaje.
             - For Accessories: Medidas, Material, Compatibilidad.]
            
            **Aplicación**
            [List tools or application method: Pincel, Rodillo, Soplete, Manual, Máquina, etc.]
            
            **Características Destacadas**
            - [Feature 1]
            - [Feature 2]
            - [Feature 3]
            - [Feature 4]
            
            Note: Infer reasonable technical values based on the product name and type if exact details are not provided.
            Output ONLY the formatted text.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Error generating product description:", error);
        throw new Error("Failed to generate description.");
    }
};

module.exports = {
    identifyProductFromImage,
    selectBestMatch,
    generateProductDescription
};
