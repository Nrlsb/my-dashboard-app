import React from 'react';
import { useQuery } from '@tanstack/react-query';
// (CORREGIDO) Importar el apiService
import { fetchOrderHistory } from '../api/apiService'; 

// (NUEVO) Hook para formatear moneda
const useCurrencyFormatter = () => {
  // (Implementación simple, se puede mejorar)
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

function OrderHistoryPage({ onNavigate, user, onViewDetails }) {
  const formatter = useCurrencyFormatter();
  
  const { data: orders, isLoading, error } = useQuery({
    // (NUEVO) queryKey con 'orderHistory' y el ID de usuario
    queryKey: ['orderHistory', user.id], 
    // (NUEVO) queryFn llama a la función de apiService
    queryFn: () => fetchOrderHistory(user.id),
    // (NUEVO) staleTime: 5 minutos
    staleTime: 1000 * 60 * 5, 
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
            {/* ======================================================== */}
            {/* --- INICIO DE LA CORRECCIÓN --- */}
            {/* ======================================================== */}
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                {/* (CAMBIADO) Ahora es la cantidad de items */}
                <th>Cant. Items</th> 
                {/* (NUEVO) Nueva columna para el botón */}
                <th>Acciones</th> 
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  {/* (CORREGIDO) Usar la fecha formateada de la API */}
                  <td>{order.formatted_date}</td> 
                  {/* (CORREGIDO) Usar el total formateado de la API */}
                  <td>{order.formattedTotal}</td> 
                  <td>{order.status}</td>
                  {/* (NUEVO) Mostramos el dato 'item_count' que viene del backend */}
                  <td>{order.item_count}</td>
                  <td>
                    {/* (CAMBIADO) El botón ahora está en su propia columna */}
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
            {/* ======================================================== */}
            {/* --- FIN DE LA CORRECCIÓN --- */}
            {/* ======================================================== */}
          </table>
        ) : (
          <p>No tienes pedidos en tu historial.</p>
        )}
      </div>
    </div>
  );
}

export default OrderHistoryPage;