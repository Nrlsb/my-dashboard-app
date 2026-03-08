const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const contactRequestModel = require('../models/contactRequestModel');
const provinceRoutingModel = require('../models/provinceRoutingModel');
const logger = require('../utils/logger');

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Provincias válidas de Argentina
const PROVINCIAS_VALIDAS = [
    'Buenos Aires',
    'CABA',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
];

exports.submitContactRequest = catchAsync(async (req, res, next) => {
    const { cuit_cuil, nombre_apellido, telefono, email, provincia, provincia_detectada } = req.body;

    // Validaciones
    if (!cuit_cuil || !nombre_apellido || !telefono || !email || !provincia) {
        return next(new AppError('Todos los campos son obligatorios.', 400));
    }

    // Validar formato email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return next(new AppError('El email no tiene un formato válido.', 400));
    }

    // Validar provincia
    if (!PROVINCIAS_VALIDAS.includes(provincia)) {
        return next(new AppError('La provincia seleccionada no es válida.', 400));
    }

    // Guardar en BD
    const request = await contactRequestModel.createContactRequest({
        cuit_cuil,
        nombre_apellido,
        telefono,
        email,
        provincia,
    });

    logger.info(`Nueva solicitud de contacto recibida: ${nombre_apellido} (${email})`);

    // Buscar el vendedor asignado a la provincia
    let routingEmail = null;
    let routingName = null;
    try {
        const routing = await provinceRoutingModel.getByProvincia(provincia);
        if (routing) {
            routingEmail = routing.seller_email;
            routingName = routing.seller_name;
        }
    } catch (routingErr) {
        logger.error('Error buscando routing de provincia:', routingErr.message);
    }

    // Enviar email de notificación (no bloquea la respuesta)
    try {
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const adminEmail = routingEmail || process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;

        const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B3D68; border-bottom: 3px solid #7BBF42; padding-bottom: 10px;">
          Nueva Solicitud de Acceso
        </h1>
        <p>Se ha recibido una nueva solicitud de acceso al sistema:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; width: 40%;">CUIT/CUIL</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(cuit_cuil)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Nombre y Apellido</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(nombre_apellido)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Teléfono</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(telefono)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(email)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Provincia</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(provincia)}</td>
          </tr>
          ${provincia_detectada && provincia_detectada !== provincia ? `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #fff3cd;">Provincia detectada (IP)</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #856404;">${escapeHtml(provincia_detectada)} <em style="font-size:0.85em;">(el usuario la cambió manualmente)</em></td>
          </tr>
          ` : ''}
        </table>

        <p style="color: #777; font-size: 0.9em;">
          Este es un correo automático generado por el sistema.
        </p>
      </div>
    `;

        transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: adminEmail,
            subject: `Nueva Solicitud de Acceso - ${nombre_apellido} (${provincia})`,
            html: htmlBody,
        }).catch((err) => {
            logger.error('Error enviando email de notificación de solicitud:', err.message);
        });
    } catch (emailError) {
        logger.error('Error preparando email de notificación:', emailError.message);
        // No bloquear la respuesta por un error de email
    }

    res.status(201).json({
        success: true,
        message: '¡Solicitud enviada correctamente! Nos pondremos en contacto contigo a la brevedad.',
        data: { id: request.id },
    });
});
