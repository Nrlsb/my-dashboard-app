import React from 'react';
import { useQuery } from '@tanstack/react-query';
// (CORREGIDO) Import relativo
import { fetchOrderDetail } from '../api/apiService.js';
import { ArrowLeft, Package, FileText, CheckCircle, Clock, Truck, Hash, Calendar, DollarSign, AlertTriangle } from 'lucide-react';

// Formateador de moneda
const formatCurrency = (amount) => {
  return (amount || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

// Componente de UI para el estado de carga (Skeleton)
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 h-8 w-3/4 mb-4 rounded"></div>
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-200 h-16 rounded"></div>
        <div className="bg-gray-200 h-16 rounded"></div>
        <div className="bg-gray-200 h-16 rounded"></div>
        <div className="bg-gray-200 h-16 rounded"></div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="bg-gray-200 h-6 w-1/2 mb-4 rounded"></div>
      <div className="space-y-3">
        <div className="bg-gray-200 h-12 rounded"></div>
        <div className="bg-gray-200 h-12 rounded"></div>
        <div className="bg-gray-200 h-12 rounded"></div>
      </div>
    </div>
  </div>
);

// Componente de UI para el estado de error
const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
    <p className="text-red-500 font-semibold text-lg">Error al cargar el pedido</p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

// Chip de estado (similar al del historial)
const StatusChip = ({ status }) => {
  const statusConfig = {
    'Entregado': { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    'Pendiente': { icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    'En Camino': { icon: Truck, color: 'bg-blue-100 text-blue-800' },
    'Cotizado': { icon: FileText, color: 'bg-gray-100 text-gray-800' },
    'default': { icon: FileText, color: 'bg-gray-100 text-gray-800' }
  };
  const config = statusConfig[status] || statusConfig.default;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {status}
    </span>
  );
};

// Tarjeta de información del pedido
const InfoCard = ({ icon: Icon, title, value }) => (
  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
    <div className="flex items-center mb-1">
      <Icon className="w-5 h-5 text-gray-500 mr-2" />
      <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wider">{title}</h4>
    </div>
    <p className="text-lg font-semibold text-gray-900">{value}</p>
  </div>
);

export default function OrderDetailPage({ user, orderId, onNavigate }) {
  
  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['orderDetail', orderId, user?.id],
    queryFn: () => fetchOrderDetail(orderId, user?.id),
    enabled: !!user?.id && !!orderId,
  });

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (isError) {
      return <ErrorMessage message={error.message} />;
    }

    if (!order) {
      return <ErrorMessage message="No se encontraron datos del pedido." />;
    }

    const formattedDate = new Date(order.created_at).toLocaleDateString('es-AR');

    return (
      <>
        {/* Resumen del Pedido */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard icon={Hash} title="Nro. Pedido" value={order.id} />
            <InfoCard icon={Calendar} title="Fecha" value={formattedDate} />
            <InfoCard icon={DollarSign} title="Total" value={formatCurrency(order.total_amount)} />
            <div>
              <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-2">Estado</h4>
              <StatusChip status={order.status} />
            </div>
          </div>
        </div>

        {/* Detalle de Items */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-800 p-6 border-b border-gray-200">
            Productos en este pedido ({order.items.length})
          </h2>
          <div className="divide-y divide-gray-200">
            {order.items.map(item => (
              <div key={item.product_id} className="flex items-center justify-between p-4 flex-wrap">
                <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                  <div className="flex-shrink-0 p-3 bg-gray-100 rounded-lg">
                    <Package className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-500">Cód: {item.product_code} | Marca: {item.product_brand}</p>
                  </div>
                </div>
                <div className="w-full sm:w-auto flex justify-end sm:justify-start">
                  <div className="text-right">
                    <p className="text-base font-semibold text-gray-800">{formatCurrency(item.unit_price)}</p>
                    <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Encabezado con botón de volver */}
      <header className="mb-6 flex items-center">
        <button
          onClick={() => onNavigate('order-history')}
          className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Volver al historial"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Detalle del Pedido</h1>
        </div>
      </header>
      
      {renderContent()}
    </div>
  );
}