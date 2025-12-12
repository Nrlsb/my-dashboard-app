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
  getDeniedProductsByUserController,
  updateUserProductPermissionsController,
  getGlobalDeniedProductsController,
  updateGlobalProductPermissionsController,
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

router.get(
  '/users/:userId/denied-products',
  requireAdmin,
  getDeniedProductsByUserController
);

router.put(
  '/users/:userId/denied-products',
  requireAdmin,
  updateUserProductPermissionsController
);

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

module.exports = router;
