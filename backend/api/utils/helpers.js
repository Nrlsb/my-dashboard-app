// --- Helper ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Elimina campos de precios de un objeto o array de objetos.
 * Útil para la vista pública (invitados).
 */
const stripPrices = (data) => {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => stripPrices(item));
  }

  if (typeof data === 'object') {
    const { price, formattedPrice, originalPrice, unit_price, ...rest } = data;
    return rest;
  }

  return data;
};

module.exports = { formatCurrency, stripPrices };

