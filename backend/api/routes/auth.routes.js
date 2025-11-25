const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { loginController, registerController } = require('../controllers'); // Importar controladores específicos

// --- Rate Limiter for login ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window` (here, per 15 minutes)
  message:
    'Demasiados intentos de inicio de sesión desde esta IP, por favor intente de nuevo después de 15 minutos',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// --- Autenticación ---
router.post('/login', loginLimiter, loginController);

router.post('/register', registerController);

module.exports = router;
