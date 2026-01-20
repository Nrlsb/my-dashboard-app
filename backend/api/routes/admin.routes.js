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
  assignClientPassword,
  getAllSellers,

  getGlobalDeniedProductsController,
  updateGlobalProductPermissionsController,
  deleteUserController,
} = require('../controllers/adminController');
const {
  getAdminDashboardPanelsController,
  updateDashboardPanelController,
} = require('../controllers/dashboardController');
const roleController = require('../controllers/roleController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas en este archivo requieren autenticación.
router.use(authenticateToken);

const { requireMarketingOrAdmin, requirePermission } = require('../middleware/roleAuth');

router.post('/credit-note', requireAdmin, createCreditNoteController);

router.get('/customer-invoices/:cod', requireAdmin, getCustomerInvoicesController);

router.get('/order-details/:id', requireAdmin, fetchAdminOrderDetails);

router.get('/users', requirePermission('manage_admins'), getUsersForAdmin);

router.get('/product-groups', requireAdmin, getProductGroupsForAdmin);

router.get(
  '/users/:userId/product-groups',
  requireAdmin,
  getDeniedProductGroupsByUserController
);

router.put('/users/:userId/product-groups', requireAdmin, updateUserGroupPermissions);



router.get('/global-restrictions', requireAdmin, getGlobalDeniedProductsController);
router.put('/global-restrictions', requireAdmin, updateGlobalProductPermissionsController);

router.get('/dashboard-panels', requireAdmin, getAdminDashboardPanelsController);

router.put('/dashboard-panels/:id', requireAdmin, updateDashboardPanelController);

router.get('/management/admins', requirePermission('manage_admins'), getAdmins);

router.post('/management/admins', requirePermission('manage_admins'), addAdmin);

router.delete('/management/admins/:userId', requirePermission('manage_admins'), removeAdmin);

// Role Management
router.get('/roles', requirePermission('manage_admins'), roleController.getRoles);
router.post('/roles', requirePermission('manage_admins'), roleController.createRole);
router.put('/roles/:id', requirePermission('manage_admins'), roleController.updateRole);
router.delete('/roles/:id', requirePermission('manage_admins'), roleController.deleteRole);

// (NUEVO) Ruta para obtener todos los clientes
router.get('/clients', requireAdmin, getAllClientsController); // Add the new route

// (NUEVO) Ruta para obtener todos los vendedores
router.get('/sellers', requireAdmin, getAllSellers);

const { updateVendorClientsGroupPermissions } = require('../controllers/adminController');
router.put('/sellers/:vendedorCode/product-groups', requireAdmin, updateVendorClientsGroupPermissions);

const analyticsController = require('../controllers/analyticsController');
router.get('/users/:userId/analytics', requireAdmin, analyticsController.getUserAnalytics);

// (NUEVO) Ruta para resetear contraseña de usuario
const { resetUserPassword } = require('../controllers/adminController');
router.put('/users/:userId/password', requireAdmin, resetUserPassword);

// (NUEVO) Ruta para asignar contraseña a clientes (incluso sin usuario en BD)
router.post('/users/assign-password', requireAdmin, assignClientPassword);

// (NUEVO) Ruta para eliminar usuario
router.delete('/users/:userId', requirePermission('manage_admins'), deleteUserController);

const {
  getCarouselGroups,
  createCarouselGroup,
  updateCarouselGroup,
  deleteCarouselGroup,
  addAccessory,
  removeAccessory,
  addCustomGroupItem,
  removeCustomGroupItem,
} = require('../controllers/adminContentController');

// Carousel Content Management
// Carousel Content Management - Accessible by Marketing or Admin
router.get('/carousel-groups', requireMarketingOrAdmin, getCarouselGroups);
router.post('/carousel-groups', requireMarketingOrAdmin, createCarouselGroup);
router.put('/carousel-groups/:id', requireMarketingOrAdmin, updateCarouselGroup);
router.delete('/carousel-groups/:id', requireMarketingOrAdmin, deleteCarouselGroup);

router.post('/accessories', requireMarketingOrAdmin, addAccessory);
router.delete('/accessories/:productId', requireMarketingOrAdmin, removeAccessory);

router.post('/custom-collection/:groupId/items', requireMarketingOrAdmin, addCustomGroupItem);
router.delete('/custom-collection/:groupId/items/:productId', requireMarketingOrAdmin, removeCustomGroupItem);

const { triggerProductSync, triggerFullSync, getSyncEvents } = require('../controllers/adminController');
router.get('/sync-events', requireAdmin, getSyncEvents);
router.post('/sync-products', requireAdmin, triggerProductSync);
router.post('/sync-full', requireAdmin, triggerFullSync);

module.exports = router;
