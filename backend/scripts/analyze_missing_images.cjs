const { pool, pool2 } = require('../api/db');

const analyzeMissingImages = async () => {
    try {
        console.log('Iniciando análisis de productos sin imágenes...');

        // 1. Obtener productos activos
        const productsResult = await pool.query(
            'SELECT id, code, description, product_group, brand FROM products WHERE price > 0 AND description IS NOT NULL'
        );
        const activeProducts = productsResult.rows;

        // 2. Obtener productos con imágenes
        const imagesResult = await pool2.query(
            'SELECT DISTINCT product_id FROM product_images'
        );
        const productIdsWithImages = new Set(imagesResult.rows.map(row => row.product_id));

        // 3. Filtrar los que NO tienen imágenes
        const missingProducts = activeProducts.filter(p => !productIdsWithImages.has(p.id));
        console.log(`Total productos sin imágenes: ${missingProducts.length}`);

        // 4. Agrupar por product_group
        const groups = {};
        missingProducts.forEach(p => {
            const group = p.product_group || 'SIN_GRUPO';
            if (!groups[group]) {
                groups[group] = {
                    count: 0,
                    descriptions: [],
                    brands: new Set()
                };
            }
            groups[group].count++;
            groups[group].descriptions.push(p.description);
            if (p.brand) groups[group].brands.add(p.brand);
        });

        // 5. Analizar y mostrar resultados
        const sortedGroups = Object.entries(groups)
            .sort(([, a], [, b]) => b.count - a.count);

        console.log('\n--- TOP 20 GRUPOS CON MÁS FALTANTES ---');
        console.log('Grupo | Cantidad | Marcas Principales | Palabras Clave en Descripción');
        console.log('-'.repeat(100));

        sortedGroups.slice(0, 20).forEach(([groupId, data]) => {
            // Análisis simple de palabras clave
            const wordCounts = {};
            data.descriptions.forEach(desc => {
                const words = desc.split(/\s+/)
                    .map(w => w.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, ''))
                    .filter(w => w.length > 3 && !['para', 'con', 'del', 'las', 'los'].includes(w));

                words.forEach(w => {
                    wordCounts[w] = (wordCounts[w] || 0) + 1;
                });
            });

            const topWords = Object.entries(wordCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([w]) => w)
                .join(', ');

            const topBrands = Array.from(data.brands).slice(0, 3).join(', ');

            console.log(`${groupId.padEnd(10)} | ${data.count.toString().padEnd(8)} | ${topBrands.padEnd(20)} | ${topWords}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
        await pool2.end();
    }
};

analyzeMissingImages();
