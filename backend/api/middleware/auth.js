const jwt = require('jsonwebtoken');
const { isBlacklisted } = require('../utils/tokenBlacklist');

const getTokenFromRequest = (req) => {
  // Prefer HttpOnly cookie, fall back to Authorization header
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }
  const authHeader = req.headers['authorization'];
  return authHeader && authHeader.split(' ')[1];
};

const authenticateToken = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res
      .status(401)
      .json({ message: 'No autorizado: Token no proporcionado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, userPayload) => {
    if (err) {
      return res
        .status(401)
        .json({ message: 'No autorizado: Token no válido o expirado.' });
    }

    if (await isBlacklisted(token)) {
      return res
        .status(401)
        .json({ message: 'Sesión inválida. Por favor, iniciá sesión nuevamente.' });
    }

    req.user = userPayload;
    req.userId = userPayload.userId;

    next();
  });
};

// Middleware SSE: acepta token por query param porque EventSource no soporta headers personalizados
const authenticateTokenSSE = (req, res, next) => {
  let token = getTokenFromRequest(req);

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: 'No autorizado: Token no proporcionado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, userPayload) => {
    if (err) {
      return res
        .status(401)
        .json({ message: 'No autorizado: Token no válido o expirado.' });
    }

    if (await isBlacklisted(token)) {
      return res
        .status(401)
        .json({ message: 'Sesión inválida. Por favor, iniciá sesión nuevamente.' });
    }

    req.user = userPayload;
    req.userId = userPayload.userId;

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
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, userPayload) => {
    if (!err && !(await isBlacklisted(token))) {
      req.user = userPayload;
      req.userId = userPayload.userId;
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  authenticateTokenSSE,
  requireAdmin,
  optionalAuthenticateToken,
  getTokenFromRequest,
};
