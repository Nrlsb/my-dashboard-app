// Este archivo ha sido refactorizado para delega la lógica a servicios modulares.
// Mantiene la interfaz original para compatibilidad con el resto de la aplicación.

import apiClient, { setAuthToken } from './core/client';
import { authService } from './services/auth.service';
import { productService } from './services/product.service';
import { orderService } from './services/order.service';
import { adminService } from './services/admin.service';
import { userService } from './services/user.service';
import { commonService } from './services/common.service';

const apiService = {
  // Core & Auth
  authToken: null, // Mantenemos la propiedad por si alguien accede directamente, aunque el cliente maneja el header
  setAuthToken(token) {
    this.authToken = token;
    setAuthToken(token);
  },

  // Método genérico 'request' para compatibilidad (Adapter para Axios)
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      params = null,
      isFormData = false,
      ...customConfig
    } = options;

    const config = {
      method,
      url: endpoint,
      params,
      ...customConfig,
    };

    if (body) {
      config.data = body;
    }

    if (isFormData) {
      config.headers = { ...config.headers, 'Content-Type': 'multipart/form-data' };
    }

    // El interceptor de respuesta de Axios ya devuelve response.data o lanza error
    try {
      return await apiClient.request(config);
    } catch (error) {
      // Re-lanzamos el error (ya procesado por el interceptor)
      throw error;
    }
  },

  // Auth
  login: authService.login,
  register: authService.register,
  fetchUserProfile: authService.fetchUserProfile,
  updateUserProfile: authService.updateUserProfile,
  changePassword: authService.changePassword,

  // Products
  fetchProducts: productService.fetchProducts,
  fetchAllProductsForPDF: productService.fetchAllProductsForPDF,
  fetchProductById: productService.fetchProductById,
  fetchProductByCode: productService.fetchProductByCode,
  fetchProtheusBrands: productService.fetchProtheusBrands,
  getAccessories: productService.getAccessories,
  getProductGroupsDetails: productService.getProductGroupsDetails,
  fetchProductsByGroup: productService.fetchProductsByGroup,
  fetchOffers: productService.fetchOffers,
  fetchNewReleases: productService.fetchNewReleases,
  toggleProductOffer: productService.toggleProductOffer,
  updateProductOfferDetails: productService.updateProductOfferDetails,
  toggleProductNewRelease: productService.toggleProductNewRelease,
  updateProductNewReleaseDetails: productService.updateProductNewReleaseDetails,
  getCustomCollectionProducts: productService.getCustomCollectionProducts,
  generateAiDescription: productService.generateAiDescription,
  saveAiDescription: productService.saveAiDescription,
  batchGenerateAiDescriptions: productService.batchGenerateAiDescriptions,
  getBatchGenerationProgress: productService.getBatchGenerationProgress,
  getExchangeRates: productService.getExchangeRates,

  // Orders
  fetchAccountBalance: orderService.fetchAccountBalance,
  fetchAccountMovements: orderService.fetchAccountMovements,
  fetchOrderHistory: orderService.fetchOrderHistory,
  fetchOrderDetail: orderService.fetchOrderDetail,
  downloadOrderPDF: orderService.downloadOrderPDF,
  downloadOrderCSV: orderService.downloadOrderCSV,
  updateOrderDetails: orderService.updateOrderDetails,
  uploadOrderInvoice: orderService.uploadOrderInvoice,
  downloadOrderInvoice: orderService.downloadOrderInvoice,
  createOrder: orderService.createOrder,
  createCreditNoteApi: orderService.createCreditNoteApi,
  fetchCustomerInvoicesApi: orderService.fetchCustomerInvoicesApi,

  // Admin
  getAdminSellers: adminService.getAdminSellers,
  updateVendorGroupPermissions: adminService.updateVendorGroupPermissions,
  getVendorDeniedProductGroups: adminService.getVendorDeniedProductGroups,
  resetUserPassword: adminService.resetUserPassword,
  assignClientPassword: adminService.assignClientPassword,
  fetchAdminOrderDetailApi: adminService.fetchAdminOrderDetailApi,
  getAdminDashboardPanels: adminService.getAdminDashboardPanels,
  updateDashboardPanel: adminService.updateDashboardPanel,
  getAdminUsers: adminService.getAdminUsers,
  getAdminProductGroups: adminService.getAdminProductGroups,
  getDeniedProductGroups: adminService.getDeniedProductGroups,
  updateUserGroupPermissions: adminService.updateUserGroupPermissions,
  getDeniedProducts: adminService.getDeniedProducts,
  updateUserProductPermissions: adminService.updateUserProductPermissions,
  getGlobalDeniedProducts: adminService.getGlobalDeniedProducts,
  updateGlobalProductPermissions: adminService.updateGlobalProductPermissions,
  getAdmins: adminService.getAdmins,
  addAdmin: adminService.addAdmin,
  removeAdmin: adminService.removeAdmin,
  getRoles: adminService.getRoles,
  createRole: adminService.createRole,
  updateRole: adminService.updateRole,
  deleteRole: adminService.deleteRole,
  getCarouselGroups: adminService.getCarouselGroups,
  createCarouselGroup: adminService.createCarouselGroup,
  updateCarouselGroup: adminService.updateCarouselGroup,
  deleteCarouselGroup: adminService.deleteCarouselGroup,
  addAccessory: adminService.addAccessory,
  removeAccessory: adminService.removeAccessory,
  addCustomGroupItem: adminService.addCustomGroupItem,
  removeCustomGroupItem: adminService.removeCustomGroupItem,
  triggerManualSync: adminService.triggerManualSync,
  triggerFullSync: adminService.triggerFullSync,
  deleteUser: adminService.deleteUser,
  getGlobalSetting: adminService.getGlobalSetting,
  updateGlobalSetting: adminService.updateGlobalSetting,

  // Users (Testing & Vendor)
  getVendedorClients: userService.getVendedorClients,
  getTestUsers: userService.getTestUsers,
  createTestUser: userService.createTestUser,
  deleteTestUser: userService.deleteTestUser,
  getTestUserAnalytics: userService.getTestUserAnalytics,
  getUserAnalytics: userService.getUserAnalytics,
  getAllClients: userService.getAllClients,

  // Common
  sendQuery: commonService.sendQuery,
  uploadVoucher: commonService.uploadVoucher,
  getDashboardPanels: commonService.getDashboardPanels,
  uploadImages: commonService.uploadImages,
  uploadToDrive: commonService.uploadToDrive,
  assignImageToProducts: commonService.assignImageToProducts,
  recordVisit: commonService.recordVisit,
  getAnalytics: commonService.getAnalytics,
  downloadMissingImagesReport: commonService.downloadMissingImagesReport,
};

export default apiService;
