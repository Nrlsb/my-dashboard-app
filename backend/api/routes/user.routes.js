const express = require('express');
const router = express.Router();
const {
  getProfileController,
  updateProfileController,
  changePasswordController,
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// --- Endpoints de Perfil ---
router.get('/profile', authenticateToken, getProfileController);

router.put('/profile', authenticateToken, updateProfileController);

router.put('/change-password', authenticateToken, changePasswordController);

module.exports = router;
