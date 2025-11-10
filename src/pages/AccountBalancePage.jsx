import React, { useState } from 'react';
// (NUEVO) Importar iconos, hook de modal, y cliente de query
import { DollarSign, ArrowDown, ArrowUp, ArrowLeft, FilePlus, X, Loader2, AlertTriangle, User, FileText, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// (NUEVO) Importar la nueva función de API
import { fetchAccountBalance, createCreditNoteApi } from '../api/apiService';

// --- (NUEVO) Componente del Modal para Nota de Crédito ---
// Lo definimos aquí mismo para mantener todo en un solo archivo
const CreditNoteModal = ({ adminUser, onClose, onSuccess }) => {
  const [targetUserId, setTargetUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  
  const queryClient = useQueryClient();

  // Mutación para crear la nota de crédito
  const mutation = useMutation({
    mutationFn: createCreditNoteApi,
    onSuccess: (data) => {
      // Éxito: Invalidamos el caché de la cta. cte. del cliente afectado
      // y también la del admin (para ver su débito).
      queryClient.invalidateQueries({ queryKey: ['accountBalance', parseInt(targetUserId, 10)] });
      queryClient.invalidateQueries({ queryKey: ['accountBalance', adminUser.id] });
      // Llamamos a la función onSuccess pasada por props (que cierra el modal)
      onSuccess(data.message || 'Nota de crédito creada con éxito.');
    },
    // onError es manejado por el estado 'error' de la mutación
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const numTargetUserId = parseInt(targetUserId, 10);

    if (isNaN(numTargetUserId) || numTargetUserId <= 0) {
      mutation.reset(); // Limpia errores anteriores
      mutation.mutate(null, { onError: () => {} }); // Truco para setear error
      mutation.variables = null; // Limpia variables
      mutation.error = new Error('El ID de Cliente debe ser un número válido.');
      return;
    }
    
    if (isNaN(numAmount) || numAmount <= 0) {
      mutation.reset();
      mutation.mutate(null, { onError: () => {} });
      mutation.variables = null;
      mutation.error = new Error('El importe debe ser un número positivo.');
      return;
    }

    if (!reason.trim()) {
      mutation.reset();
      mutation.mutate(null, { onError: () => {} });
      mutation.variables = null;
      mutation.error = new Error('Debe ingresar un concepto.');
      return;
    }

    mutation.mutate({
      targetUserId: numTargetUserId,
      amount: numAmount,
      reason,
      adminUserId: adminUser.id
    });
  };

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
            disabled={mutation.isPending}
            className="p-2 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Campo ID Cliente */}
            <div>
              <label htmlFor="targetUserId" className="block text-sm font-medium text-gray-700 mb-1">
                ID de Cliente a acreditar
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="targetUserId"
                  type="number"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Ej: 42"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={mutation.isPending}
                />
              </div>
            </div>

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
                  disabled={mutation.isPending}
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
                  disabled={mutation.isPending}
                />
              </div>
            </div>

            {/* Mensajes de Error */}
            {mutation.isError && (
              <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{mutation.error.message}</span>
              </div>
            )}
          </div>

          {/* Pie del Modal (Acciones) */}
          <div className="flex items-center justify-end p-5 border-t border-gray-200 bg-gray-50 rounded-b-lg space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {mutation.isPending ? 'Creando...' : 'Confirmar N/C'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- (FIN Componente Modal) ---


// Componente de UI para el estado de carga
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
const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">Error al cargar el balance</p>
    <p className="text-gray-600 mt-2">{message}</p>
    <p className="text-gray-500 text-sm mt-4">Por favor, intente recargar la página o contacte a soporte.</p>
  </div>
);

// Tarjeta para mostrar saldos
const BalanceCard = ({ title, amount, bgColorClass, isCurrency = true }) => {
  const formattedAmount = isCurrency
    ? (amount || 0).toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
      })
    : amount;

  // (MODIFICADO) Ajusta el color del texto basado en el valor
  let textColorClass = bgColorClass;
  if (isCurrency) {
    if (amount < 0) {
      textColorClass = 'text-red-600';
    } else if (amount > 0) {
      textColorClass = 'text-green-600';
    } else {
      textColorClass = 'text-gray-800';
    }
    // Caso especial para Saldo Total (deuda)
    if (title === "Saldo Total" && amount < 0) {
       textColorClass = 'text-red-600';
    } else if (title === "Saldo Total") {
       textColorClass = 'text-blue-600';
    }
  }


  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        <DollarSign className="w-6 h-6 text-gray-400" />
      </div>
      <p className={`text-3xl font-bold ${textColorClass}`}>{formattedAmount}</p>
    </div>
  );
};

// Fila de la tabla de movimientos
const MovementRow = ({ movement }) => {
  // (MODIFICADO) Un importe positivo (credit) es verde (Pago / NC)
  // Un importe negativo (debit) es rojo (Factura)
  const isPositive = parseFloat(movement.importe) > 0;
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

  // 2. Extraemos los datos para el renderizado, con valores por defecto
  // (MODIFICADO) La lógica de 'disponible' y 'pendiente' ahora viene del backend
  const balance = data?.balance || { total: 0, disponible: 0, pendiente: 0 };
  const movements = data?.movements || [];

  // (NUEVO) Manejador para cerrar el modal y mostrar mensaje
  const handleModalSuccess = (message) => {
    setSuccessMessage(message);
    setIsModalOpen(false);
    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => setSuccessMessage(''), 3000);
  };

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
          adminUser={user} // El usuario logueado es el admin
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
          
          {/* --- (NUEVO) Botón visible solo para Admins --- */}
          {user?.is_admin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-colors flex items-center"
            >
              <FilePlus className="w-5 h-5 mr-2" />
              Crear Nota de Crédito
            </button>
          )}
          {/* --- (FIN) Botón de Admin --- */}
        </header>

        {/* (NUEVO) Mensaje de éxito de la Nota de Crédito */}
        {successMessage && (
            <div className="mb-6 flex items-center p-4 bg-green-100 text-green-800 rounded-lg shadow-md">
              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
        )}

        {/* Sección de Saldos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* (MODIFICADO) Se usan los valores directos del backend */}
          <BalanceCard title="Saldo Total" amount={balance.total} />
          <BalanceCard title="Disponible" amount={balance.disponible} />
          <BalanceCard title="Pendiente de Imputación" amount={balance.pendiente} isCurrency={false} bgColorClass="text-yellow-600" />
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