// backend/api/services/dashboardService.js

const dashboardModel = require('../models/dashboardModel');
const productService = require('./productService');

/**
 * Obtiene los paneles del dashboard para un usuario, aplicando la lógica de negocio.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<Array<object>>} - Una promesa que se resuelve con la lista de paneles filtrada.
 */
const getDashboardPanels = async (userId) => {
  const isAdmin = await dashboardModel.isUserAdmin(userId);
  let panels = await dashboardModel.findDashboardPanels(isAdmin);

  // Comprobar si el panel de ofertas debe mostrarse
  const offersPanelIndex = panels.findIndex(panel => panel.navigation_path === 'offers');

  if (offersPanelIndex > -1) {
    // Reutilizamos el servicio de productos para ver si hay ofertas
    const offers = await productService.fetchProtheusOffers(userId);
    if (offers.length === 0) {
      // Si no hay ofertas, filtramos el panel de la lista
      panels = panels.filter(panel => panel.navigation_path !== 'offers');
    }
  }

  return panels;
};

module.exports = {
  getDashboardPanels,
};
