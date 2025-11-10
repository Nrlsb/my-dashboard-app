import React from 'react';
import { DollarSign, ArrowDown, ArrowUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAccountBalance } from '../api/apiService';

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
const MovementRow = ({ movement }) => {
  const isPositive = movement.tipo === 'Pago'; // Asumiendo 'Pago' o 'Factura'
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


export default function AccountBalancePage({ user }) {
  
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Mi Cuenta Corriente</h1>
        <p className="text-gray-600">Resumen de saldos y últimos movimientos.</p>
      </header>

      {/* Sección de Saldos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <BalanceCard title="Saldo Total" amount={balance.total} bgColorClass="text-blue-600" />
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
  );
}