import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';

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
      alert('Cambios guardados exitosamente!');
      queryClient.invalidateQueries(['orderHistory', user.id]);
    },
    onError: (error) => {
      alert('Error al guardar los cambios: ' + error.message);
    },
  });

  const handleSaveChanges = () => {
    const updatedOrdersData = orders.map((order) => ({
      id: order.id,
      vendorSalesOrderNumber: vendorSalesOrderNumbers[order.id],
      status: orderStatus[order.id], // Usar el nuevo estado
    }));
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
    return <div>Cargando historial de pedidos...</div>;
  }

  if (error) {
    return <div>Error al cargar el historial: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-8 min-h-screen bg-gray-50">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b-2 border-gray-200 pb-2">Historial de Pedidos</h2>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 items-center">
        <button onClick={() => navigate('/dashboard')} className="flex-grow sm:flex-grow-0 w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 font-semibold">
          Volver al Dashboard
        </button>
        {isVendor && (
          <button onClick={handleSaveChanges} className="flex-grow sm:flex-grow-0 w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 font-semibold">
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 border border-gray-300 rounded-md text-base min-w-[200px] w-full sm:w-auto focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Cancelado">Cancelado</option>
            {/* Agrega más estados si es necesario */}
          </select>
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow-lg mt-8">
        {filteredOrders && filteredOrders.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 table-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">ID Pedido</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Fecha</th>
                {isVendor && <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Cliente</th>}
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Total</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Estado</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Cant. Items</th>
                {isVendor && <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">N° Pedido Venta</th>}
                {isVendor && <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Estado del Pedido</th>}
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">#{order.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{order.formatted_date}</td>
                  {isVendor && <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{order.client_name}</td>}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{order.formattedTotal}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{order.status}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center">{order.item_count}</td>
                  {isVendor && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center">
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
                    </td>
                  )}
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
                        <option value="Aprobado">Aprobado</option>
                        <option value="Rechazado">Rechazado</option>
                        <option value="Confirmado">Confirmado</option>
                      </select>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-center">
                    <button
                      onClick={() => navigate(`/order-detail/${order.id}`)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
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
  );
}

export default OrderHistoryPage;
