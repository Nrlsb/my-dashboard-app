const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Configurar Cloudinary con las variables de entorno
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    secure: true,
});

/**
 * Sube una imagen a Cloudinary.
 * @param {string} filePath - Ruta absoluta del archivo local.
 * @param {string} publicId - ID público deseado (generalmente el código del producto).
 * @param {string} folder - Carpeta en Cloudinary (default: 'products').
 * @returns {Promise<object>} - Resultado de la subida.
 */
const uploadImage = async (filePath, publicId, folder = 'products') => {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const result = await cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            folder: folder,
            overwrite: true,
            transformation: [
                { width: 800, crop: "limit" }, // Optimización básica: limitar ancho
                { quality: "auto" },           // Optimización automática de calidad
                { fetch_format: "auto" }       // Formato automático (WebP/AVIF si el navegador lo soporta)
            ]
        });

        return result;
    } catch (error) {
        console.error(`Error uploading to Cloudinary (${publicId}):`, error);
        throw error;
    }
};

/**
 * Elimina una imagen de Cloudinary.
 * @param {string} publicId - ID público de la imagen.
 * @returns {Promise<object>} - Resultado de la eliminación.
 */
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error(`Error deleting from Cloudinary (${publicId}):`, error);
        throw error;
    }
};

/**
 * Genera la URL de una imagen en Cloudinary.
 * @param {string} publicId - ID público de la imagen (código de producto).
 * @param {string} folder - Carpeta en Cloudinary.
 * @returns {string|null} - URL de la imagen o null si no está configurado.
 */
const getImageUrl = (publicId, folder = 'products', width = 500) => {
    if (!process.env.CLOUD_NAME) return null;
    return cloudinary.url(`${folder}/${publicId}`, {
        secure: true,
        transformation: [
            { width: width, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" }
        ]
    });
};

/**
 * Sube un archivo genérico (PDF, doc, etc.) a Cloudinary.
 * @param {string} filePath - Ruta absoluta del archivo local.
 * @param {string} publicId - ID público deseado.
 * @param {string} folder - Carpeta en Cloudinary (default: 'invoices').
 * @returns {Promise<object>} - Resultado de la subida.
 */
const uploadFile = async (filePath, publicId, folder = 'invoices') => {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const result = await cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            folder: folder,
            resource_type: "auto", // Permite detectar PDFs y otros tipos
            overwrite: true
        });

        return result;
    } catch (error) {
        console.error(`Error uploading file to Cloudinary (${publicId}):`, error);
        throw error;
    }
};

module.exports = {
    uploadImage,
    uploadFile,
    deleteImage,
    getImageUrl,
    cloudinary // Exportar instancia por si se necesita acceso directo
};
