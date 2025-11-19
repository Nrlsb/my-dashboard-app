import React, { useState, useMemo } from 'react';
// (MODIFICADO) Se corrige la ruta de importación añadiendo la extensión
import { useCart } from '../context/CartContext.jsx'; 
import { AlertCircle, CheckCircle } from 'lucide-react';
import apiService from '../api/apiService.js'; // (NUEVO) Importar apiService

// (NUEVO) API de envío de pedidos
const API_BASE_URL = 'http://localhost:3001/api';


// (NUEVO) Helper simple de formato de moneda (si no se importa)
const formatCurrency = (value) => {
  // (MODIFICADO) Asegurarnos de que el valor sea un número
  const numberValue = Number(value);
  if (isNaN(numberValue)) {
    // Si sigue siendo NaN, formatear 0 para evitar errores
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(0);
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(numberValue);
};

const OrderPreviewPage = ({ onNavigate, onCompleteOrder, currentUser }) => {
  // (MODIFICADO) Ya no traemos 'cartTotal', solo 'cart'
  const { cart } = useCart();
  
  // El tipo de entrega ahora es 'shipping' por defecto
  const [deliveryType, setDeliveryType] = useState('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- (NUEVA SOLUCIÓN PARA EL TOTAL) ---
  // Calculamos el total localmente en esta página usando 'useMemo'.
  // Esto asegura que el total siempre esté sincronizado con el 'cart'
  // que estamos mostrando en la lista.
  const localCartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return total + (price * quantity);
    }, 0);
  }, [cart]); // Se recalcula solo si el 'cart' cambia
  // --- (FIN DE LA SOLUCIÓN) ---


  if (cart.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
        <button
          onClick={() => onNavigate('new-order')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Volver a "Nuevo Pedido"
        </button>
      </div>
    );
  }

  // Manejador para enviar el pedido/presupuesto al backend
  const handleSendOrder = async (orderType) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const orderData = {
      items: cart.map(item => ({
        id: item.id,
        code: item.code,
        quantity: item.quantity,
        price: item.price
      })),
      // (MODIFICADO) Usamos nuestro 'localCartTotal'
      total: Number(localCartTotal) || 0,
      type: orderType, 
      deliveryInfo: {
        type: deliveryType,
        address: 'Dirección del cliente'
      }
    };

    try {
      // (MODIFICADO) Usamos apiService para enviar el pedido.
      // Ya no se pasa el userId, el backend lo obtiene del token.
      const result = await apiService.createOrder(orderData);
      
      setSuccess(`¡${orderType === 'quote' ? 'Presupuesto' : 'Pedido'} enviado con éxito! ID: ${result.orderId}`);
      
      setTimeout(() => {
        onCompleteOrder();
      }, 2000);

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };


  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Revisar Pedido</h1>

      {/* Resumen del Carrito */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Resumen de Productos</h2>
        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-700">{item.name}</p>
                <p className="text-sm text-gray-500">{item.quantity} x {formatCurrency(Number(item.price) || 0)}</p>
              </div>
              <p className="font-semibold text-gray-800">{formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0))}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t-2 border-dashed">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Total:</span>
            {/* (MODIFICADO) Usamos nuestro 'localCartTotal' */}
            <span>{formatCurrency(Number(localCartTotal) || 0)}</span>
          </div>
        </div>
      </div>
      
      {/* Mensajes de estado y Botones de Acción */}
      <div className="mt-6">
        {/* Mensajes de Estado */}
        {error && (
          <div className="flex items-center bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            <AlertCircle className="h-5 w-5 mr-3" />
            <strong>Error:</strong> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center bg-green-100 text-green-700 p-4 rounded-lg mb-4">
            <CheckCircle className="h-5 w-5 mr-3" />
            {success}
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={() => onNavigate('new-order')}
            disabled={isLoading}
            className="text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Volver y editar
          </button>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            
            {/* Botón de Pedido (ahora es el único) */}
            <button
              onClick={() => handleSendOrder('order')}
              disabled={isLoading || success}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-5 w-5 inline-block mr-2" />
              Confirmar Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPreviewPage;