// backend/api/services/accountingService.js

const accountingModel = require('../models/accountingModel');

/**
 * (Admin) Crea una Nota de Crédito (NC) para un cliente.
 * @param {string} targetUserCod - Código del cliente.
 * @param {string} reason - Motivo de la NC.
 * @param {Array} items - Items para calcular el total.
 * @param {string} invoiceRefId - ID de la factura de referencia.
 * @param {number} adminUserId - ID del admin que crea la NC.
 * @returns {Promise<object>}
 */
const createCreditNote = async (
  targetUserCod,
  reason,
  items,
  invoiceRefId,
  adminUserId
) => {
  // 1. Verificar que el cliente (targetUserCod) existe
  const user = await accountingModel.findUserByCustomerCode(targetUserCod);
  if (!user) {
    throw new Error(
      `El cliente con código ${targetUserCod} no existe en la base de datos.`
    );
  }
  const targetUserId = user.id;

  // 2. Calcular el total de la NC basado en los items
  let totalCreditAmount = 0;
  for (const item of items) {
    totalCreditAmount += item.quantity * item.unit_price;
  }

  if (totalCreditAmount <= 0) {
    throw new Error('El monto de la nota de crédito debe ser positivo.');
  }

  // 3. Insertar el movimiento en 'account_movements'
  const description = `Nota de Crédito (Admin: ${adminUserId}): ${reason}. Ref Fact: ${invoiceRefId}.`;
  const movement = await accountingModel.insertCreditNoteMovement(
    targetUserId,
    totalCreditAmount,
    description
  );

  console.log(
    `Nota de Crédito creada por Admin ${adminUserId} para Cliente ${targetUserCod}. Monto: ${totalCreditAmount}`
  );

  return {
    success: true,
    message: 'Nota de crédito creada exitosamente.',
    movement,
  };
};

/**
 * (Admin) Busca facturas de un cliente (para referencia de NC).
 * @param {string} customerCod - Código del cliente.
 * @returns {Promise<Array<object>>}
 */
const fetchCustomerInvoices = async (customerCod) => {
  const invoices =
    await accountingModel.findInvoicesByCustomerCode(customerCod);
  if (invoices.length === 0) {
    console.log(`No se encontraron facturas para el código: ${customerCod}`);
  }
  return invoices;
};

module.exports = {
  createCreditNote,
  fetchCustomerInvoices,
};
