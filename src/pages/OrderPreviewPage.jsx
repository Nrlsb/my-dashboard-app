import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import apiService from '../api/apiService.js';

const formatCurrency = (value) => {
  const numberValue = Number(value);
  if (isNaN(numberValue)) {
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

const calcTotal = (items) =>
  items.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);

const OrderPreviewPage = () => {
  const { onCompleteOrder } = useOutletContext();
  const { cart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryType, setDeliveryType] = useState('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [offerCodesSet, setOfferCodesSet] = useState(new Set());

  // Fetch current offer product codes from the API (source of truth)
  useEffect(() => {
    apiService.fetchOffers()
      .then((data) => {
        const offers = Array.isArray(data) ? data : [];
        const codes = new Set(offers.map((p) => p.code).filter(Boolean));
        setOfferCodesSet(codes);
      })
      .catch((err) => {
        console.error('Could not fetch offer codes:', err);
      });
  }, []);

  const normalItems = useMemo(() => cart.filter((item) => !offerCodesSet.has(item.code)), [cart, offerCodesSet]);
  const offerItems = useMemo(() => cart.filter((item) => offerCodesSet.has(item.code)), [cart, offerCodesSet]);
  const isMixed = normalItems.length > 0 && offerItems.length > 0;

  const localCartTotal = useMemo(() => calcTotal(cart), [cart]);

  if (cart.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
        <button
          onClick={() => navigate('/new-order')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Volver a "Nuevo Pedido"
        </button>
      </div>
    );
  }

  const buildOrderData = (items, orderType, isOffer = false) => ({
    items: items.map((item) => ({
      id: item.id,
      code: item.code,
      quantity: item.quantity,
      price: item.price,
    })),
    total: calcTotal(items),
    type: orderType,
    isOffer,
    deliveryInfo: {
      type: deliveryType,
      address: 'Dirección del cliente',
    },
  });

  const handleSendOrder = async (orderType) => {
    if (user?.role === 'test_user') {
      navigate('/test-user-access-denied');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isMixed) {
        // Create two separate orders
        const [normalResult, offerResult] = await Promise.all([
          apiService.createOrder(buildOrderData(normalItems, orderType, false)),
          apiService.createOrder(buildOrderData(offerItems, orderType, true)),
        ]);
        setSuccess(
          `Se crearon 2 pedidos: Pedido normal (ID: ${normalResult.orderId}) y Pedido de promociones (ID: ${offerResult.orderId})`
        );
      } else {
        const allAreOffers = offerItems.length > 0 && normalItems.length === 0;
        const result = await apiService.createOrder(buildOrderData(cart, orderType, allAreOffers));
        setSuccess(
          `¡${orderType === 'quote' ? 'Presupuesto' : 'Pedido'} enviado con éxito! ID: ${result.orderId}`
        );
      }
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

      {isMixed && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-4">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            Tu pedido contiene productos en <strong>promoción</strong> y productos regulares.
            Al confirmar se crearán <strong>2 pedidos separados</strong>: uno para los productos
            normales y otro para los productos en promoción.
          </p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
          Resumen de Productos
        </h2>
        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-700">
                  {item.name}
                  {offerCodesSet.has(item.code) && (
                    <span className="ml-2 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full align-middle">
                      OFERTA
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {item.quantity} x {formatCurrency(Number(item.price) || 0)}
                </p>
              </div>
              <p className="font-semibold text-gray-800">
                {formatCurrency(
                  (Number(item.quantity) || 0) * (Number(item.price) || 0)
                )}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t-2 border-dashed">

          <div className="flex justify-between items-center text-xl font-bold">
            <span>Total:</span>
            <span>{formatCurrency(Number(localCartTotal) || 0)}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1 text-right">
            Precio con IVA incluído
          </p>
        </div>
      </div>

      <div className="mt-6">
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

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={() => navigate('/new-order')}
            disabled={isLoading}
            className="text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Volver y editar
          </button>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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
