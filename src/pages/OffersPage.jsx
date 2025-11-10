import React from 'react';
// (NUEVO) Importar ArrowLeft
import { Tag, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchOffers } from '../api/apiService.js'; // <-- Corregido con .js

// Componente de UI para el estado de carga (Skeleton)
const LoadingSkeleton = () => (
  <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="bg-gray-200 h-48 rounded-lg"></div>
    <div className="bg-gray-200 h-48 rounded-lg"></div>
    <div className="bg-gray-200 h-48 rounded-lg"></div>
  </div>
);

// Componente de UI para el estado de error
const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">Error al cargar las ofertas</p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

// Componente para una tarjeta de oferta
const OfferCard = ({ offer }) => (
  <div className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-105 duration-300">
    <div className="p-6">
      <div className="flex items-center mb-3">
        <Tag className="w-5 h-5 text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">{offer.titulo}</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">{offer.descripcion}</p>
      <div className="text-sm text-gray-500">
        <span className="font-medium">Válido hasta:</span> {new Date(offer.valido_hasta).toLocaleDateString('es-AR')}
      </div>
      <button className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-200">
        Ver productos
      </button>
    </div>
  </div>
);

export default function OffersPage({ onNavigate }) { // (NUEVO) Recibe onNavigate
  // 1. Reemplazamos useEffect y useState con useQuery
  const { 
    data: offers = [], // Valor por defecto
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['offers'], // Clave única
    queryFn: fetchOffers, // Función de API
    staleTime: 1000 * 60 * 15, // 15 minutos de caché
  });

  // 2. Renderizado condicional
  const renderContent = () => {
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay ofertas disponibles</h3>
          <p className="mt-1 text-sm text-gray-500">Vuelve a consultar más tarde para ver nuevas promociones.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* (MODIFICADO) Encabezado con botón de volver */}
      <header className="mb-6 flex items-center">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ofertas y Promociones</h1>
          <p className="text-gray-600">Descubre los descuentos vigentes que tenemos para ti.</p>
        </div>
      </header>
      
      {renderContent()}
    </div>
  );
}