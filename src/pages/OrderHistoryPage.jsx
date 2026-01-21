import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Calendar, Package, ChevronRight } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import NotificationModal from '../components/NotificationModal';

const useCurrencyFormatter = () => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

function OrderHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVendor = user?.role === 'vendedor';
  const formatter = useCurrencyFormatter();
  const queryClient = useQueryClient();

  const [vendorSalesOrderNumbers, setVendorSalesOrderNumbers] = useState({});
  const [orderStatus, setOrderStatus] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  });

  const handleVendorSalesOrderNumberChange = (orderId, value) => {
    setVendorSalesOrderNumbers((prev) => ({ ...prev, [orderId]: value }));
  };

  const handleOrderStatusChange = (orderId, value) => {
    setOrderStatus((prev) => ({ ...prev, [orderId]: value }));
  };

  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['orderHistory', user.id],
    queryFn: () => apiService.fetchOrderHistory(),
    staleTime: 1000 * 60 * 5,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (orders) {
      const initialStatus = {};
      const initialSalesOrderNumbers = {};
      orders.forEach((order) => {
        initialSalesOrderNumbers[order.id] = order.vendorSalesOrderNumber || '';
        initialStatus[order.id] = order.status; // Usar el status del pedido
      });
      setVendorSalesOrderNumbers(initialSalesOrderNumbers);
      setOrderStatus(initialStatus); // Actualizar el nuevo estado
    }
  }, [orders]);

  const updateOrderDetailsMutation = useMutation({
    mutationFn: (updatedOrders) => apiService.updateOrderDetails(updatedOrders),
    onSuccess: () => {
      setNotification({
        isOpen: true,
        title: 'Éxito',
        message: 'Cambios guardados exitosamente!',
        variant: 'success'
      });
      queryClient.invalidateQueries(['orderHistory', user.id]);
    },
    onError: (error) => {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: 'Error al guardar los cambios: ' + error.message,
        variant: 'error'
      });
    },
  });

  const handleSaveChanges = () => {
    const updatedOrdersData = orders.map((order) => ({
      id: order.id,
      vendorSalesOrderNumber: vendorSalesOrderNumbers[order.id],
      status: orderStatus[order.id], // Usar el nuevo estado
    }));

    // Validación: Verificar que si el estado es Confirmado, tenga Nº de Pedido Venta
    const invalidOrder = updatedOrdersData.find(
      (order) => order.status === 'Confirmado' && !order.vendorSalesOrderNumber?.trim()
    );

    if (invalidOrder) {
      setNotification({
        isOpen: true,
        title: 'Atención',
        message: `Para confirmar el pedido #${invalidOrder.id}, debes ingresar el Nº de Pedido Venta.`,
        variant: 'info'
      });
      return;
    }

    updateOrderDetailsMutation.mutate(updatedOrdersData);
  };

  const filteredOrders =
    orders?.filter((order) => {
      const statusMatch = statusFilter ? order.status === statusFilter : true;
      const searchTermMatch = searchTerm
        ? (order.client_name &&
          order.client_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        String(order.id).includes(searchTerm)
        : true;
      return statusMatch && searchTermMatch;
    }) || [];

  if (isLoading) {
    return <LoadingSpinner text="Cargando historial..." />;
  }

  if (error) {
    return <div>Error al cargar el historial: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-gray-50">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b-2 border-gray-200 pb-2">Historial de Pedidos</h2>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 items-center">
        <button onClick={() => navigate('/dashboard')} className="flex-grow sm:flex-grow-0 w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 font-semibold cursor-pointer">
          Volver al Dashboard
        </button>
        {isVendor && (
          <button onClick={handleSaveChanges} className="flex-grow sm:flex-grow-0 w-full sm:w-auto px-4 py-2 bg-espint-green text-white rounded-md hover:bg-green-600 transition-colors duration-200 font-semibold cursor-pointer">
            Guardar Cambios
          </button>
        )}
      </div>

      {isVendor && (
        <div className="bg-white p-4 rounded-lg shadow-md my-5 flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Buscar por Cliente o ID de Pedido"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="py-2 px-3 border border-gray-300 rounded-md text-base min-w-[200px] w-full sm:w-auto focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="relative w-full md:w-64">
            <CustomSelect
              options={['Pendiente', 'Confirmado', 'Cancelado']}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              placeholder="Todos los Estados"
            />
          </div>
        </div>
      )}

      <div className="mt-8">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredOrders && filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                {/* Header: ID and Status */}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-bold text-[#183B64]">#{order.id}</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${order.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${order.status === 'Confirmado' ? 'bg-green-100 text-green-800' : ''}
                      ${order.status === 'Cancelado' || order.status === 'Rechazado' ? 'bg-red-100 text-red-800' : ''}
                      ${!['Pendiente', 'Confirmado', 'Cancelado', 'Rechazado'].includes(order.status) ? 'bg-gray-100 text-gray-800' : ''}
                    `}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Client Name (Vendor Only) */}
                {isVendor && (
                  <div className="mb-3 text-sm font-medium text-gray-700">
                    <span className="text-gray-500 mr-1">Cliente:</span>
                    {order.a1_cod} - {order.client_name}
                  </div>
                )}

                {/* Body: Date and Items */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{order.formatted_date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    <span>{order.item_count} Items</span>
                  </div>
                </div>

                {/* Sales Order Number (Non-Vendor) */}
                {!isVendor && order.status === 'Confirmado' && order.vendorSalesOrderNumber && (
                  <div className="mb-3 text-sm font-medium text-gray-700">
                    <span className="text-gray-500 mr-1">N° Pedido Venta:</span>
                    #{order.vendorSalesOrderNumber}
                  </div>
                )}

                {/* Vendor Controls (Vendor Only) */}
                {isVendor && (
                  <div className="mb-4 space-y-3 bg-gray-50 p-3 rounded-md">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-500">N° Pedido Venta</label>
                      <input
                        type="text"
                        value={vendorSalesOrderNumbers[order.id] || ''}
                        onChange={(e) =>
                          handleVendorSalesOrderNumberChange(
                            order.id,
                            e.target.value
                          )
                        }
                        placeholder="N° Pedido"
                        className="p-2 border border-gray-300 rounded-md text-sm w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-500">Estado del Pedido</label>
                      <CustomSelect
                        options={['Pendiente', 'Confirmado', 'Cancelado']}
                        value={orderStatus[order.id] || ''}
                        onChange={(val) =>
                          handleOrderStatusChange(order.id, val)
                        }
                        placeholder="Seleccionar"
                      />
                    </div>
                  </div>
                )}

                {/* Footer: Total and Action */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-lg font-bold text-gray-900">{order.formattedTotal}</span>
                  <button
                    onClick={() => navigate(`/order-detail/${order.id}`)}
                    className="flex items-center text-sm font-medium text-espint-blue hover:text-blue-700 transition-colors"
                  >
                    Ver Detalle
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-4 text-gray-500 text-center bg-white rounded-lg shadow-sm">No tienes pedidos en tu historial.</p>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-lg">
          {filteredOrders && filteredOrders.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 table-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">ID Pedido</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">Fecha</th>
                  {isVendor && <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">Cliente</th>}
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">Total</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">Estado</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">Cant. Items</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">N° Pedido Venta</th>
                  {isVendor && <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">Estado del Pedido</th>}
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-b border-gray-200 bg-[#0B3D68]">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 font-mono">#{order.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{order.formatted_date}</td>
                    {isVendor && <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 font-medium">{order.a1_cod} - {order.client_name}</td>}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 font-mono">{order.formattedTotal}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{order.status}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center">{order.item_count}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {isVendor ? (
                        <input
                          type="text"
                          value={vendorSalesOrderNumbers[order.id] || ''}
                          onChange={(e) =>
                            handleVendorSalesOrderNumberChange(
                              order.id,
                              e.target.value
                            )
                          }
                          placeholder="N° Pedido"
                          className="p-1 border border-gray-300 rounded-md w-24 text-center text-sm"
                        />
                      ) : (
                        <span className="font-mono font-medium text-gray-700">
                          {order.status === 'Confirmado' && order.vendorSalesOrderNumber ? `#${order.vendorSalesOrderNumber}` : '-'}
                        </span>
                      )}
                    </td>
                    {isVendor && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center">
                        <select
                          value={orderStatus[order.id] || ''}
                          onChange={(e) =>
                            handleOrderStatusChange(order.id, e.target.value)
                          }
                          className="p-1 border border-gray-300 rounded-md text-center text-sm w-32"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Rechazado">Rechazado</option>
                          <option value="Confirmado">Confirmado</option>
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-center">
                      <button
                        onClick={() => navigate(`/order-detail/${order.id}`)}
                        className="inline-flex items-center px-3 py-1.5 border border-espint-blue text-xs font-medium rounded-md shadow-sm text-espint-blue bg-transparent hover:bg-espint-blue hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-espint-blue transition-colors duration-200 cursor-pointer"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-gray-500">No tienes pedidos en tu historial.</p>
          )}
        </div>
      </div>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
      />
    </div>
  );
}

export default OrderHistoryPage;
