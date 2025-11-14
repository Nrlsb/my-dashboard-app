const nodemailer = require('nodemailer');

// 1. Configurar el "transporter" de nodemailer
// Usará las variables de entorno que definimos en .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true para puerto 465, false para otros puertos como 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 2. Función para generar el HTML del correo del cliente
function generateCustomerEmailHtml(order, customer) {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td>${item.name || `Producto ID: ${item.id}`}</td>
      <td>${item.quantity}</td>
      <td>$${parseFloat(item.price).toFixed(2)}</td>
      <td>$${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { width: 90%; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .total { font-weight: bold; font-size: 1.2em; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>¡Gracias por tu pedido, ${customer.name}!</h2>
          <p>Hemos recibido tu pedido y lo estamos procesando. Aquí están los detalles:</p>
          <p>
            <strong>Número de Pedido:</strong> ${order.id}<br>
            <strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString('es-AR')}<br>
            <strong>Método de Pago:</strong> ${order.paymentMethod}
          </p>
          
          <h3>Resumen del Pedido</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="total">
            Total del Pedido: $${parseFloat(order.total).toFixed(2)}
          </div>
          
          <p style="margin-top: 20px;">Gracias por confiar en nosotros.</p>
        </div>
      </body>
    </html>
  `;
}

// 3. Función para generar el HTML del correo del vendedor
function generateSellerEmailHtml(order, customer) {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td>${item.name || `Producto ID: ${item.id}`} (ID: ${item.id})</td>
      <td>${item.quantity}</td>
      <td>$${parseFloat(item.price).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { width: 90%; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f4f4f4; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>¡Nuevo Pedido Recibido!</h2>
          <p>Has recibido un nuevo pedido del cliente:</p>
          <p>
            <strong>Cliente:</strong> ${customer.name}<br>
            <strong>Email:</strong> ${customer.email}<br>
            <strong>ID de Cliente:</strong> ${customer.id}
          </p>
          
          <h3>Detalles del Pedido (ID: ${order.id})</h3>
          <p>
            <strong>Total:</strong> $${parseFloat(order.total).toFixed(2)}<br>
            <strong>Método de Pago:</strong> ${order.paymentMethod}
          </p>

          <h4>Productos:</h4>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}


// 4. Función principal que envía ambos correos
const sendOrderConfirmationEmails = async (order, customer) => {
  try {
    // Generar el contenido de cada email
    const customerHtml = generateCustomerEmailHtml(order, customer);
    const sellerHtml = generateSellerEmailHtml(order, customer);

    // Opciones del correo para el cliente
    const mailOptionsCustomer = {
      from: `"Tu Tienda" <${process.env.EMAIL_USER}>`,
      to: customer.email,
      subject: `Confirmación de tu pedido #${order.id}`,
      html: customerHtml,
    };

    // Opciones del correo para el vendedor
    const mailOptionsSeller = {
      from: `"Notificaciones Tienda" <${process.env.EMAIL_USER}>`,
      to: process.env.SELLER_EMAIL,
      subject: `¡Nuevo Pedido! Cliente: ${customer.name} - Pedido #${order.id}`,
      html: sellerHtml,
    };

    // Enviar ambos correos
    // Podemos usar Promise.all para enviarlos en paralelo
    await Promise.all([
      transporter.sendMail(mailOptionsCustomer),
      transporter.sendMail(mailOptionsSeller)
    ]);

    console.log('Correos de confirmación (cliente y vendedor) enviados exitosamente.');

  } catch (error) {
    console.error('Error al enviar uno o más correos de confirmación:', error);
    // Lanzamos el error para que el controlador lo atrape si es necesario,
    // aunque en createOrder lo ignoraremos para no afectar al usuario.
    throw error;
  }
};

module.exports = { sendOrderConfirmationEmails };