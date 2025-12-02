const express = require('express');
const router = express.Router();
const {
  getProfileController,
  updateProfileController,
  changePasswordController,
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas en este archivo requieren autenticación.
// Aplicamos el middleware a nivel de router.
router.use(authenticateToken);

// --- Endpoints de Perfil ---
router.get('/profile', getProfileController);

router.put('/profile', updateProfileController);

router.put('/change-password', changePasswordController);

module.exports = router;
