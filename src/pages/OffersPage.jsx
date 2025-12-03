import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService.js';
import { useAuth } from '../context/AuthContext';

const LoadingSkeleton = () => (
  <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="bg-gray-200 h-48 rounded-lg"></div>
    <div className="bg-gray-200 h-48 rounded-lg"></div>
    <div className="bg-gray-200 h-48 rounded-lg"></div>
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">
      Error al cargar las ofertas
    </p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

const ProductOfferCard = ({ product }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-105 duration-300 flex flex-col justify-between h-full">
      {product.custom_image_url && (
        <div className="h-48 w-full overflow-hidden">
          <img
            src={product.custom_image_url}
            alt={product.custom_title || product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase">
            {product.brand || 'Marca'}
          </span>
          <Tag className="w-6 h-6 text-blue-500" />
        </div>
        <h3
          className={`text-base font-semibold text-gray-800 mb-2 ${!product.custom_description ? 'h-12 overflow-hidden' : ''}`}
          title={product.custom_title || product.name}
        >
          {product.custom_title || product.name}
        </h3>
        {product.custom_description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {product.custom_description}
          </p>
        )}
        <p className="text-sm text-gray-500 mb-4 font-mono">{product.code}</p>
        <div className="mt-auto">
          <p className="text-2xl font-bold text-gray-900">
            {product.formattedPrice}
          </p>
        </div>
      </div>
      <div className="p-4 bg-gray-50 mt-auto">
        <button
          onClick={() => navigate(`/product-detail/${product.id}`)}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-200"
        >
          Ver Detalle
        </button>
      </div>
    </div>
  );
};

export default function OffersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: offers = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['offers', user?.id],
    queryFn: () => apiService.fetchOffers(),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Reducido a 5 min por la naturaleza de las ofertas
  });

  const renderContent = () => {
    if (!user?.id) {
      return (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Inicia sesión para ver las ofertas
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Necesitas estar autenticado para acceder a esta sección.
          </p>
        </div>
      );
    }

    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (isError) {
      return <ErrorMessage message={error.message} />;
    }

    if (offers.length === 0) {
      return (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <Tag className="mx-auto w-16 h-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No hay ofertas disponibles
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Vuelve a consultar más tarde para ver nuevas promociones.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {offers.map((product) => (
          <ProductOfferCard key={product.id} product={product} />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Ofertas y Promociones
          </h1>
          <p className="text-gray-600">
            Descubre los productos con descuentos vigentes que tenemos para ti.
          </p>
        </div>
      </header>

      {renderContent()}
    </div>
  );
}
