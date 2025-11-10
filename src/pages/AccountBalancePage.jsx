import React, { useState, useMemo } from 'react';
// (CORREGIDO) Se cambió 'Listbox' (que no existe) por 'List'
import { DollarSign, ArrowDown, ArrowUp, ArrowLeft, FilePlus, X, Loader2, AlertTriangle, User, FileText, CheckCircle, Search, List } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAccountBalance, createCreditNoteApi, fetchCustomerInvoicesApi } from '../api/apiService.js';

// --- (NUEVO) Componente del Modal para Nota de Crédito ---
// Lo definimos aquí mismo para mantener todo en un solo archivo
const CreditNoteModal = ({ adminUser, onClose, onSuccess }) => {
  // (MODIFICADO) Cambiamos el ID por el A1_COD
  const [targetUserCod, setTargetUserCod] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  // (NUEVO) Estados para la búsqueda de facturas
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoiceError, setInvoiceError] = useState('');
  
  const queryClient = useQueryClient();

  // (NUEVO) Mutación para BUSCAR facturas
  const invoiceSearchMutation = useMutation({
    mutationFn: fetchCustomerInvoicesApi,
    onSuccess: (data) => {
      if (data.length === 0) {
        setInvoiceError('No se encontraron facturas (débitos) para este cliente.');
        setCustomerInvoices([]);
      } else {
        setCustomerInvoices(data);
        setInvoiceError('');
      }
    },
    onError: (error) => {
      setInvoiceError(error.message || 'Error al buscar facturas.');
      setCustomerInvoices([]);
    }
  });

  // (MODIFICADO) Mutación para CREAR la nota de crédito
  const creditNoteMutation = useMutation({
    mutationFn: createCreditNoteApi,
    onSuccess: (data) => {
      // Éxito: Invalidamos el caché de la cta. cte. del cliente afectado
      // y también la del admin (para ver su débito).
      // Buscamos el ID interno del cliente en la DB (aunque ya lo tenemos, es buena práctica)
      queryClient.invalidateQueries({ queryKey: ['accountBalanceByCod', targetUserCod] }); // Invalidar por COD
      // Invalidamos la query de la página actual, que es la del admin.
      queryClient.invalidateQueries({ queryKey: ['accountBalance', adminUser.id] });
      // Llamamos a la función onSuccess pasada por props (que cierra el modal y muestra msg)
      onSuccess(data.message || 'Nota de crédito creada con éxito.');
    },
    // onError es manejado por el estado 'error' de la mutación
  });

  // (NUEVO) Handler para el botón "Buscar Facturas"
  const handleSearchInvoices = () => {
    if (!targetUserCod.trim()) {
      setInvoiceError('Debe ingresar un Nº de Cliente.');
      return;
    }
    setInvoiceError('');
    setSelectedInvoiceId('');
    setAmount('');
    setReason('');
    invoiceSearchMutation.mutate({ customerCod: targetUserCod, adminUserId: adminUser.id });
  };
  
  // (NUEVO) Handler para cuando se selecciona una factura del dropdown
  const handleInvoiceSelect = (e) => {
    const invoiceId = e.target.value;
    setSelectedInvoiceId(invoiceId);
    
    if (invoiceId) {
      const selected = customerInvoices.find(inv => inv.id.toString() === invoiceId);
      if (selected) {
        // Auto-rellenar campos
        setAmount(selected.importe.toString());
        setReason(`Devolución/Anulación ref. Factura: ${selected.comprobante}`);
      }
    } else {
      // Si des-selecciona, limpiar campos
      setAmount('');
      setReason('');
    }
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    // Limpiamos errores viejos
    creditNoteMutation.reset(); 
    
    if (!targetUserCod.trim()) {
      // Usamos .mutate para setear el error, pero no ejecutamos
      creditNoteMutation.mutate(undefined, {
        onError: () => {} // Evita que se lance un error de mutación
      });
      creditNoteMutation.error = new Error('El Nº de Cliente (A1_COD) es obligatorio.'); // Seteamos el error manualmente
      return;
    }
    
    if (isNaN(numAmount) || numAmount <= 0) {
      creditNoteMutation.mutate(undefined, {
        onError: () => {} 
      });
      creditNoteMutation.error = new Error('El importe debe ser un número positivo.');
      return;
    }

    if (!reason.trim()) {
      creditNoteMutation.mutate(undefined, {
        onError: () => {} 
      });
      creditNoteMutation.error = new Error('Debe ingresar un concepto.');
      return;
    }

    creditNoteMutation.mutate({
      targetUserCod: targetUserCod.trim(), // (MODIFICADO)
      amount: numAmount,
      reason: reason.trim(),
      adminUserId: adminUser.id
    });
  };
  
  const isFormDisabled = creditNoteMutation.isPending || invoiceSearchMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md m-4">
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
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

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Campo Nº Cliente (A1_COD) */}
            <div>
              <label htmlFor="targetUserCod" className="block text-sm font-medium text-gray-700 mb-1">
                Nº de Cliente (A1_COD)
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-grow">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="targetUserCod"
                    type="text" // A1_COD puede ser alfanumérico
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

            {/* (NUEVO) Dropdown de Facturas */}
            {(customerInvoices.length > 0 || invoiceError) && (
              <div>
                <label htmlFor="invoiceSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Factura (Opcional)
                </label>
                <div className="relative">
                  {/* (CORREGIDO) Icono 'List' en lugar de 'Listbox' */}
                  <List className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    id="invoiceSelect"
                    value={selectedInvoiceId}
                    onChange={handleInvoiceSelect}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    disabled={isFormDisabled}
                  >
                    <option value="">-- Seleccionar una factura para auto-rellenar --</option>
                    {customerInvoices.map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {`${new Date(invoice.date).toLocaleDateString('es-AR')} - ${invoice.comprobante} - ${parseFloat(invoice.importe).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`}
                      </option>
                    ))}
                  </select>
                </div>
                {invoiceError && (
                  <p className="mt-1 text-sm text-red-600">{invoiceError}</p>
                )}
              </div>
            )}

            {/* Campo Importe */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Importe (ARS)
              </label>
              <div className="relative">
                <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {/* Campo Concepto */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Concepto / Motivo
              </label>
              <div className="relative">
                <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                <textarea
                  id="reason"
                  rows="3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Devolución pedido #123"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {/* Mensajes de Error de Creación */}
            {creditNoteMutation.isError && (
              <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{creditNoteMutation.error.message}</span>
              </div>
            )}
          </div>

          {/* Pie del Modal (Acciones) */}
          <div className="flex items-center justify-end p-5 border-t border-gray-200 bg-gray-50 rounded-b-lg space-x-3">
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
              disabled={isFormDisabled}
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
// --- (FIN Componente Modal) ---


// Componente de UI para el estado de carga
// ... (código de LoadingSkeleton sin cambios) ...
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    {/* Tarjetas de Saldo */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gray-200 h-32 rounded-lg"></div>
      <div className="bg-gray-200 h-32 rounded-lg"></div>
      <div className="bg-gray-200 h-32 rounded-lg"></div>
    </div>
    {/* Tabla de Movimientos */}
    <div className="bg-gray-200 h-64 rounded-lg"></div>
  </div>
);

// Componente de UI para el estado de error
// ... (código de ErrorMessage sin cambios) ...
const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">Error al cargar el balance</p>
    <p className="text-gray-600 mt-2">{message}</p>
    <p className="text-gray-500 text-sm mt-4">Por favor, intente recargar la página o contacte a soporte.</p>
  </div>
);

// Tarjeta para mostrar saldos
// ... (código de BalanceCard sin cambios) ...
const BalanceCard = ({ title, amount, bgColorClass }) => {
  const formattedAmount = (amount || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        <DollarSign className="w-6 h-6 text-gray-400" />
      </div>
      <p className={`text-3xl font-bold ${bgColorClass}`}>{formattedAmount}</p>
    </div>
  );
};

// Fila de la tabla de movimientos
// ... (código de MovementRow sin cambios) ...
const MovementRow = ({ movement }) => {
  const isPositive = movement.importe >= 0; // (MODIFICADO) Cualquier cosa >= 0 es positiva (Pago, NC)
  const formattedDate = new Date(movement.fecha).toLocaleDateString('es-AR');

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="py-3 px-4 text-sm text-gray-700">{formattedDate}</td>
      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{movement.tipo}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{movement.comprobante}</td>
      <td className={`py-3 px-4 text-sm font-semibold text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <span className="inline-flex items-center">
          {isPositive ? (
            <ArrowUp className="w-4 h-4 mr-1" />
          ) : (
            <ArrowDown className="w-4 h-4 mr-1" />
          )}
          {parseFloat(movement.importe).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
        </span>
      </td>
    </tr>
  );
};


export default function AccountBalancePage({ user, onNavigate }) {
  
  // (NUEVO) Estado para el modal y mensajes
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 1. Reemplazamos useEffect y useState con useQuery
  const { data, isLoading, isError, error } = useQuery({
    // La clave de consulta incluye el user.id. 
    // Si el user.id cambia, React Query automáticamente volverá a fetch.
    queryKey: ['accountBalance', user?.id], 
    
    // La función de consulta ahora usa el servicio de API
    queryFn: () => fetchAccountBalance(user?.id),
    
    // `enabled` previene que la consulta se ejecute si user.id es nulo o undefined
    enabled: !!user?.id, 
    
    staleTime: 1000 * 60 * 2, // 2 minutos de caché
  });

  // (NUEVO) Manejador para cerrar el modal y mostrar mensaje
  const handleModalSuccess = (message) => {
    setSuccessMessage(message);
    setIsModalOpen(false);
    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => setSuccessMessage(''), 3000);
  };
  
  // 2. Extraemos los datos para el renderizado, con valores por defecto
  const balance = data?.balance || { total: 0, disponible: 0, pendiente: 0 };
  const movements = data?.movements || [];

  // 3. Renderizado condicional
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    // Si el error es por falta de user.id, mostramos un mensaje amigable
    const errorMessage = !user?.id 
      ? "No se ha podido identificar al usuario." 
      : error.message;
    return <ErrorMessage message={errorMessage} />;
  }

  return (
    <>
      {/* (NUEVO) Renderizar el modal si está abierto */}
      {isModalOpen && (
        <CreditNoteModal 
          adminUser={user} 
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* (MODIFICADO) Encabezado con botón de volver y botón de admin */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Mi Cuenta Corriente</h1>
              <p className="text-gray-600">Resumen de saldos y últimos movimientos.</p>
            </div>
          </div>
          
          {/* (NUEVO) Botón para Admin */}
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
        
        {/* (NUEVO) Mensaje de éxito global */}
        {successMessage && (
            <div className="mb-6 flex items-center p-4 bg-green-100 text-green-700 rounded-lg shadow-md">
              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
        )}

        {/* Sección de Saldos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <BalanceCard title="Saldo Total" amount={balance.total} bgColorClass={balance.total >= 0 ? "text-green-600" : "text-red-600"} />
          <BalanceCard title="Disponible" amount={balance.disponible} bgColorClass="text-green-600" />
          <BalanceCard title="Pendiente de Imputación" amount={balance.pendiente} bgColorClass="text-yellow-600" />
        </div>

        {/* Sección de Últimos Movimientos */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Últimos Movimientos</h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Comprobante</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movements.length > 0 ? (
                    movements.map((mov) => (
                      <MovementRow key={mov.id} movement={mov} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-6 px-4 text-center text-gray-500">
                        No se registraron movimientos recientes.
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