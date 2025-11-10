import React, { useState, useEffect } from 'react';
// (ELIMINADO) Header ya no se importa
import { ArrowLeft } from 'lucide-react';

const API_URL = 'http://localhost:3001';

// --- Página de Ofertas ---
const OffersPage = ({ onNavigate }) => {

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos al montar
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/api/offers`);
        if (!response.ok) throw new Error('No se pudo cargar las ofertas.');
        const data = await response.json();
        
        setOffers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOffers();
  }, []);

  // Renderizado condicional
  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center p-10 text-gray-600">
          Cargando ofertas...
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center p-10 text-red-600">
          {error}
        </div>
      );
    }

    if (offers.length === 0) {
      return (
        <div className="text-center p-10 text-gray-500">
          No hay ofertas disponibles en este momento.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <div key={offer.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            <img 
              src={offer.imageUrl} 
              alt={offer.title} 
              className="w-full h-48 object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/cccccc/white?text=Imagen+no+disponible'; }}
            />
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{offer.title}</h3>
              <p className="text-gray-600 text-sm mb-4 flex-1">{offer.description}</p>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-red-600">{offer.price}</span>
                {offer.oldPrice && (
                  <span className="text-lg text-gray-500 line-through">{offer.oldPrice}</span>
                )}
              </div>
              <button className="w-full px-4 py-2 mt-4 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                Ver Detalles
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* (ELIMINADO) Header ya no se renderiza aquí */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Encabezado con Botón de Volver y Título */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('dashboard')} // <-- Navega de vuelta al dashboard
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Nuevas Ofertas</h1>
        </div>

        {/* Grid de Tarjetas de Ofertas */}
        {renderContent()}

      </main>
    </div>
  );
};

export default OffersPage;