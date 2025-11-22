import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import './OrderDetailPage.css';

const useCurrencyFormatter = () => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

function OrderDetailPage({ onNavigate, user, orderId }) {
  const formatter = useCurrencyFormatter();
  const { user: authUser } = useAuth(); // Obtener usuario autenticado del contexto
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  const { data: orderDetails, isLoading, error } = useQuery({
    queryKey: ['orderDetail', orderId],
    queryFn: () => apiService.fetchOrderDetail(orderId),
    enabled: !!orderId && !!user?.id,
  });

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const pdfBlob = await apiService.downloadOrderPDF(orderId);
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pedido_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar el PDF:', err);
      alert(`No se pudo descargar el PDF: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadCSV = async () => {
    setIsDownloadingCsv(true);
    try {
      const csvBlob = await apiService.downloadOrderCSV(orderId);
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pedido_${orderId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar el CSV:', err);
      alert(`No se pudo descargar el CSV: ${err.message}`);
    } finally {
      setIsDownloadingCsv(false);
    }
  };

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
      
      <div className="order-detail-actions">
        <button onClick={() => onNavigate('order-history')} className="back-button">
          Volver al Historial
        </button>
        <button onClick={handleDownloadPDF} className="download-pdf-button" disabled={isDownloadingPdf}>
          {isDownloadingPdf ? 'Descargando PDF...' : 'Descargar PDF'}
        </button>
        {authUser?.role === 'vendedor' && (
          <button onClick={handleDownloadCSV} className="download-csv-button" disabled={isDownloadingCsv} style={{ marginLeft: '10px' }}>
            {isDownloadingCsv ? 'Descargando CSV...' : 'Descargar CSV'}
          </button>
        )}
      </div>
      
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