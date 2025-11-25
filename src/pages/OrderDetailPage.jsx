import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';

const useCurrencyFormatter = () => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const formatter = useCurrencyFormatter();
  const { user } = useAuth();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  const {
    data: orderDetails,
    isLoading,
    error,
  } = useQuery({
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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 border-b-2 border-gray-200 pb-2">Detalle del Pedido #{orderDetails.id}</h2>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 items-center">
        <button
          onClick={() => navigate('/order-history')}
          className="flex-grow sm:flex-grow-0 w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 font-semibold"
        >
          Volver al Historial
        </button>
        <button
          onClick={handleDownloadPDF}
          className="flex-grow sm:flex-grow-0 w-full sm:w-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
          disabled={isDownloadingPdf}
        >
          {isDownloadingPdf ? 'Descargando PDF...' : 'Descargar PDF'}
        </button>
        {user?.role === 'vendedor' && (
          <button
            onClick={handleDownloadCSV}
            className="flex-grow sm:flex-grow-0 w-full sm:w-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            disabled={isDownloadingCsv}
          >
            {isDownloadingCsv ? 'Descargando CSV...' : 'Descargar CSV'}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 leading-relaxed text-sm mb-8 shadow-md">
        <strong className="text-gray-700">Fecha:</strong> {orderDetails.formatted_date}
        <br />
        <strong className="text-gray-700">Estado:</strong> {orderDetails.status}
        <br />
        <strong className="text-gray-700">Total:</strong> {orderDetails.formattedTotal}
      </div>

      <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3 border-b-2 border-gray-200 pb-2">Items del Pedido</h3>

      <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Código</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Descripción</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Cantidad</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Precio Unit.</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Subtotal</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderDetails.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{item.product_code}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{item.product_name}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center">{item.quantity}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center">{item.formattedPrice}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center">{formatter.format(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrderDetailPage;
