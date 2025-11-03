import React from 'react';
import Header from '../components/Header.jsx';
import { ArrowLeft, Search } from 'lucide-react';

// --- Página de Nuevo Pedido ---
const NewOrderPage = ({ onNavigate }) => {
  // Lista de marcas de ejemplo para el dropdown
  const brands = [
    'Pinturas Mercurio',
    'Marca Alba',
    'Marca Sinteplast',
    'Marca Tersuave',
    'Pinceles El Galgo',
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
          <h1 className="text-2xl font-bold text-gray-800">Nuevo Pedido</h1>
        </div>

        {/* Controles de Filtro (Selector y Búsqueda) */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Selector de Marca */}
            <div>
              <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Marca
              </label>
              <select
                id="brand-select"
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Todas las marcas</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Barra de Búsqueda */}
            <div>
              <label htmlFor="search-product" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Producto
              </label>
              <div className="relative mt-1">
                <input
                  id="search-product"
                  name="search-product"
                  type="text"
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Buscar por nombre, código..."
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Espacio para la lista de productos */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow-md min-h-[300px]">
          <p className="text-center text-gray-500">Los resultados de los productos aparecerán aquí...</p>
        </div>

      </main>
    </div>
  );
};

export default NewOrderPage;
