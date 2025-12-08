import React, { useState, useMemo } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  FilePlus,
  X,
  Loader2,
  AlertTriangle,
  User,
  FileText,
  CheckCircle,
  Search,
  List,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../api/apiService.js';

// Formateador de moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};

// --- Componente del Modal para Nota de Crédito ---
const CreditNoteModal = ({ adminUser, onClose, onSuccess }) => {
  const [targetUserCod, setTargetUserCod] = useState('');
  const [reason, setReason] = useState('');
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemFetchError, setItemFetchError] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Map());

  const queryClient = useQueryClient();

  const invoiceSearchMutation = useMutation({
    mutationFn: apiService.fetchCustomerInvoicesApi,
    onSuccess: (data) => {
      if (data.length === 0) {
        setInvoiceError(
          'No se encontraron facturas (débitos) con pedidos asociados para este cliente.'
        );
        setCustomerInvoices([]);
      } else {
        setCustomerInvoices(data);
        setInvoiceError('');
      }
    },
    onError: (error) => {
      setInvoiceError(error.message || 'Error al buscar facturas.');
      setCustomerInvoices([]);
    },
  });

  const itemFetchMutation = useMutation({
    mutationFn: apiService.fetchAdminOrderDetailApi,
    onSuccess: (data) => {
      setInvoiceItems(data.items || []);
      setItemFetchError('');
      setSelectedItems(new Map());
    },
    onError: (error) => {
      setItemFetchError(
        error.message || 'Error al cargar los items de la factura.'
      );
      setInvoiceItems([]);
    },
  });

  const creditNoteMutation = useMutation({
    mutationFn: apiService.createCreditNoteApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['accountBalance', adminUser.id],
      });
      onSuccess(data.message || 'Nota de crédito creada con éxito.');
    },
  });

  const handleSearchInvoices = () => {
    if (!targetUserCod.trim()) {
      setInvoiceError('Debe ingresar un Nº de Cliente.');
      return;
    }
    setInvoiceError('');
    setSelectedInvoiceId('');
    setReason('');
    setInvoiceItems([]);
    setSelectedItems(new Map());
    invoiceSearchMutation.mutate({ customerCod: targetUserCod });
  };

  const handleInvoiceSelect = (e) => {
    const invoiceId = e.target.value;
    setSelectedInvoiceId(invoiceId);

    setInvoiceItems([]);
    setSelectedItems(new Map());
    setItemFetchError('');

    if (invoiceId) {
      const selected = customerInvoices.find(
        (inv) => inv.id.toString() === invoiceId
      );
      if (selected && selected.order_ref) {
        itemFetchMutation.mutate({ orderId: selected.order_ref });
        setReason(`Devolución/Anulación ref. Factura: ${selected.comprobante}`);
      }
    } else {
      setReason('');
    }
  };

  const handleItemQuantityChange = (item, newQuantityStr) => {
    const newQuantity = parseInt(newQuantityStr, 10);
    const newMap = new Map(selectedItems);

    if (isNaN(newQuantity) || newQuantity <= 0) {
      newMap.delete(item.product_id);
    } else {
      const finalQuantity = Math.min(newQuantity, item.quantity);
      newMap.set(item.product_id, finalQuantity);
    }
    setSelectedItems(newMap);
  };

  const handleItemToggle = (item, isChecked) => {
    const newMap = new Map(selectedItems);
    if (isChecked) {
      newMap.set(item.product_id, item.quantity);
    } else {
      newMap.delete(item.product_id);
    }
    setSelectedItems(newMap);
  };

  const calculatedTotal = useMemo(() => {
    let total = 0;
    for (const [productId, quantity] of selectedItems.entries()) {
      const item = invoiceItems.find((i) => i.product_id === productId);
      if (item) {
        total += item.unit_price * quantity;
      }
    }
    return total;
  }, [selectedItems, invoiceItems]);

  const handleSubmit = (e) => {
    e.preventDefault();
    creditNoteMutation.reset();

    if (!targetUserCod.trim()) {
      creditNoteMutation.error = new Error(
        'El Nº de Cliente (A1_COD) es obligatorio.'
      );
      return;
    }
    if (!selectedInvoiceId) {
      creditNoteMutation.error = new Error(
        'Debe seleccionar una factura de referencia.'
      );
      return;
    }
    if (selectedItems.size === 0) {
      creditNoteMutation.error = new Error(
        'Debe seleccionar al menos un producto para la nota de crédito.'
      );
      return;
    }
    if (!reason.trim()) {
      creditNoteMutation.error = new Error('Debe ingresar un concepto.');
      return;
    }

    const invoice = customerInvoices.find(
      (inv) => inv.id.toString() === selectedInvoiceId
    );
    if (!invoice) {
      creditNoteMutation.error = new Error(
        'Error interno: No se encontró la factura seleccionada.'
      );
      return;
    }

    const itemsToCredit = [];
    for (const [productId, quantity] of selectedItems.entries()) {
      const originalItem = invoiceItems.find((i) => i.product_id === productId);
      if (originalItem) {
        itemsToCredit.push({
          product_id: originalItem.product_id,
          quantity: quantity,
          unit_price: originalItem.unit_price,
        });
      }
    }

    creditNoteMutation.mutate({
      targetUserCod: targetUserCod.trim(),
      reason: reason.trim(),
      items: itemsToCredit,
      invoiceRefId: invoice.id,
    });
  };

  const isFormDisabled =
    creditNoteMutation.isPending ||
    invoiceSearchMutation.isPending ||
    itemFetchMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <FilePlus className="w-6 h-6 mr-3 text-green-600" />
            Crear Nota de Crédito
          </h3>
          <button
            onClick={onClose}
            disabled={isFormDisabled}
            className="p-2 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            <div>
              <label
                htmlFor="targetUserCod"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nº de Cliente (A1_COD)
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-grow">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="targetUserCod"
                    type="text"
                    value={targetUserCod}
                    onChange={(e) => setTargetUserCod(e.target.value)}
                    placeholder="Ej: 000123"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isFormDisabled}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchInvoices}
                  disabled={isFormDisabled || !targetUserCod}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {invoiceSearchMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  <span className="ml-2 hidden sm:inline">Buscar Facturas</span>
                </button>
              </div>
            </div>

            {(customerInvoices.length > 0 || invoiceError) && (
              <div>
                <label
                  htmlFor="invoiceSelect"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Seleccionar Factura
                </label>
                <div className="relative">
                  <List className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    id="invoiceSelect"
                    value={selectedInvoiceId}
                    onChange={handleInvoiceSelect}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    disabled={isFormDisabled}
                  >
                    <option value="">-- Seleccionar una factura --</option>
                    {customerInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {`${new Date(invoice.date).toLocaleDateString('es-AR')} - ${invoice.comprobante} - ${formatCurrency(invoice.importe)}`}
                      </option>
                    ))}
                  </select>
                </div>
                {invoiceError && (
                  <p className="mt-1 text-sm text-red-600">{invoiceError}</p>
                )}
              </div>
            )}

            {itemFetchMutation.isPending && (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">
                  Cargando productos de la factura...
                </span>
              </div>
            )}
            {itemFetchError && (
              <p className="mt-1 text-sm text-red-600">{itemFetchError}</p>
            )}
            {invoiceItems.length > 0 && (
              <div className="space-y-3 border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-800 mb-3">
                  Productos en la Factura
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                  {invoiceItems.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex items-center space-x-3"
                    >
                      <input
                        type="checkbox"
                        id={`item-${item.product_id}`}
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={selectedItems.has(item.product_id)}
                        onChange={(e) =>
                          handleItemToggle(item, e.target.checked)
                        }
                        disabled={isFormDisabled}
                      />
                      <label
                        htmlFor={`item-${item.product_id}`}
                        className="flex-1 text-sm text-gray-700"
                      >
                        {item.product_name} ({formatCurrency(item.unit_price)})
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={item.quantity}
                        value={selectedItems.get(item.product_id) || ''}
                        onChange={(e) =>
                          handleItemQuantityChange(item, e.target.value)
                        }
                        disabled={
                          !selectedItems.has(item.product_id) || isFormDisabled
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder={`Max: ${item.quantity}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Concepto / Motivo
              </label>
              <div className="relative">
                <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                <textarea
                  id="reason"
                  rows="2"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Devolución por falla"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {calculatedTotal > 0 && (
              <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                <span className="text-lg font-semibold text-gray-800">
                  Total N/C:
                </span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculatedTotal)}
                </span>
              </div>
            )}

            {creditNoteMutation.isError && (
              <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">
                  {creditNoteMutation.error.message}
                </span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center justify-end p-5 border-t border-gray-200 bg-gray-50 rounded-b-lg space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isFormDisabled}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isFormDisabled || calculatedTotal <= 0}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creditNoteMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {creditNoteMutation.isPending ? 'Creando...' : 'Confirmar N/C'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gray-200 h-32 rounded-lg"></div>
      <div className="bg-gray-200 h-32 rounded-lg"></div>
      <div className="bg-gray-200 h-32 rounded-lg"></div>
    </div>
    <div className="bg-gray-200 h-64 rounded-lg"></div>
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">
      Error al cargar el balance
    </p>
    <p className="text-gray-600 mt-2">{message}</p>
    <p className="text-gray-500 text-sm mt-4">
      Por favor, intente recargar la página o contacte a soporte.
    </p>
  </div>
);

const BalanceCard = ({ title, amount, bgColorClass }) => {
  const formattedAmount = (amount || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
        <DollarSign className="w-6 h-6 text-gray-400" />
      </div>
      <p className={`text-3xl font-bold ${bgColorClass}`}>{formattedAmount}</p>
    </div>
  );
};

export default function AccountBalancePage({ user }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    isError: isErrorBalance,
    error: errorBalance,
  } = useQuery({
    queryKey: ['accountBalance', user?.id],
    queryFn: () => apiService.fetchAccountBalance(),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  const {
    data: movementsData,
    isLoading: isLoadingMovements,
    isError: isErrorMovements,
    error: errorMovements,
  } = useQuery({
    queryKey: ['accountMovements', user?.id],
    queryFn: () => apiService.fetchAccountMovements(),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  const handleModalSuccess = (message) => {
    setSuccessMessage(message);
    setIsModalOpen(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const balance = balanceData?.balance || {
    total: 0,
    disponible: 0,
    pendiente: 0,
  };
  const movements = movementsData || [];

  if (isLoadingBalance) {
    return <LoadingSkeleton />;
  }

  if (isErrorBalance) {
    const errorMessage = !user?.id
      ? 'No se ha podido identificar al usuario.'
      : errorBalance.message;
    return <ErrorMessage message={errorMessage} />;
  }

  return (
    <>
      {isModalOpen && (
        <CreditNoteModal
          adminUser={user}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      <div className="p-6 bg-gray-50 min-h-screen">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Mi Cuenta Corriente
              </h1>
              <p className="text-gray-600">
                Resumen de saldos y últimos movimientos.
              </p>
            </div>
          </div>

          {user?.is_admin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
            >
              <FilePlus className="w-5 h-5 mr-2" />
              Crear Nota de Crédito
            </button>
          )}
        </header>

        {successMessage && (
          <div className="mb-6 flex items-center p-4 bg-green-100 text-green-700 rounded-lg shadow-md">
            <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <BalanceCard
            title="Saldo Total"
            amount={balance.total}
            bgColorClass={
              balance.total >= 0 ? 'text-green-600' : 'text-red-600'
            }
          />
          <BalanceCard
            title="Disponible"
            amount={balance.disponible}
            bgColorClass="text-green-600"
          />
          <BalanceCard
            title="Pendiente de Imputación"
            amount={balance.pendiente}
            bgColorClass="text-yellow-600"
          />
        </div>

        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Detalle de Movimientos
          </h2>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {isLoadingMovements ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner text="Cargando movimientos..." />
              </div>
            ) : isErrorMovements ? (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                Error: {errorMovements.message}
              </div>
            ) : movements.length > 0 ? (
              movements.map((mov) => (
                <div key={mov.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="block font-bold text-gray-800 text-sm">
                        {mov.titulo_num || 'S/N'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Emisión: {mov.formatted_date}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Vence: {mov.formatted_fecha_vencimiento || '-'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase">Importe</span>
                      {mov.debit > 0 ? (
                        <span className="font-bold text-red-600">
                          - {formatCurrency(mov.debit)}
                        </span>
                      ) : (
                        <span className="font-bold text-green-600">
                          + {formatCurrency(mov.credit)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-500 uppercase">Saldo</span>
                      <span className="font-bold text-gray-800">
                        {formatCurrency(mov.balance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white rounded-lg text-gray-500">
                No se registraron movimientos.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Num. Titulo
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Fch Emision
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Fch. de Vencimien.
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Debitos
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Creditos
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Saldo Acumulados
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      % Canc.
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      N° Recibo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoadingMovements ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-6 px-4 text-center text-gray-500"
                      >
                        <div className="flex justify-center items-center p-0">
                          <LoadingSpinner text="Cargando movimientos..." />
                        </div>
                      </td>
                    </tr>
                  ) : isErrorMovements ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-6 px-4 text-center text-red-500"
                      >
                        Error al cargar los movimientos:{' '}
                        {errorMovements.message}
                      </td>
                    </tr>
                  ) : movements.length > 0 ? (
                    movements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {mov.titulo_num || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {mov.formatted_date}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {mov.formatted_fecha_vencimiento || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-right text-red-600">
                          {mov.debit ? formatCurrency(mov.debit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-right text-green-600">
                          {mov.credit ? formatCurrency(mov.credit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-right text-gray-800">
                          {formatCurrency(mov.balance)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-700">
                          {mov.porc_cancelado ? `${mov.porc_cancelado}%` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {mov.order_ref || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-6 px-4 text-center text-gray-500"
                      >
                        No se registraron movimientos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
