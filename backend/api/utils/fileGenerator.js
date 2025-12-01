const Papa = require('papaparse');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Generates a CSV buffer from the order items.
 * The CSV will contain: product row, product code, and quantity.
 * @param {Array<Object>} items - The items of the order.
 * @returns {Buffer} - The CSV content as a buffer.
 */
async function generateOrderCSV(items) {
  try {
    // 1. Definir la cabecera personalizada
    const customHeader = 'CANAL;C6_ITEM;C6_PRODUTO;C6_QTDVEN';

    // 2. Mapear los datos a un array de arrays para papaparse
    const dataRows = items.map((item, index) => [
      'CS6', // CANAL
      index + 1, // C6_ITEM
      item.code, // C6_PRODUTO
      item.quantity, // C6_QTDVEN
    ]);

    // 3. Convertir los datos a CSV usando ';' como delimitador y sin cabecera automática
    const csvBody = Papa.unparse(dataRows, {
      delimiter: ';',
      header: false,
    });

    // 4. Unir la cabecera personalizada con el cuerpo del CSV
    const csvString = `${customHeader}\n${csvBody}`;

    // 5. Convertir la cadena final a un Buffer para el adjunto del correo
    return Buffer.from(csvString, 'utf-8');
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Could not generate order CSV.');
  }
}

const { formatCurrency } = require('./helpers');

/**
 * Generates a "Pedido de Venta" style PDF for the order.
 * @param {Object} orderData - The complete order data.
 * @param {Object} orderData.user - Customer data { full_name, a1_cod, a1_dom, a1_loc, a1_prov, a1_cuit, a1_iva, a1_tel, a1_vend, a1_condpago }.
 * @param {Object} orderData.newOrder - Order metadata { id, created_at }.
 * @param {Array<Object>} orderData.items - Array of products in the order.
 * @param {number} orderData.total - The total amount of the order.
 * @returns {Promise<Buffer>} - The PDF content as a buffer.
 */
