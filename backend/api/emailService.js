/*
 * =================================================================
 * SERVICIO DE EMAIL (Nodemailer)
 * =================================================================
 *
 * Este archivo maneja la construcción y envío de correos
 * transaccionales utilizando Nodemailer (SMTP).
 *
 * =================================================================
 */

// Cargar variables de entorno
require('dotenv').config();
const nodemailer = require('nodemailer');
const { formatCurrency } = require('./utils/helpers'); // Importar helper

// Configurar el transporter de Nodemailer con SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verificar la conexión SMTP al iniciar (opcional, útil para debug)
transporter.verify(function (error, success) {
  if (error) {
    console.error('Error de conexión SMTP:', error);
  } else {
    console.log('Servidor SMTP listo para enviar correos');
  }
});

/**
 * Helper para formatear la lista de items como HTML
 */
const formatItemsToHTML = (items) => {
  let itemsHtml = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Producto</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Cantidad</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Precio Unit.</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach((item) => {
    itemsHtml += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">
          ${item.name || item.product_name}<br>
          <small style="color: #555;">(Cód: ${item.code || item.product_code})</small>
        </td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.price || item.unit_price)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency((item.price || item.unit_price) * item.quantity)}</td>
      </tr>
    `;
  });

  itemsHtml += '</tbody></table>';
  return itemsHtml;
};

/**
 * Normaliza los destinatarios de correo.
 * Reemplaza ';' por ',' y elimina espacios extra.
 * @param {string} emailStr - String con emails separados por coma o punto y coma.
 * @returns {string} - String con emails separados por coma.
 */
const normalizeRecipients = (emailStr) => {
  if (!emailStr) return '';
  // Reemplaza todos los puntos y coma por comas
  // Luego divide por comas, limpia espacios y filtra vacíos
  // Finalmente une de nuevo con comas
  return emailStr.replace(/;/g, ',').split(',').map(e => e.trim()).filter(e => e).join(', ');
};

/**
 * Envía un correo de confirmación al COMPRADOR
 */
const sendOrderConfirmationEmail = async (
  toEmail,
  orderId,
  items,
  total,
  customerName,
  attachments = []
) => {
  const subject = `Confirmación de tu pedido #${orderId}`;
  const itemsHtml = formatItemsToHTML(items);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h1 style="color: #333;">¡Gracias por tu pedido, ${customerName}!</h1>
      <p>Hemos recibido tu pedido #${orderId} y lo estamos procesando.</p>
      <p><strong>Total del Pedido: ${formatCurrency(total)}</strong></p>
      
      <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Resumen del Pedido</h2>
      ${itemsHtml}
      
      <p style="margin-top: 20px;">
        Recibirás otra notificación cuando tu pedido esté listo y haya sido facturado.
      </p>
      <p style="color: #777; font-size: 0.9em;">
        Este es un correo automático, por favor no respondas a esta dirección.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: normalizeRecipients(toEmail),
      subject: subject,
      html: htmlBody,
      attachments: attachments,
    });

    console.log(`Email de confirmación enviado a ${toEmail}. ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error en sendOrderConfirmationEmail:', error);
    throw error;
  }
};

/**
 * Envía una notificación de nuevo pedido al VENDEDOR
 */
const sendNewOrderNotificationEmail = async (
  toEmail,
  orderId,
  items,
  total,
  customer,
  attachments = []
) => {
  const subject = `¡Nuevo Pedido Recibido! #${orderId} de ${customer.full_name}`;
  const itemsHtml = formatItemsToHTML(items);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h1 style="color: #333;">¡Nuevo Pedido Recibido!</h1>
      <p>Se ha generado un nuevo pedido en el portal de clientes.</p>
      
      <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Detalles del Cliente</h2>
      <ul>
        <li><strong>Nombre:</strong> ${customer.full_name}</li>
        <li><strong>Email:</strong> ${customer.email}</li>
        <li><strong>Código Cliente:</strong> ${customer.a1_cod || 'No disponible'}</li>
      </ul>
      
      <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Detalles del Pedido #${orderId}</h2>
      <p><strong>Total del Pedido: ${formatCurrency(total)}</strong></p>
      ${itemsHtml}
      
      <p style="margin-top: 20px; font-weight: bold;">
        Por favor, ingresa al sistema para gestionar el pedido.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: normalizeRecipients(toEmail), // Email del vendedor
      subject: subject,
      html: htmlBody,
      attachments: attachments,
    });

    console.log(`Email de notificación enviado a ${toEmail}. ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error en sendNewOrderNotificationEmail:', error);
    throw error;
  }
};

/**
 * Envía un correo de confirmación al CLIENTE cuando el VENDEDOR confirma el pedido
 */
const sendOrderConfirmedByVendorEmail = async (
  toEmail,
  customerName,
  orderId,
  vendorSalesOrderNumber,
  items = []
) => {
  const subject = vendorSalesOrderNumber
    ? `Tu pedido #${orderId} (Venta: ${vendorSalesOrderNumber}) ha sido confirmado`
    : `Tu pedido #${orderId} ha sido confirmado`;
  const itemsHtml = formatItemsToHTML(items);

  let salesOrderInfo = '';
  if (vendorSalesOrderNumber) {
    salesOrderInfo = `<p><strong>Número de Pedido de Venta: ${vendorSalesOrderNumber}</strong></p>`;
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h1 style="color: #333;">¡Tu pedido ha sido confirmado!</h1>
      <p>Hola ${customerName},</p>
      <p>Te informamos que tu pedido <strong>#${orderId}</strong> ha sido revisado y confirmado por tu vendedor.</p>
      
      ${salesOrderInfo}
      
      <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Resumen del Pedido</h2>
      ${itemsHtml}

      <p>El estado de tu pedido ha cambiado a <strong>Confirmado</strong>.</p>
      <p>Pronto recibirás más novedades sobre el envío o entrega.</p>
      
      <p style="margin-top: 20px;">
        Gracias por confiar en nosotros.
      </p>
      <p style="color: #777; font-size: 0.9em;">
        Este es un correo automático, por favor no respondas a esta dirección.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: normalizeRecipients(toEmail),
      subject: subject,
      html: htmlBody,
    });

    console.log(
      `Email de confirmación por vendedor enviado a ${toEmail}. ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error('Error en sendOrderConfirmedByVendorEmail:', error);
    throw error;
  }
};

const sendInvoiceAvailableEmail = async (
  toEmail,
  customerName,
  orderId,
  invoiceUrl
) => {
  const subject = `Factura disponible para tu pedido #${orderId}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h1 style="color: #333;">Factura Disponible</h1>
      <p>Hola ${customerName},</p>
      <p>Te informamos que la factura correspondiente a tu pedido <strong>#${orderId}</strong> ya está disponible.</p>
      
      <p>Puedes verla y descargarla ingresando a tu cuenta en nuestra web, desde la sección de <strong>Historial de Pedidos</strong>.</p>
      
      <p style="margin-top: 20px;">
        Gracias por tu compra.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: normalizeRecipients(toEmail),
      subject: subject,
      html: htmlBody,
    });
    console.log(`Email de factura enviado a ${toEmail}. ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error en sendInvoiceAvailableEmail:', error);
    // No lanzamos error para no fallar el request original, solo logueamos
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendNewOrderNotificationEmail,
  sendOrderConfirmedByVendorEmail,
  sendInvoiceAvailableEmail,
  // Exportar helper para testing si fuera necesario, aunque es interno
  // normalizeRecipients 
};
