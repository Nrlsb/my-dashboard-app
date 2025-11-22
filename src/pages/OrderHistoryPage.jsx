import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiService from '../api/apiService'; 
import { useAuth } from '../context/AuthContext';
import './OrderHistoryPage.css';

const useCurrencyFormatter = () => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

function OrderHistoryPage({ onNavigate, user, onViewDetails }) {
  const { user: authUser } = useAuth();
  const isVendor = authUser?.role === 'vendedor';
  const formatter = useCurrencyFormatter();

  const [vendorSalesOrderNumbers, setVendorSalesOrderNumbers] = useState({});
  const [orderConfirmations, setOrderConfirmations] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleVendorSalesOrderNumberChange = (orderId, value) => {
    setVendorSalesOrderNumbers(prev => ({ ...prev, [orderId]: value }));
  };

  const handleOrderConfirmationChange = (orderId, checked) => {
    setOrderConfirmations(prev => ({ ...prev, [orderId]: checked }));
  };
  
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orderHistory', user.id], 
    queryFn: () => apiService.fetchOrderHistory(),
    staleTime: 1000 * 60 * 5, 
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (orders) {
      const initialSalesOrderNumbers = {};
      const initialConfirmations = {};
      orders.forEach(order => {
        initialSalesOrderNumbers[order.id] = order.vendorSalesOrderNumber || '';
        initialConfirmations[order.id] = order.isConfirmed || false;
      });
      setVendorSalesOrderNumbers(initialSalesOrderNumbers);
      setOrderConfirmations(initialConfirmations);
    }
  }, [orders]);

  const updateOrderDetailsMutation = useMutation({
    mutationFn: (updatedOrders) => apiService.updateOrderDetails(updatedOrders),
    onSuccess: () => {
      alert('Cambios guardados exitosamente!');
      // Optionally, refetch orders to show updated data
      // queryClient.invalidateQueries(['orderHistory', user.id]);
    },
    onError: (error) => {
      alert('Error al guardar los cambios: ' + error.message);
    },
  });

  const handleSaveChanges = () => {
    const updatedOrdersData = orders.map(order => ({
      id: order.id,
      vendorSalesOrderNumber: vendorSalesOrderNumbers[order.id],
      isConfirmed: orderConfirmations[order.id],
    }));
    updateOrderDetailsMutation.mutate(updatedOrdersData);
  };

  const filteredOrders = orders?.filter(order => {
    const statusMatch = statusFilter ? order.status === statusFilter : true;
    const searchTermMatch = searchTerm
      ? (order.client_name && order.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
    <div className="order-history-page">
      <h2>Historial de Pedidos</h2>
      
      <button onClick={() => onNavigate('dashboard')} className="back-button">
        Volver al Dashboard
      </button>
      {isVendor && (
        <button onClick={handleSaveChanges} className="save-changes-button">
          Guardar Cambios
        </button>
      )}

      {isVendor && (
        <div className="filters-container" style={{ margin: '20px 0' }}>
          <input
            type="text"
            placeholder="Buscar por Cliente o ID de Pedido"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginRight: '10px' }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Cancelado">Cancelado</option>
            {/* Agrega más estados si es necesario */}
          </select>
        </div>
      )}
      
      <div className="order-list-container">
        {filteredOrders && filteredOrders.length > 0 ? (
          <table className="order-table">
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Fecha</th>
                {isVendor && <th>Cliente</th>}
                <th>Total</th>
                <th>Estado</th>
                <th>Cant. Items</th> 
                {isVendor && <th>N° Pedido Venta</th>}
                {isVendor && <th>Confirmar Pedido</th>}
                <th>Acciones</th> 
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.formatted_date}</td> 
                  {isVendor && <td>{order.client_name}</td>}
                  <td>{order.formattedTotal}</td> 
                  <td>{order.status}</td>
                  <td>{order.item_count}</td>
                  {isVendor && (
                    <td>
                      <input 
                        type="text" 
                        value={vendorSalesOrderNumbers[order.id] || ''} 
                        onChange={(e) => handleVendorSalesOrderNumberChange(order.id, e.target.value)}
                        placeholder="N° Pedido"
                      />
                    </td>
                  )}
                  {isVendor && (
                    <td>
                      <input 
                        type="checkbox" 
                        checked={orderConfirmations[order.id] || false} 
                        onChange={(e) => handleOrderConfirmationChange(order.id, e.target.checked)}
                      />
                    </td>
                  )}
                  <td>
                    <button 
                      onClick={() => onViewDetails(order.id)} 
                      className="view-details-button"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No tienes pedidos en tu historial.</p>
        )}
      </div>
    </div>
  );
}

export default OrderHistoryPage;