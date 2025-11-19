import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService'; 

const useCurrencyFormatter = () => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

function OrderHistoryPage({ onNavigate, user, onViewDetails }) {
  const formatter = useCurrencyFormatter();
  
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orderHistory', user.id], 
    queryFn: () => apiService.fetchOrderHistory(),
    staleTime: 1000 * 60 * 5, 
    enabled: !!user?.id,
  });

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
      
      <div className="order-list-container">
        {orders && orders.length > 0 ? (
          <table className="order-table">
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Cant. Items</th> 
                <th>Acciones</th> 
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.formatted_date}</td> 
                  <td>{order.formattedTotal}</td> 
                  <td>{order.status}</td>
                  <td>{order.item_count}</td>
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