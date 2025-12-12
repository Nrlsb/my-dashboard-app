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

        // 2.5. Obtener productos restringidos globalmente
        const restrictedResult = await pool2.query(
            'SELECT product_id FROM global_product_permissions'
        );
        const restrictedProductIds = new Set(restrictedResult.rows.map(row => row.product_id));

        // 3. Filtrar los que NO tienen imágenes Y NO están restringidos
        const missingProducts = activeProducts.filter(p => !productIdsWithImages.has(p.id) && !restrictedProductIds.has(p.id));
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

        // 6. Generar Excel
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Productos Faltantes');

        // Definir columnas
        worksheet.columns = [
            { header: 'Grupo', key: 'group', width: 20 },
            { header: 'Código', key: 'code', width: 15 },
            { header: 'Descripción', key: 'description', width: 50 },
            { header: 'Marca', key: 'brand', width: 20 }
        ];

        // Estilo para el encabezado
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFCCCCCC' }
        };

        // Agregar filas
        // Ordenar primero por grupo (ya están agrupados en sortedGroups, pero missingProducts es la lista plana)
        // Vamos a usar missingProducts pero ordenados por grupo para que quede bonito
        const sortedMissingProducts = missingProducts.sort((a, b) => {
            const groupA = a.product_group || 'SIN_GRUPO';
            const groupB = b.product_group || 'SIN_GRUPO';
            return groupA.localeCompare(groupB);
        });

        sortedMissingProducts.forEach(p => {
            worksheet.addRow({
                group: p.product_group || 'SIN_GRUPO',
                code: p.code,
                description: p.description,
                brand: p.brand
            });
        });

        await workbook.xlsx.writeFile('reporte_faltantes.xlsx');
        console.log('\nExcel generado exitosamente: reporte_faltantes.xlsx');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
        await pool2.end();
    }
};

analyzeMissingImages();
