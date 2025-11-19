import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService'; 

const useCurrencyFormatter = () => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

function OrderDetailPage({ onNavigate, user, orderId }) {
  const formatter = useCurrencyFormatter();

  const { data: orderDetails, isLoading, error } = useQuery({
    queryKey: ['orderDetail', orderId],
    queryFn: () => apiService.fetchOrderDetail(orderId),
    enabled: !!orderId && !!user?.id,
  });

  if (isLoading) {
    return <div>Cargando detalles del pedido...</div>;
  }

  if (error) {
    return <div>Error al cargar el pedido: {error.message}</div>;
  }

  if (!orderDetails) {
    return <div>Pedido no encontrado.</div>;
  }
  
  return (
    <div className="order-detail-page"> 
      <h2>Detalle del Pedido #{orderDetails.id}</h2>
      
      <button onClick={() => onNavigate('order-history')} className="back-button">
        Volver al Historial
      </button>
      
      <div className="order-info-box">
        <strong>Fecha:</strong> {orderDetails.formatted_date}<br />
        <strong>Estado:</strong> {orderDetails.status}<br />
        <strong>Total:</strong> {orderDetails.formattedTotal}
      </div>

      <h3>Items del Pedido</h3>
      
      <div className="order-list-container">
        <table className="order-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {orderDetails.items.map((item) => (
              <tr key={item.id}>
                <td>{item.product_code}</td>
                <td>{item.product_name}</td>
                <td>{item.quantity}</td>
                <td>{item.formattedPrice}</td>
                <td>{formatter.format(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrderDetailPage;