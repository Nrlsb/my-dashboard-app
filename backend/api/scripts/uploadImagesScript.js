const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { uploadImage } = require('../services/cloudinaryService');
const { pool2 } = require('../db'); // Usamos pool2 para actualizar product_offer_status o products si agregamos campo

// Configuración
const IMAGES_DIR = process.env.LOCAL_IMAGES_DIR || 'C:/Users/Usuario/Desktop/FOTOS PRODUCTOS'; // Ruta por defecto o desde .env
const CLOUDINARY_FOLDER = 'products';

const runUpload = async () => {
    console.log('--- Iniciando carga masiva a Cloudinary ---');
    console.log(`Directorio de imágenes: ${IMAGES_DIR}`);

    if (!fs.existsSync(IMAGES_DIR)) {
        console.error('ERROR: El directorio de imágenes no existe.');
        return;
    }

    // Función recursiva para obtener todos los archivos
    const getAllFiles = (dirPath, arrayOfFiles = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                getAllFiles(fullPath, arrayOfFiles);
            } else {
                if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
                    arrayOfFiles.push(fullPath);
                }
            }
        });

        return arrayOfFiles;
    };

    const imageFiles = getAllFiles(IMAGES_DIR);

    console.log(`Encontradas ${imageFiles.length} imágenes.`);

    let successCount = 0;
    let errorCount = 0;

    for (const filePath of imageFiles) {
        // const filePath = path.join(IMAGES_DIR, file); // Ya viene completa
        const productCode = path.parse(filePath).name; // Asumimos que el nombre del archivo es el código (ej: A123.jpg -> A123)
        const fileName = path.basename(filePath);

        console.log(`Procesando: ${fileName} (Código: ${productCode})...`);

        try {
            // 1. Subir a Cloudinary
            const result = await uploadImage(filePath, productCode, CLOUDINARY_FOLDER);
            const imageUrl = result.secure_url;

            console.log(`  -> Subido OK: ${imageUrl}`);

            // 2. Actualizar base de datos (Opcional: si guardamos la URL en products o product_offer_status)
            // Por ahora, asumiremos que el frontend construirá la URL o usaremos una tabla de mapeo.
            // Si queremos guardar la URL explícitamente en 'product_offer_status' para ofertas custom:
            /*
            await pool2.query(
              'UPDATE product_offer_status SET custom_image_url = $1 WHERE product_id = (SELECT id FROM products WHERE code = $2)',
              [imageUrl, productCode]
            );
            */

            // O si agregamos una columna 'image_url' a la tabla 'products' (Recomendado a futuro)
            // await pool.query('UPDATE products SET image_url = $1 WHERE code = $2', [imageUrl, productCode]);

            successCount++;
        } catch (error) {
            console.error(`  -> ERROR subiendo ${fileName}:`, error.message);
            errorCount++;
        }
    }

    console.log('--- Carga finalizada ---');
    console.log(`Exitosos: ${successCount}`);
    console.log(`Errores: ${errorCount}`);
    process.exit();
};

runUpload();
