import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';

import LoadingSpinner from '../components/LoadingSpinner';
import { UploadCloud, FileText } from 'lucide-react';

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
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const fileInputRef = React.useRef(null);

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

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF.');
      return;
    }

    setIsUploadingInvoice(true);
    const formData = new FormData();
    formData.append('invoiceFile', file);

    try {
      await apiService.uploadOrderInvoice(orderId, formData);
      alert('Factura subida exitosamente.');
      // Recargar detalles del pedido
      window.location.reload();
    } catch (err) {
      console.error('Error al subir factura:', err);
      alert(`Error al subir factura: ${err.message}`);
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const handleDownloadInvoice = async () => {
    setIsDownloadingInvoice(true);
    try {
      const blob = await apiService.downloadOrderInvoice(orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura_Pedido_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar factura:', err);
      alert(`Error al descargar factura: ${err.message}`);
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return <LoadingSpinner text="Cargando detalles del pedido..." />;
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

      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
        <button
          onClick={() => navigate('/order-history')}
          className="hidden md:block px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 font-semibold"
        >
          Volver al Historial
        </button>

        {/* Mobile Back Button */}
        <button
          onClick={() => navigate('/order-history')}
          className="md:hidden flex items-center text-gray-600 mb-2 self-start"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Volver
        </button>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            disabled={isDownloadingPdf}
          >
            {isDownloadingPdf ? 'PDF...' : 'Descargar PDF'}
          </button>
          {user?.role === 'vendedor' && (
            <button
              onClick={handleDownloadCSV}
              className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              disabled={isDownloadingCsv}
            >
              {isDownloadingCsv ? 'CSV...' : 'Descargar CSV'}
            </button>
          )}

          {/* Botones de Factura */}
          {orderDetails.invoice_url && (
            <button
              onClick={handleDownloadInvoice}
              className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              disabled={isDownloadingInvoice}
            >
              <FileText className="w-4 h-4 mr-2" />
              {isDownloadingInvoice ? 'Descargando...' : 'Descargar Factura'}
            </button>
          )}

          {user?.role === 'vendedor' && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleInvoiceUpload}
              />
              <button
                onClick={triggerFileUpload}
                className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                disabled={isUploadingInvoice}
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                {isUploadingInvoice ? 'Subiendo...' : 'Adjuntar Factura'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-md relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong className="text-gray-900">Fecha:</strong> {orderDetails.formatted_date}</p>
            {orderDetails.status === 'Confirmado' && orderDetails.vendor_sales_order_number && (
              <p><strong className="text-gray-900">N° Pedido Venta:</strong> #{orderDetails.vendor_sales_order_number}</p>
            )}
            <p className="md:hidden"><strong className="text-gray-900">Estado:</strong> {orderDetails.status}</p>
          </div>

          {/* Desktop Status */}
          <div className="hidden md:block">
            <strong className="text-gray-700">Estado:</strong> {orderDetails.status}
          </div>

          {/* Mobile Status Badge */}
          <div className={`md:hidden absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-xs font-bold uppercase tracking-wide
                ${orderDetails.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${orderDetails.status === 'Confirmado' ? 'bg-green-100 text-green-800' : ''}
                ${orderDetails.status === 'Cancelado' || orderDetails.status === 'Rechazado' ? 'bg-red-100 text-red-800' : ''}
                ${!['Pendiente', 'Confirmado', 'Cancelado', 'Rechazado'].includes(orderDetails.status) ? 'bg-gray-100 text-gray-800' : ''}
            `}>
            {orderDetails.status}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-end">
          <span className="text-gray-600 font-medium">Total del Pedido:</span>
          <span className="text-2xl font-bold text-[#183B64]">{orderDetails.formattedTotal}</span>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3 border-b-2 border-gray-200 pb-2">Items del Pedido</h3>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {orderDetails.items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-gray-900 leading-snug">{item.product_name}</h4>
              <p className="text-xs text-gray-500 mt-1">Cód: {item.product_code}</p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-50 text-sm">
              <div className="text-gray-600">
                {item.quantity} x {item.formattedPrice}
              </div>
              <div className="font-bold text-gray-900">
                {formatter.format(item.quantity * item.unit_price)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm">
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
