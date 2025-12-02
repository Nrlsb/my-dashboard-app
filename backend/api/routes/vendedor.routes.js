const express = require('express');
const router = express.Router();
const controllers = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de vendedor requieren autenticación
router.use(authenticateToken);

router.get('/clientes', async (req, res) => {
  console.log(
    `GET /api/vendedor/clientes -> Vendedor ${req.user.userId} consultando sus clientes...`
  );
  await controllers.getVendedorClientsController(req, res);
});

module.exports = router;
