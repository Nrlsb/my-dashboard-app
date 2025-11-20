const Papa = require('papaparse');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

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
    const dataRows = items.map((item, index) => ([
      'CS6',            // CANAL
      index + 1,        // C6_ITEM
      item.code,        // C6_PRODUTO
      item.quantity,    // C6_QTDVEN
    ]));

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
 * Generates a PDF buffer for the order.
 * @param {Object} orderData - The complete order data.
 * @param {Object} orderData.user - Customer data { full_name, a1_cod }.
 * @param {Object} orderData.newOrder - Order metadata { id, created_at }.
 * @param {Array<Object>} orderData.items - Array of products in the order.
 * @param {number} orderData.total - The total amount of the order.
 * @returns {Promise<Buffer>} - The PDF content as a buffer.
 */
async function generateOrderPDF(orderData) {
  try {
    const { user, newOrder, items, total } = orderData;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    const margin = 50;
    const lineHeigh = 18;

    // --- Título ---
    page.drawText('Detalle del Pedido', {
      x: margin,
      y: y,
      font: boldFont,
      size: 24,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 40;

    // --- Datos del Pedido y Cliente ---
    page.drawText(`Pedido N°: ${newOrder.id}`, { x: margin, y: y, font: boldFont, size: 12 });
    page.drawText(`Fecha: ${new Date(newOrder.created_at).toLocaleDateString('es-AR')}`, { x: width / 2, y: y, font: font, size: 12 });
    y -= lineHeigh;
    page.drawText(`Cliente: ${user.full_name} (Cód: ${user.a1_cod})`, { x: margin, y: y, font: font, size: 12 });
    y -= 30;

    // --- Cabecera de la Tabla ---
    const tableTop = y;
    const tableHeaders = ['Código', 'Descripción', 'Cant.', 'P. Unit.', 'Subtotal'];
    const colX = [margin, 120, 350, 420, 490];

    tableHeaders.forEach((header, i) => {
      page.drawText(header, { x: colX[i], y: y, font: boldFont, size: 10 });
    });
    y -= 20;

    // --- Filas de la Tabla ---
    items.forEach(item => {
      const subtotal = (item.price || 0) * (item.quantity || 0);
      const itemData = [
        String(item.code || '-'),
        String(item.name || '').substring(0, 40), // Acortar descripción
        String(item.quantity || '0'),
        formatCurrency(item.price || 0),
        formatCurrency(subtotal)
      ];

      itemData.forEach((text, i) => {
        page.drawText(text, { x: colX[i], y: y, font: font, size: 10 });
      });
      y -= lineHeigh;
    });
    
    // --- Línea divisoria ---
    y -= 10;
    page.drawLine({
        start: { x: margin, y: y },
        end: { x: width - margin, y: y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });
    y -= 20;

    // --- Total ---
    page.drawText('Total:', { x: colX[3], y: y, font: boldFont, size: 14 });
    page.drawText(formatCurrency(total), { x: colX[4], y: y, font: boldFont, size: 14 });

    // --- Guardar y devolver como Buffer ---
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
