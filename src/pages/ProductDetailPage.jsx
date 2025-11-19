import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from "../context/AuthContext.jsx";
import { ArrowLeft, Package, DollarSign, CheckCircle, AlertTriangle, Loader2, ShoppingCart, Info } from 'lucide-react';

// Formateador de moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};

// Componente de UI para el estado de carga (Skeleton)
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-gray-200 h-96 rounded-lg"></div>
      <div className="space-y-4">
        <div className="bg-gray-200 h-8 w-1/3 rounded"></div>
        <div className="bg-gray-200 h-12 w-3/4 rounded"></div>
        <div className="bg-gray-200 h-8 w-1/4 rounded"></div>
        <div className="bg-gray-200 h-20 w-full rounded"></div>
        <div className="bg-gray-200 h-12 w-1/2 rounded"></div>
      </div>
    </div>
  </div>
);

// Componente de UI para el estado de error
const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
    <p className="text-red-500 font-semibold text-lg">Error al cargar el producto</p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

export default function ProductDetailPage({ productId, onNavigate }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ['product', productId, user?.id],
    queryFn: () => apiService.fetchProductById(productId),
    enabled: !!productId,
  });

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (isError) {
      return <ErrorMessage message={error.message} />;
    }

    if (!product) {
      return <ErrorMessage message="No se encontró el producto." />;
    }

    return (
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-center justify-center bg-gray-100 rounded-lg h-80 md:h-96">
            <Package className="w-24 h-24 text-gray-400" />
            <span className="absolute text-gray-500 text-sm">Imagen de producto</span>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <span className="text-sm font-medium text-blue-600 uppercase">{product.brand || 'Marca'}</span>
            <h2 className="text-3xl font-bold text-gray-900">{product.name}</h2>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500">(Sin calificaciones)</span>
            </div>

            <p className="text-4xl font-extrabold text-gray-800">{formatCurrency(product.price)}</p>

            <p className="text-gray-600 leading-relaxed">
              {product.capacity_description || 'Detalles del producto no disponibles.'} 
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>

            <div className="flex items-center space-x-4">
              <span className="font-medium text-gray-700">Cantidad:</span>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 text-center border-none focus:ring-0"
                  min="1"
                />
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-colors duration-300 ${
                isAdded
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isAdded ? (
                <span className="flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Agregado
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Agregar al Carrito
                </span>
              )}
            </button>
            
            <div className="flex items-center text-sm text-gray-500">
                <Info className="w-4 h-4 mr-2" />
                <span>Cód: {product.code} | Stock: {product.stock}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center">
        <button
          onClick={() => onNavigate('new-order')}
          className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Volver a Nuevo Pedido"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Detalle del Producto</h1>
        </div>
      </header>
      
      {renderContent()}
    </div>
  );
}