// backend/api/services/dashboardService.js

const { pool2 } = require('../db');
const dashboardModel = require('../models/dashboardModel');
const productService = require('./productService');

/**
 * Obtiene los paneles del dashboard para un usuario, aplicando la lógica de negocio.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<Array<object>>} - Una promesa que se resuelve con la lista de paneles filtrada.
 */
const getDashboardPanels = async (user) => {
  const isAdmin = user.isAdmin;
  const isVendedor = user.role === 'vendedor';

  let panels = await dashboardModel.findDashboardPanels(isAdmin, isVendedor);

  // Comprobar si el panel de ofertas debe mostrarse
  const offersPanelIndex = panels.findIndex(
    (panel) =>
      panel.navigation_path === 'offers' || panel.navigation_path === '/offers'
  );

  if (offersPanelIndex > -1) {
    // Reutilizamos el servicio de productos para ver si hay ofertas
    const offers = await productService.fetchProtheusOffers(user.userId);
    if (offers.length === 0) {
      // Si no hay ofertas, filtramos el panel de la lista
      panels = panels.filter(
        (panel) =>
          panel.navigation_path !== 'offers' &&
          panel.navigation_path !== '/offers'
      );
    }
  }

  return panels;
};

/**
 * (Admin) Obtiene todos los paneles del dashboard
 */
const getAdminDashboardPanels = async () => {
  try {
    const result = await pool2.query(
      'SELECT * FROM dashboard_panels ORDER BY id'
    );
    return result.rows;
  } catch (error) {
    console.error('Error en getAdminDashboardPanels:', error);
    throw error;
  }
};

/**
 * (Admin) Actualiza la visibilidad de un panel del dashboard
 */
const updateDashboardPanel = async (panelId, isVisible) => {
  try {
    const query = `
      UPDATE dashboard_panels
      SET is_visible = $1
      WHERE id = $2
      RETURNING *;
    `;
    const values = [isVisible, panelId];
    const result = await pool2.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Panel no encontrado al actualizar.');
    }

    console.log(`Visibilidad del panel ${panelId} actualizada a ${isVisible}`);
    return {
      success: true,
      message: 'Visibilidad del panel actualizada.',
      panel: result.rows[0],
    };
  } catch (error) {
    console.error('Error en updateDashboardPanel:', error);
    throw error;
  }
};

module.exports = {
  getDashboardPanels,
  getAdminDashboardPanels,
  updateDashboardPanel,
};
