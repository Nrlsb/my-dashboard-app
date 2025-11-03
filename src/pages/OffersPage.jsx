import React from 'react';
import Header from '../components/Header.jsx';
import { ArrowLeft } from 'lucide-react';

// --- Página de Ofertas ---
const OffersPage = ({ onNavigate }) => {

  // Datos de ejemplo para las ofertas
  const offers = [
    {
      id: 1,
      title: 'Kit Pintor Completo Mercurio',
      description: 'Llevate 20L de Latex Interior + Rodillo + Pincel N°10 con un 20% de descuento.',
      price: '$28,000.00',
      oldPrice: '$35,000.00',
      imageUrl: 'https://placehold.co/600x400/ef4444/white?text=Oferta+Kit',
    },
    {
      id: 2,
      title: '2x1 en Sintético Brillante Alba',
      description: 'Comprando 1L de Sintético Brillante Blanco, te llevas otro de regalo (o 50% off en la 2da unidad).',
      price: '$5,500.00',
      oldPrice: '$11,000.00',
      imageUrl: 'https://placehold.co/600x400/3b82f6/white?text=Oferta+2x1',
    },
    {
      id: 3,
      title: 'Envío Gratis Superando $50,000',
      description: 'Todas tus compras superiores a $50,000 tienen envío gratis a tu sucursal.',
      price: '¡GRATIS!',
      oldPrice: '',
      imageUrl: 'https://placehold.co/600x400/10b981/white?text=Envío+Gratis',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
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

      </main>
    </div>
  );
};

export default OffersPage;
