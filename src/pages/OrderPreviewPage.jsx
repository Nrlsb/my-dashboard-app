import React, { useState, useMemo } from 'react';
// (NUEVO) Importamos el hook useCart
import { useCart } from '../context/CartContext.jsx';
// (ELIMINADO) Header no se importa
import { ArrowLeft, ShoppingCart, FileText, CheckCircle, AlertTriangle, Package, X } from 'lucide-react';

const API_URL = 'http://localhost:3001';

/**
 * Página de Previsualización y Confirmación del Pedido.
 * (MODIFICADO) Acepta 'currentUser' y 'onCompleteOrder'
 */
const OrderPreviewPage = ({ onNavigate, onCompleteOrder, currentUser }) => {
  
  // (NUEVO) Obtenemos el carrito y funciones del contexto
  const { cart, clearCart } = useCart();
  
  // Estados para manejar el envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');
  
  // --- CAMBIO AÑADIDO ---
  // Estado para la tienda seleccionada
  const [selectedStore, setSelectedStore] = useState('01'); 
  // --- FIN CAMBIO AÑADIDO ---

  // (NUEVO) Calculamos el total aquí, leyendo del contexto
  const totalPrice = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  // Formateador de moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  // Lógica para Generar PDF (usa 'cart' y 'totalPrice' de este scope)
  const generateQuotePDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const clientName = currentUser?.full_name || "CLIENTE-001"; // Simulado
    const companyName = "Pintureria Mercurio";
    const date = new Date().toLocaleDateString('es-AR');
    let yPos = 20;

    doc.setFontSize(20);
    doc.text("PRESUPUESTO", 105, yPos, { align: 'center' });
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`${companyName}`, 20, yPos);
    doc.text(`Fecha: ${date}`, 180, yPos, { align: 'right' });
    yPos += 7;
    doc.text(`Cliente: ${clientName}`, 20, yPos);
    yPos += 10;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Cód.", 20, yPos);
    doc.text("Descripción", 40, yPos);
    doc.text("Cant.", 120, yPos, { align: 'right' });
    doc.text("Precio Unit.", 150, yPos, { align: 'right' });
    doc.text("Subtotal", 180, yPos, { align: 'right' });
    doc.setFont(undefined, 'normal');
    yPos += 7;

    cart.forEach(item => {
      const subtotal = item.price * item.quantity;
      doc.text(String(item.code), 20, yPos);
      doc.text(doc.splitTextToSize(item.name, 70), 40, yPos);
      doc.text(item.quantity.toString(), 120, yPos, { align: 'right' });
      doc.text(formatCurrency(item.price), 150, yPos, { align: 'right' });
      doc.text(formatCurrency(subtotal), 180, yPos, { align: 'right' });
      
      const itemHeight = doc.splitTextToSize(item.name, 70).length * 5;
      yPos += Math.max(10, itemHeight); 
      
      if (yPos > 270) {
        doc.addPage();
        yPos = 20; 
      }
    });

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("TOTAL:", 140, yPos);
    doc.text(formatCurrency(totalPrice), 180, yPos, { align: 'right' });

    doc.save(`presupuesto-${clientName}-${date}.pdf`);
  };

  // Lógica de Envío de Pedido (CORREGIDA)
  const handleSubmitOrder = async (submissionType) => {
    if (!currentUser) {
      setError("Error de autenticación. Por favor, inicie sesión de nuevo.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage('');
    
    if (submissionType === 'quote') {
      try {
        generateQuotePDF();
      } catch (pdfError) {
        console.error("Error al generar PDF:", pdfError);
        setSubmitStatus('error'); 
        setSubmitMessage("Error al generar el PDF. El presupuesto se guardará de todas formas.");
      }
    }
    
    try {
      const orderData = {
        items: cart.map(item => ({ 
          id: item.id, 
          code: item.code, 
          quantity: item.quantity, 
          price: item.price 
        })),
        total: totalPrice,
        clientCode: currentUser?.a1_cod || 'CLIENTE-001', // (MODIFICADO) Usa el código real
        type: submissionType,
        userId: currentUser.id, // (MODIFICADO) Envía el userId
        // --- CAMBIO AÑADIDO ---
        tienda: selectedStore // Añadimos la tienda seleccionada al pedido
        // --- FIN CAMBIO AÑADIDO ---
      };
      
      if (orderData.items.some(item => !item.code)) {
        throw new Error("Error interno: los items del carrito no tienen código.");
      }

      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) throw new Error('Error al enviar la solicitud.');
      
      const result = await response.json();
      console.log('Solicitud exitosa:', result);
      
      setSubmitStatus('success');
      setSubmitMessage(submissionType === 'order' ? '¡Pedido Enviado!' : '¡Presupuesto Generado!');
      
      // (MODIFICADO) Usamos la función 'onCompleteOrder' de App.jsx
      // que se encarga de limpiar el carrito y navegar.
      setTimeout(() => {
        onCompleteOrder(); 
        setSubmitStatus(null); 
        setSubmitMessage('');
      }, 3000);

    } catch (err) {
      console.error(err);
      setSubmitStatus('error');
      setSubmitMessage(submissionType === 'order' ? 'Error al enviar el pedido.' : 'Error al generar el presupuesto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* (ELIMINADO) Header ya no se renderiza aquí */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('new-order')} // (RUTA CORREGIDA)
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver a editar pedido"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Previsualización del Pedido</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md max-w-2xl mx-auto">
          
          {/* Mensajes de Estado */}
          {submitStatus === 'success' && (
            <div className="p-6 text-center bg-green-100 text-green-800 rounded-t-lg">
              <CheckCircle className="w-12 h-12 mx-auto mb-3" />
              <p className="font-semibold text-lg">{submitMessage}</p>
              <p className="text-sm">Serás redirigido al Histórico.</p>
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="p-6 text-center bg-red-100 text-red-800 rounded-t-lg">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
              <p className="font-semibold text-lg">{submitMessage}</p>
              <p className="text-sm">Inténtalo de nuevo más tarde.</p>
            </div>
          )}

          {/* Resumen del Pedido (se oculta si ya se envió) */}
          {submitStatus !== 'success' && (
            <>
              <div className="p-6 space-y-4">
                <p className="text-lg text-gray-700">Por favor, revisa tu pedido antes de confirmar.</p>

                <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto divide-y divide-gray-200">
                  {cart.length === 0 ? (
                      <p className="p-4 text-center text-gray-500">Tu carrito está vacío.</p>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} x {formatCurrency(item.price)}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-800">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Resumen de Totales */}
                {cart.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-800">Total de Productos:</span>
                      <span className="text-lg font-bold text-gray-900">{totalItems}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-3 border-t">
                      <span className="text-xl font-medium text-gray-800">Total a Pagar:</span>
                      <span className="text-2xl font-bold text-red-600">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Acciones Finales (Botones) */}
              {cart.length > 0 && (
                <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-3 rounded-b-lg">
                  
                  {/* --- CAMBIO AÑADIDO --- */}
                  <div className="mb-4">
                    <label htmlFor="store-select" className="block text-sm font-medium text-gray-700 mb-1">
                      Tienda:
                    </label>
                    <select
                      id="store-select"
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="w-full px-3 py-2 text-base text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="01">01</option>
                      <option value="02">02</option>
                    </select>
                  </div>
                  {/* --- FIN CAMBIO AÑADIDO --- */}

                  <button
                    onClick={() => handleSubmitOrder('quote')}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {isSubmitting ? 'Generando...' : 'Confirmar y Generar Presupuesto'}
                  </button>
                  <button
                    onClick={() => handleSubmitOrder('order')}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {isSubmitting ? 'Enviando...' : 'Confirmar y Enviar Pedido de Venta'}
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default OrderPreviewPage;