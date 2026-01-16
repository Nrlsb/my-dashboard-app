const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { uploadFile } = require('../services/googleDriveService');
// const { pool2 } = require('../db'); // Uncomment if you want to update DB

// Configuration
const IMAGES_DIR = process.env.LOCAL_IMAGES_DIR || 'C:/Users/Usuario/Desktop/FOTOS PRODUCTOS'; // Default path or from .env

const runUpload = async () => {
    console.log('--- Iniciando carga masiva a Google Drive ---');
    console.log(`Directorio de imágenes: ${IMAGES_DIR}`);

    if (!fs.existsSync(IMAGES_DIR)) {
        console.error('ERROR: El directorio de imágenes no existe.');
        return;
    }

    // Recursive function to get all files
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
        const fileName = path.basename(filePath);
        // Assuming filename (without extension) is the product code, or similar logic
        // const productCode = path.parse(filePath).name; 

        console.log(`Procesando: ${fileName}...`);

        try {
            const fileMetadata = {
                path: filePath,
                mimetype: getMimeType(filePath),
                originalname: fileName
            };

            // Upload to Drive (root folder or specific folder if ID provided)
            const result = await uploadFile(fileMetadata, null);
            const imageUrl = result.directLink;

            console.log(`  -> Subido OK: ${imageUrl}`);

            // Optional: Update DB
            // await pool2.query('UPDATE product_images SET image_url = $1, updated_at = NOW() WHERE product_code = $2', [imageUrl, productCode]);

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

const getMimeType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'application/octet-stream';
};

runUpload();
