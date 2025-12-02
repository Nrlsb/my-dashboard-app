const express = require('express');
const router = express.Router();
const {
  createCreditNoteController,
  getCustomerInvoicesController,
} = require('../controllers/accountingController');
const {
  fetchAdminOrderDetails,
  getUsersForAdmin,
  getProductGroupsForAdmin,
  getDeniedProductGroupsByUserController,
  updateUserGroupPermissions,
  getAdmins,
  addAdmin,
  removeAdmin,
  getAllClientsController,
} = require('../controllers/adminController');
const {
  getAdminDashboardPanelsController,
  updateDashboardPanelController,
} = require('../controllers/dashboardController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas en este archivo requieren autenticación y permisos de administrador.
router.use(authenticateToken);
router.use(requireAdmin);

router.post('/credit-note', createCreditNoteController);

router.get('/customer-invoices/:cod', getCustomerInvoicesController);

router.get('/order-details/:id', fetchAdminOrderDetails);

router.get('/users', getUsersForAdmin);

router.get('/product-groups', getProductGroupsForAdmin);

router.get(
  '/users/:userId/product-groups',
  getDeniedProductGroupsByUserController
);

router.put('/users/:userId/product-groups', updateUserGroupPermissions);

router.get('/dashboard-panels', getAdminDashboardPanelsController);

router.put('/dashboard-panels/:id', updateDashboardPanelController);

router.get('/management/admins', getAdmins);

router.post('/management/admins', addAdmin);

router.delete('/management/admins/:userId', removeAdmin);

// (NUEVO) Ruta para obtener todos los clientes
router.get('/clients', getAllClientsController); // Add the new route

module.exports = router;
