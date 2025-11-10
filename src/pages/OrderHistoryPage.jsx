import React, { useState, useEffect } from 'react';
// (ELIMINADO) Header no se importa
import { ArrowLeft, Package, X } from 'lucide-react';

const API_URL = 'http://localhost:3001';

// --- (NUEVO) Componente Modal para Detalles del Pedido ---
const OrderDetailsModal = ({ order, loading, error, onClose, formatCurrency }) => {
  return (
    // Overlay
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Contenido del Modal */}
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Evita que el clic en el modal cierre el overlay
      >
        {/* Encabezado del Modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            Detalle del Pedido #{order?.id}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto">
          {loading && (
            <p className="text-center text-gray-600">Cargando detalles...</p>
          )}
          
          {error && (
            <p className="text-center text-red-600">{error}</p>
          )}

          {order && !loading && !error && (
            <div className="space-y-6">
              {/* Info General */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">N° Pedido</p>
                  <p className="text-gray-900 font-semibold">{order.id}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Fecha</p>
                  <p className="text-gray-900 font-semibold">{order.date}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Estado</p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              
              {/* Tabla de Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos Incluidos</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                <Package className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                <div className="text-sm text-gray-500">Cód: {item.product_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium text-right">{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total del Pedido:</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Función para obtener el color del estado
const getStatusColor = (status) => {
  switch (status) {
    case 'Entregado': return 'bg-green-100 text-green-800';
    case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
    case 'En Proceso': return 'bg-blue-100 text-blue-800';
    case 'Cancelado': return 'bg-red-100 text-red-800';
    case 'Cotizado': return 'bg-gray-100 text-gray-800'; 
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Función para formatear moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};


// --- Página de Histórico de Pedidos ---
// (NUEVO) Acepta 'currentUser'
const OrderHistoryPage = ({ onNavigate, currentUser }) => {
  
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Cargar datos al montar
  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) {
        setError("No se ha podido identificar al usuario.");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // (MODIFICADO) Pasamos el ID del usuario como query param
        const response = await fetch(`${API_URL}/api/orders?userId=${currentUser.id}`);
        if (!response.ok) throw new Error('No se pudo cargar el histórico.');
        const data = await response.json();
        
        setOrderHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [currentUser]); // (MODIFICADO) El efecto depende de 'currentUser'

  // (NUEVO) Función para ver detalles del pedido
  const handleViewOrder = async (orderId) => {
    if (!currentUser) return; // No hacer nada si no hay usuario

    setIsModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setSelectedOrderDetails(null);

    try {
      // (MODIFICADO) Pasamos el ID del usuario como query param
      const response = await fetch(`${API_URL}/api/orders/${orderId}?userId=${currentUser.id}`);
      if (!response.ok) throw new Error('No se pudieron cargar los detalles del pedido.');
      const data = await response.json();
      setSelectedOrderDetails(data);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Renderizado condicional
  const renderContent = () => {
    if (loading) {
      return <div className="p-6 text-center text-gray-600">Cargando histórico...</div>;
    }
    
    if (error) {
      return <div className="p-6 text-center text-red-600">{error}</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                N° Pedido
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderHistory.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleViewOrder(order.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* (ELIMINADO) Header ya no se renderiza aquí */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Encabezado con Botón de Volver y Título */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('dashboard')} // <-- Navega de vuelta al dashboard
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Histórico de Pedidos</h1>
        </div>

        {/* Tabla de Histórico de Pedidos */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {renderContent()}
        </div>
      </main>
      
      {/* (NUEVO) Renderizar el modal si está abierto */}
      {isModalOpen && (
        <OrderDetailsModal
          order={selectedOrderDetails}
          loading={modalLoading}
          error={modalError}
          onClose={() => setIsModalOpen(false)}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

export default OrderHistoryPage;