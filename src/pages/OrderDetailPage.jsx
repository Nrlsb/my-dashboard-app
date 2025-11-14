import React from 'react';
import { useQuery } from '@tanstack/react-query';
// (NUEVO) Importar la API real
import { fetchOrderDetail } from '../api/apiService'; 

// (NUEVO) Hook para formatear moneda
const useCurrencyFormatter = () => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

// (Componente MODIFICADO)
function OrderDetailPage({ onNavigate, user, orderId }) {
  const formatter = useCurrencyFormatter();

  // (NUEVO) Usar React Query para fetchear los detalles
  const { data: orderDetails, isLoading, error } = useQuery({
    queryKey: ['orderDetail', orderId, user.id],
    queryFn: () => fetchOrderDetail(orderId, user.id),
    enabled: !!orderId && !!user.id, // Solo ejecutar si tenemos los IDs
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
  
  // (CORREGIDO) Se eliminan los estilos en línea
  // Se usan clases de App.css

  return (
    // (CORREGIDO) Se usa la clase 'order-detail-page'
    <div className="order-detail-page"> 
      <h2>Detalle del Pedido #{orderDetails.id}</h2>
      
      <button onClick={() => onNavigate('order-history')} className="back-button">
        Volver al Historial
      </button>
      
      {/* (CORREGIDO) Se usa la clase 'order-info-box' */}
      <div className="order-info-box">
        <strong>Fecha:</strong> {orderDetails.formatted_date}<br />
        <strong>Estado:</strong> {orderDetails.status}<br />
        <strong>Total:</strong> {orderDetails.formattedTotal}
      </div>

      <h3>Items del Pedido</h3>
      
      {/* (CORREGIDO) Se usa la clase 'order-list-container' y 'order-table' */}
      <div className="order-list-container">
        <table className="order-table">
          <thead>
            <tr>
              {/* ======================================================== */}
              {/* --- INICIO DE LA CORRECCIÓN --- */}
              {/* ======================================================== */}
              <th>Código</th>
              <th>Descripción</th> {/* (NUEVA COLUMNA) */}
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
              {/* ======================================================== */}
              {/* --- FIN DE LA CORRECCIÓN --- */}
              {/* ======================================================== */}
            </tr>
          </thead>
          <tbody>
            {orderDetails.items.map((item) => (
              <tr key={item.id}>
                {/* ======================================================== */}
                {/* --- INICIO DE LA CORRECCIÓN --- */}
                {/* ======================================================== */}
                <td>{item.product_code}</td>
                <td>{item.product_name}</td> {/* (NUEVA CELDA) */}
                <td>{item.quantity}</td>
                <td>{item.formattedPrice}</td>
                <td>{formatter.format(item.quantity * item.unit_price)}</td>
                {/* ======================================================== */}
                {/* --- FIN DE LA CORRECCIÓN --- */}
                {/* ======================================================== */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrderDetailPage;