import React from 'react';
import { FileText, Clock, Truck, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderHistory } from '../api/apiService.js';

// Componente de UI para el estado de carga (Skeleton)
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="bg-gray-200 h-24 rounded-lg"></div>
    <div className="bg-gray-200 h-24 rounded-lg"></div>
    <div className="bg-gray-200 h-24 rounded-lg"></div>
  </div>
);

// Componente de UI para el estado de error
const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">Error al cargar el historial</p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

// Componente para un solo pedido en la lista
// (CORREGIDO) Se usan los props 'nro_pedido', 'fecha', 'total' y 'estado'
const OrderRow = ({ order }) => {
  const getStatusChip = (status) => {
    switch (status) {
      case 'Entregado':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1.5" />
            {status}
          </span>
        );
      case 'Pendiente':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1.5" />
            {status}
          </span>
        );
      case 'En Camino':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Truck className="w-4 h-4 mr-1.5" />
            {status}
          </span>
        );
      case 'Cotizado':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <FileText className="w-4 h-4 mr-1.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formattedDate = new Date(order.fecha).toLocaleDateString('es-AR');
  const formattedTotal = parseFloat(order.total).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="py-4 px-6 text-sm text-gray-900 font-medium">{order.nro_pedido}</td>
      <td className="py-4 px-6 text-sm text-gray-600">{formattedDate}</td>
      <td className="py-4 px-6 text-sm text-gray-800 font-semibold text-right">{formattedTotal}</td>
      {/* (CORREGIDO) Se elimina la columna tipo_factura */}
      <td className="py-4 px-6">
        {getStatusChip(order.estado)}
      </td>
      <td className="py-4 px-6 text-right">
        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
          Ver Detalle
        </button>
      </td>
    </tr>
  );
};

export default function OrderHistoryPage({ user }) {
  // 1. Reemplazamos useEffect y useState con useQuery
  const { 
    data: orders = [], // Valor por defecto
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['orderHistory', user?.id], // Clave dependiente del usuario
    queryFn: () => fetchOrderHistory(user?.id), // Función de API
    enabled: !!user?.id, // Solo ejecutar si el user.id existe
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });

  // 2. Renderizado condicional
  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (isError) {
      const errorMessage = !user?.id 
        ? "No se ha podido identificar al usuario." 
        : error.message;
      return <ErrorMessage message={errorMessage} />;
    }

    if (orders.length === 0) {
      return (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <FileText className="mx-auto w-16 h-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay pedidos</h3>
          <p className="mt-1 text-sm text-gray-500">Aún no has realizado ningún pedido.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nro. Pedido</th>
                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                {/* (CORREGIDO) Se elimina la columna tipo_factura */}
                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Historial de Pedidos</h1>
        <p className="text-gray-600">Consulta el estado y los detalles de todos tus pedidos.</p>
      </header>

      {renderContent()}
    </div>
  );
}