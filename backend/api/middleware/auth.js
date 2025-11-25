const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    return res
      .status(401)
      .json({ message: 'No autorizado: Token no proporcionado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (err) {
      console.error('Error de verificación de JWT:', err.message);
      return res
        .status(403)
        .json({ message: 'Prohibido: Token no válido o expirado.' });
    }

    req.user = userPayload;
    req.userId = userPayload.userId;
    console.log('[DEBUG AUTH] userPayload después de verificar JWT:', userPayload);
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.isAdmin) {
      next();
    } else {
      return res
        .status(403)
        .json({
          message: 'Acceso denegado. Requiere permisos de administrador.',
        });
    }
  } catch (error) {
    console.error('Error en middleware requireAdmin:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (!err) {
      req.user = userPayload;
      req.userId = userPayload.userId;
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuthenticateToken,
};
