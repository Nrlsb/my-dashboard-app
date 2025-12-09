const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Identifies the product from an image using Gemini 1.5 Flash.
 * @param {string} imagePath - Absolute path to the image file.
 * @returns {Promise<string>} - The identified product code or name.
 */
const identifyProductFromImage = async (imagePath) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString("base64");

        const prompt = "Identify the product code or name in this image. Return ONLY the code/name, nothing else. If you cannot find a code, return 'UNKNOWN'.";

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/jpeg", // Adjust based on actual file type if needed, but jpeg usually works for most
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();
        return text.trim();
    } catch (error) {
        console.error("Error calling Gemini:", error);
        throw new Error("Failed to identify product from image.");
    }
};

module.exports = {
    identifyProductFromImage,
};