async function generateOrderPDF(orderData) {
  try {
    const { user, newOrder, items } = orderData;
    
    // Adapt orderData to the invoiceData structure
    const invoiceData = {
        numero: newOrder.id,
        fechaEmision: new Date(newOrder.created_at).toLocaleDateString('es-AR'),
        sucursal: '', // Not available in orderData, can be added if needed
        cliente: {
            nombre: user.full_name,
            domicilio: user.a1_dom || '',
            localidad: user.a1_loc || '',
            provincia: user.a1_prov || '',
            cuenta: user.a1_cod,
            cuit: user.a1_cuit || '',
            condIva: user.a1_iva || '',
            telefono: user.a1_tel || '',
            condPago: user.a1_condpago || '',
            vendedor: user.a1_vend || '',
        },
        transporte: { // This data is not in orderData, so it's empty
            codigo: '',
            nombre: '',
            cuil: ''
        },
        items: items.map(item => ({
            codigo: item.code,
            descripcion: item.name,
            cantidad: item.quantity,
            cantRes: '' // Not available in orderData
        }))
    };
    
    const { numero, fechaEmision, sucursal, cliente, transporte, items: mappedItems } = invoiceData;

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

    // === Header ===
    y -= 10;
    
    // Embed Logo
    const logoPath = path.join(__dirname, '../../../../src/assets/logo.png');
    if (fs.existsSync(logoPath)) {
        const logoImageBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = logoImage.scale(0.5); // Scale if needed
        page.drawImage(logoImage, {
            x: margin,
            y: y - logoDims.height + 20,
            width: logoDims.width,
            height: logoDims.height,
        });
    } else {
        // Fallback to placeholder if logo not found
        page.drawRectangle({
            x: margin,
            y: y - 50,
            width: 180,
            height: 50,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
        });
        drawText('Logo not found', margin + 50, y - 30, { size: smallTextSize, color: rgb(0.5, 0.5, 0.5) });
    }


    // Invoice Info Box
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
    const titleWidth = boldFont.widthOfTextAtSize(title, titleTextSize);
    const titleX = infoBoxX + (infoBoxWidth - titleWidth) / 2;
    drawText(title, titleX, y - 15, { bold: true, size: titleTextSize });
    
    page.drawLine({
        start: { x: infoBoxX + 5, y: y - 22 },
        end: { x: infoBoxX + infoBoxWidth - 5, y: y - 22 },
        thickness: 0.5,
    });
    
    let infoY = y - 35;
    drawText('Nro:', infoBoxX + 10, infoY, { bold: true, size: smallTextSize });
    drawText(String(numero), infoBoxX + 90, infoY, { bold: true, size: smallTextSize });
    infoY -= lineSpacing;
    drawText('Fecha Emisión:', infoBoxX + 10, infoY, { bold: true, size: smallTextSize });
    drawText(fechaEmision, infoBoxX + 90, infoY, { size: smallTextSize });
    infoY -= lineSpacing;
    drawText('Nro.Ped.Suc:', infoBoxX + 10, infoY, { bold: true, size: smallTextSize });
    drawText(sucursal, infoBoxX + 90, infoY, { size: smallTextSize });

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
    drawText('Cond. I.V.A:', clientRightCol, clientRightY, { bold: true, size: smallTextSize });
    drawText(cliente.condIva, clientRightCol + rightLabelWidth, clientRightY, { size: smallTextSize });
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
    drawText('Cond. Pago:', clientLeftCol, clientBottomY, { bold: true, size: smallTextSize });
    drawText(cliente.condPago, clientLeftCol + 70, clientBottomY, { size: smallTextSize });
    
    drawText('Vendedor:', clientRightCol, clientBottomY, { bold: true, size: smallTextSize });
    drawText(cliente.vendedor, clientRightCol + 60, clientBottomY, { size: smallTextSize });
    
    y -= 140;
    
    // === Items Table ===
    const tableTop = y;
    const tableHeaderY = y - 15;
    const colWidths = [100, 250, 80, 80];
    const tableCols = [
        margin, 
        margin + colWidths[0], 
        margin + colWidths[0] + colWidths[1], 
        margin + colWidths[0] + colWidths[1] + colWidths[2]
    ];

    page.drawLine({ start: { x: margin, y: tableTop }, end: { x: width - margin, y: tableTop }, thickness: 1.5 });
    drawText('Código', tableCols[0] + 5, tableHeaderY, { bold: true, size: smallTextSize });
    drawText('Descripción', tableCols[1] + 5, tableHeaderY, { bold: true, size: smallTextSize });
    drawText('Cantidad', tableCols[2] + 15, tableHeaderY, { bold: true, size: smallTextSize });
    drawText('Cant. Res.', tableCols[3] + 15, tableHeaderY, { bold: true, size: smallTextSize });
    page.drawLine({ start: { x: margin, y: tableHeaderY - 8 }, end: { x: width - margin, y: tableHeaderY - 8 }, thickness: 1.5 });
    
    let itemY = tableHeaderY - 20;
    let totalItems = 0;
    let totalUnits = 0;

    (mappedItems || []).forEach(item => {
        if (itemY < margin + 120) { 
            // Simplified check for new page logic
        }
        drawText(item.codigo, tableCols[0] + 5, itemY, { size: smallTextSize });
        drawText((item.descripcion || '').substring(0, 50), tableCols[1] + 5, itemY, { size: smallTextSize });
        drawText(String(item.cantidad || ''), tableCols[2] + 25, itemY, { size: smallTextSize });
        drawText(String(item.cantRes || ''), tableCols[3] + 25, itemY, { size: smallTextSize });
        itemY -= lineSpacing;
        totalItems += 1;
        totalUnits += Number(item.cantidad) || 0;
    });

    y = margin + 110;
    
    // === Transport Block ===
    page.drawRectangle({
        x: margin,
        y: y - 60,
        width: width - margin * 2,
        height: 50,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    let transportY = y - 15;
    const transportLabelWidth = 120;
    drawText('Codigo de Transporte:', margin + 10, transportY, { bold: true, size: smallTextSize });
    drawText(transporte.codigo, margin + 10 + transportLabelWidth, transportY, { size: smallTextSize });
    transportY -= lineSpacing;
    drawText('Nombre Transporte:', margin + 10, transportY, { bold: true, size: smallTextSize });
    drawText(transporte.nombre, margin + 10 + transportLabelWidth, transportY, { size: smallTextSize });
    transportY -= lineSpacing;
    drawText('CUIL Transporte:', margin + 10, transportY, { bold: true, size: smallTextSize });
    drawText(transporte.cuil, margin + 10 + transportLabelWidth, transportY, { size: smallTextSize });
    
    // === Footer Totals ===
    const footerY = margin + 20;
    page.drawLine({ start: { x: margin, y: footerY + 15 }, end: { x: width - margin, y: footerY + 15 }, thickness: 1.5 });
    drawText(`Total Items: ${totalItems}`, margin, footerY, { bold: true, size: normalTextSize });
    drawText(`Total Unidades: ${totalUnits}`, margin + 200, footerY, { bold: true, size: normalTextSize });

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
