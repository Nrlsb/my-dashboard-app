const { getProductImages } = require('../models/productModel');

/**
 * Helper function to merge DB2 images into products list
 * @param {object[]} products - List of products to enrich
 * @returns {Promise<object[]>} - Enriched products with imageUrl and thumbnailUrl
 */
const enrichProductsWithImages = async (products) => {
    if (!products || products.length === 0) return products;

    const productCodes = products.map(p => p.code).filter(c => c != null);
    const dbImages = await getProductImages(productCodes);

    const imageMap = new Map();
    dbImages.forEach(img => {
        imageMap.set(img.product_code, img.image_url);
    });

    return products.map(p => {
        const dbImage = imageMap.get(p.code);
        if (dbImage) {
            let thumb = dbImage;
            let full = dbImage;

            // Optimización para imágenes de Google Drive (lh3)
            if (dbImage.includes('lh3.googleusercontent.com')) {
                // Remover parámetros existentes si los hay para evitar conflictos
                const baseUrl = dbImage.split('=')[0];
                thumb = `${baseUrl}=w300`;
                full = `${baseUrl}=w800`;
            }

            return { ...p, imageUrl: full, thumbnailUrl: thumb };
        }
        return p;
    });
};

module.exports = {
    enrichProductsWithImages
};
