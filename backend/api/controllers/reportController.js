const { pool, pool2 } = require('../db');
const ExcelJS = require('exceljs');

const getMissingImagesReport = async (req, res) => {
    try {
        console.log('Generando reporte de productos sin imágenes...');

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

        // 4. Generar Excel
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

        // Ordenar por grupo
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

        // Configurar headers de la respuesta
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_faltantes.xlsx');

        // Escribir al stream de respuesta
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generando reporte:', error);
        res.status(500).json({ message: 'Error generando el reporte.' });
    }
};

module.exports = {
    getMissingImagesReport
};
