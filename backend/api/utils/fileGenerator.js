const Papa = require('papaparse');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { formatCurrency } = require('./helpers');

/**
 * Generates a CSV buffer from the order items.
 * @param {Array<Object>} items - The items of the order.
 * @returns {Buffer} - The CSV content as a buffer.
 */
async function generateOrderCSV(items) {
    try {
        const dataRows = items.map(item => [
            item.code, // C6_PRODUTO
            item.quantity, // C6_QTDVEN
        ]);

        const csvBody = Papa.unparse(dataRows, {
            delimiter: ';',
            header: false,
        });

        return Buffer.from(csvBody, 'utf-8');
    } catch (error) {
        console.error('Error generating CSV:', error);
        throw new Error('Could not generate order CSV.');
    }
}

/**
 * Generates a "Pedido de Venta" style PDF for the order using pdf-lib.
 * @param {Object} orderData - The complete order data.
 * @returns {Promise<Buffer>} - The PDF content as a buffer.
 */
async function generateOrderPDF(orderData) {
    try {
        const { user, newOrder, items } = orderData;

        // Lógica de parseo de dirección para separar Domicilio, Localidad y Provincia
        let rawAddress = user.a1_endereco || user.a1_dom || '';
        let address = rawAddress;
        let city = user.a1_mun || user.a1_loc || '';
        let province = user.a1_est || user.a1_prov || '';

        // Si faltan localidad o provincia y la dirección tiene comas, intentamos parsear
        // Formato esperado: "Calle Número, LOCALIDAD, PROVINCIA" (ej: "Belgrano 2868, ESPERANZA, SF")
        if ((!city || !province) && rawAddress.includes(',')) {
            const parts = rawAddress.split(',').map(p => p.trim());
            // Asumimos que si hay al menos 3 partes, las últimas 2 son Localidad y Provincia
            if (parts.length >= 3) {
                province = parts.pop(); // La última parte es la Provincia (ej: SF)
                city = parts.pop();     // La penúltima es la Localidad (ej: ESPERANZA)
                address = parts.join(', '); // El resto es el Domicilio
            }
        }

        // Adapt orderData to the invoiceData structure
        // CORRECCIÓN: Mapeo de campos basado en userModel.js (DB Postgres)
        const invoiceData = {
            numero: newOrder.id,
            fechaEmision: new Date(newOrder.created_at).toLocaleDateString('es-AR'),
            sucursal: '',
            cliente: {
                nombre: user.full_name,
                // Soporte para nombres de campos de DB (a1_endereco) y legacy (a1_dom)
                domicilio: address,
                localidad: city,
                provincia: province,
                cuenta: user.a1_cod,
                // Soporte para nombres de campos de DB (a1_cgc) y legacy (a1_cuit)
                cuit: user.a1_cgc || user.a1_cuit || '',
                condIva: user.a1_iva || '',
                // Soporte para nombres de campos de DB (a1_tel)
                telefono: user.a1_tel || '',
                condPago: user.a1_condpago || '',
                vendedor: (user.vendedor && user.vendedor.nombre) ? user.vendedor.nombre : (user.vendedor_nombre || user.a1_vend || ''),
            },
            items: items.map(item => ({
                codigo: item.code,
                descripcion: item.name,
                cantidad: item.quantity,
                precioUnitario: formatCurrency(item.price),
                precioTotal: formatCurrency(item.quantity * item.price)
            })),
            total: formatCurrency(orderData.total)
        };

        const { numero, fechaEmision, sucursal, cliente, items: mappedItems, total: orderTotal } = invoiceData;

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        const { width, height } = page.getSize();

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const margin = 40;
        let y = height - margin;

        // Constants for layout
        const smallTextSize = 9;
        const normalTextSize = 10;
        const titleTextSize = 16;
        const lineSpacing = 14;

        // Helper function to draw text
        const drawText = (text, x, yPos, options = {}) => {
            page.drawText(text || '', {
                x,
                y: yPos,
                font: options.bold ? boldFont : font,
                size: options.size || normalTextSize,
                color: options.color || rgb(0, 0, 0),
            });
        };

        // Helper to center text in a specific width
        const drawCenteredText = (text, xStart, boxWidth, yPos, options = {}) => {
            const textStr = String(text || '');
            const currentFont = options.bold ? boldFont : font;
            const currentSize = options.size || normalTextSize;
            const textWidth = currentFont.widthOfTextAtSize(textStr, currentSize);
            const centerX = xStart + (boxWidth - textWidth) / 2;

            page.drawText(textStr, {
                x: centerX,
                y: yPos,
                font: currentFont,
                size: currentSize,
                color: options.color || rgb(0, 0, 0),
            });
        };

        // === Header ===
        y -= 10;

        // Logo Check
        const logoPath = path.join(__dirname, '../../../src/assets/logo.png');

        if (fs.existsSync(logoPath)) {
            try {
                const logoImageBytes = fs.readFileSync(logoPath);
                const logoImage = await pdfDoc.embedPng(logoImageBytes);
                const logoDims = logoImage.scale(0.5);

                page.drawImage(logoImage, {
                    x: margin,
                    y: y - logoDims.height + 20,
                    width: logoDims.width,
                    height: logoDims.height,
                });
            } catch (imgErr) {
                console.error("Error embedding logo:", imgErr);
            }
        }


        // === Invoice Info Box (CENTRADO MEJORADO) ===
        const infoBoxWidth = 220;
        const infoBoxX = width - margin - infoBoxWidth;

        page.drawRectangle({
            x: infoBoxX,
            y: y - 60,
            width: infoBoxWidth,
            height: 60,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
        });

        const title = 'PEDIDO DE VENTA';
        // Centrado horizontal del título
        drawCenteredText(title, infoBoxX, infoBoxWidth, y - 17, { bold: true, size: titleTextSize });

        page.drawLine({
            start: { x: infoBoxX + 5, y: y - 22 },
            end: { x: infoBoxX + infoBoxWidth - 5, y: y - 22 },
            thickness: 0.5,
        });

        // Ajuste de coordenadas para CENTRAR el bloque de texto dentro del cuadro
        // Cuadro ancho: 220. Bloque estimado: ~130-140px. 
        // Margen izquierdo calculado: ~40px. Margen para valores: ~115px.
        const labelX = infoBoxX + 40;
        const valueX = infoBoxX + 115;

        // Ajuste vertical compacto para que entren las 3 líneas
        let infoY = y - 34; // Subimos un punto para dar aire abajo
        const infoLineSpacing = 12; // Espaciado ligeramente menor para este bloque

        // Línea 1
        drawText('Nro:', labelX, infoY, { bold: true, size: smallTextSize });
        drawText(String(numero), valueX, infoY, { bold: true, size: smallTextSize });

        // Línea 2
        infoY -= infoLineSpacing;
        drawText('Fecha Emisión:', labelX, infoY, { bold: true, size: smallTextSize });
        drawText(fechaEmision, valueX, infoY, { size: smallTextSize });



        y -= 80;

        // === Client Block ===
        page.drawRectangle({
            x: margin,
            y: y - 130,
            width: width - margin * 2,
            height: 130,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
        });

        let clientY = y - 15;
        const clientLeftCol = margin + 10;
        const clientRightCol = width / 2 + 10;
        const labelWidth = 65;

        // Left column
        drawText('Sr./es.:', clientLeftCol, clientY, { bold: true, size: smallTextSize });
        drawText(cliente.nombre, clientLeftCol + labelWidth, clientY, { bold: true, size: smallTextSize });
        clientY -= lineSpacing;
        drawText('Domicilio:', clientLeftCol, clientY, { bold: true, size: smallTextSize });
        drawText(cliente.domicilio, clientLeftCol + labelWidth, clientY, { size: smallTextSize });
        clientY -= lineSpacing;
        drawText('Localidad:', clientLeftCol, clientY, { bold: true, size: smallTextSize });
        drawText(cliente.localidad, clientLeftCol + labelWidth, clientY, { size: smallTextSize });
        clientY -= lineSpacing;
        drawText('Provincia:', clientLeftCol, clientY, { bold: true, size: smallTextSize });
        drawText(cliente.provincia, clientLeftCol + labelWidth, clientY, { size: smallTextSize });

        // Right column
        let clientRightY = y - 15;
        const rightLabelWidth = 60;
        page.drawLine({
            start: { x: width / 2, y: y },
            end: { x: width / 2, y: y - 85 },
            thickness: 0.5,
        });

        drawText('Cta. Nro:', clientRightCol, clientRightY, { bold: true, size: smallTextSize });
        drawText(cliente.cuenta, clientRightCol + rightLabelWidth, clientRightY, { size: smallTextSize });
        clientRightY -= lineSpacing;
        drawText('Cuit:', clientRightCol, clientRightY, { bold: true, size: smallTextSize });
        drawText(cliente.cuit, clientRightCol + rightLabelWidth, clientRightY, { size: smallTextSize });

        clientRightY -= lineSpacing;
        drawText('Tel:', clientRightCol, clientRightY, { bold: true, size: smallTextSize });
        drawText(cliente.telefono, clientRightCol + rightLabelWidth, clientRightY, { size: smallTextSize });

        // Bottom part of client box
        page.drawLine({
            start: { x: margin, y: y - 85 },
            end: { x: width - margin, y: y - 85 },
            thickness: 0.5,
        });
        let clientBottomY = y - 100;


        drawText('Vendedor:', clientRightCol, clientBottomY, { bold: true, size: smallTextSize });
        drawText(cliente.vendedor, clientRightCol + 60, clientBottomY, { size: smallTextSize });

        y -= 140;

        // === Items Table ===
        const tableTop = y;
        const tableHeaderY = y - 15;
        // Adjusted column widths for new layout
        // Total width available: width - margin * 2 = 595.28 - 80 = 515.28
        // Cols: Code, Description, Quantity, Unit Price, Total Price
        const colWidths = [70, 225, 60, 80, 80];
        const tableCols = [
            margin,
            margin + colWidths[0],
            margin + colWidths[0] + colWidths[1],
            margin + colWidths[0] + colWidths[1] + colWidths[2],
            margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
        ];

        page.drawLine({ start: { x: margin, y: tableTop }, end: { x: width - margin, y: tableTop }, thickness: 1.5 });

        // Encabezados
        drawText('Código', tableCols[0] + 5, tableHeaderY, { bold: true, size: smallTextSize });
        drawText('Descripción', tableCols[1] + 5, tableHeaderY, { bold: true, size: smallTextSize });
        drawCenteredText('Cantidad', tableCols[2], colWidths[2], tableHeaderY, { bold: true, size: smallTextSize });
        drawCenteredText('Precio Unit.', tableCols[3], colWidths[3], tableHeaderY, { bold: true, size: smallTextSize });
        drawCenteredText('Subtotal', tableCols[4], colWidths[4], tableHeaderY, { bold: true, size: smallTextSize });

        page.drawLine({ start: { x: margin, y: tableHeaderY - 8 }, end: { x: width - margin, y: tableHeaderY - 8 }, thickness: 1.5 });

        let itemY = tableHeaderY - 20;

        (mappedItems || []).forEach(item => {
            drawText(item.codigo, tableCols[0] + 5, itemY, { size: smallTextSize });
            drawText((item.descripcion || '').substring(0, 45), tableCols[1] + 5, itemY, { size: smallTextSize });

            drawCenteredText(String(item.cantidad || ''), tableCols[2], colWidths[2], itemY, { size: smallTextSize });
            drawCenteredText(String(item.precioUnitario || ''), tableCols[3], colWidths[3], itemY, { size: smallTextSize });
            drawCenteredText(String(item.precioTotal || ''), tableCols[4], colWidths[4], itemY, { size: smallTextSize });

            itemY -= lineSpacing;
        });

        // === Footer (Total) ===
        y = margin + 50;

        // Draw Total Line
        page.drawLine({
            start: { x: width - margin - 200, y: y },
            end: { x: width - margin, y: y },
            thickness: 1
        });

        y -= 20;

        // Draw Total Amount
        drawText('Total del Pedido:', width - margin - 200, y, { bold: true, size: 12 });
        drawText(orderTotal, width - margin - 90, y, { bold: true, size: 12 });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Could not generate order PDF.');
    }
}

module.exports = {
    generateOrderCSV,
    generateOrderPDF,
};