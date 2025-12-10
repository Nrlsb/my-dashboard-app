const { pool, pool2 } = require('../api/db');

const countImages = async () => {
    try {
        console.log('Iniciando conteo de productos e imágenes...');

        // 1. Obtener todos los productos activos (mismos filtros que en la web)
        console.log('Consultando productos activos en DB1...');
        const productsResult = await pool.query(
            'SELECT id, code, description FROM products WHERE price > 0 AND description IS NOT NULL'
        );
        const activeProducts = productsResult.rows;
        console.log(`Total de productos activos encontrados: ${activeProducts.length}`);

        // 2. Obtener todos los IDs de productos que tienen imágenes
        console.log('Consultando imágenes en DB2...');
        const imagesResult = await pool2.query(
            'SELECT DISTINCT product_id FROM product_images'
        );
        const productIdsWithImages = new Set(imagesResult.rows.map(row => row.product_id));
        console.log(`Total de productos con imágenes en DB2: ${productIdsWithImages.size}`);

        // 3. Calcular intersección y faltantes
        let withImagesCount = 0;
        let withoutImagesCount = 0;
        const missingImagesProducts = [];

        activeProducts.forEach(product => {
            if (productIdsWithImages.has(product.id)) {
                withImagesCount++;
            } else {
                withoutImagesCount++;
                // Guardar algunos ejemplos de los que faltan
                if (missingImagesProducts.length < 5) {
                    missingImagesProducts.push(`${product.code} - ${product.description}`);
                }
            }
        });

        console.log('\n--- RESULTADOS ---');
        console.log(`Total Productos Activos en Web: ${activeProducts.length}`);
        console.log(`Productos CON imágenes: ${withImagesCount}`);
        console.log(`Productos SIN imágenes: ${withoutImagesCount}`);
        console.log(`Porcentaje de cobertura: ${((withImagesCount / activeProducts.length) * 100).toFixed(2)}%`);

        if (missingImagesProducts.length > 0) {
            console.log('\nEjemplos de productos sin imágenes:');
            missingImagesProducts.forEach(p => console.log(`- ${p}`));
        }

    } catch (error) {
        console.error('Error durante el conteo:', error);
    } finally {
        await pool.end();
        await pool2.end();
    }
};

countImages();
