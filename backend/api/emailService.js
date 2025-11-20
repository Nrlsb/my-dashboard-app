/*
* =================================================================
* SERVICIO DE EMAIL (Resend)
* =================================================================
*
* Este archivo maneja la construcción y envío de correos
* transaccionales utilizando Resend.
*
* =================================================================
*/

// Cargar variables de entorno
require('dotenv').config(); 
const { Resend } = require('resend');
const { formatCurrency } = require('./utils/helpers'); // Importar helper

// Inicializar Resend con la API Key del .env
const resend = new Resend(process.env.RESEND_API_KEY);

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
  
  items.forEach(item => {
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
 * Envía un correo de confirmación al COMPRADOR
 */
const sendOrderConfirmationEmail = async (toEmail, orderId, items, total, customerName, attachments = []) => {
  const subject = `Confirmación de tu pedido #${orderId}`;
  const itemsHtml = formatItemsToHTML(items);

  // (CORREGIDO) El 'customerName' ahora viene con el valor de 'full_name'
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
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [toEmail],
      subject: subject,
      html: htmlBody,
      attachments: attachments, // Adjuntar archivos
    });

    if (error) {
      console.error(`Error al enviar email de confirmación a ${toEmail}:`, error);
      throw new Error(error.message);
    }

    console.log(`Email de confirmación enviado a ${toEmail}. ID: ${data.id}`);
    return data;

  } catch (error) {
    console.error('Error en sendOrderConfirmationEmail:', error);
    throw error;
  }
};

/**
 * Envía una notificación de nuevo pedido al VENDEDOR
 */
// (CORREGIDO) Se eliminó el 'ac' al final de la línea de definición
const sendNewOrderNotificationEmail = async (toEmail, orderId, items, total, customer, attachments = []) => {
  // (CORREGIDO) Se cambió 'customer.nombre' por 'customer.full_name'
  const subject = `¡Nuevo Pedido Recibido! #${orderId} de ${customer.full_name}`;
  const itemsHtml = formatItemsToHTML(items);

  // (CORREGIDO) Se cambió 'customer.nombre' por 'customer.full_name'
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
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [toEmail], // Email del vendedor
      subject: subject,
      html: htmlBody,
      attachments: attachments, // Adjuntar archivos
    });

    if (error) {
      console.error(`Error al enviar email de notificación a ${toEmail}:`, error);
      throw new Error(error.message);
    }

    console.log(`Email de notificación enviado a ${toEmail}. ID: ${data.id}`);
    return data;

  } catch (error) {
    console.error('Error en sendNewOrderNotificationEmail:', error);
    throw error;
  }
};


module.exports = {
  sendOrderConfirmationEmail,
  sendNewOrderNotificationEmail,
};