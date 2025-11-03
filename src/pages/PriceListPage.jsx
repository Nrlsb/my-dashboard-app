import React from 'react';
import Header from '../components/Header.jsx';
import { ArrowLeft, Search } from 'lucide-react';

// --- Página de Lista de Precios ---
const PriceListPage = ({ onNavigate }) => {

  // Lista de marcas de ejemplo
  const brands = [
    'Pinturas Mercurio',
    'Marca Alba',
    'Marca Sinteplast',
    'Marca Tersuave',
    'Pinceles El Galgo',
  ];

  // Datos de ejemplo para la lista de precios
  const priceList = [
    { id: 'PM-1001', name: 'Latex Interior Mate 20L', brand: 'Pinturas Mercurio', price: '$25,000.00' },
    { id: 'AL-500', name: 'Sintético Brillante Blanco 1L', brand: 'Marca Alba', price: '$5,500.00' },
    { id: 'ST-202', name: 'Impermeabilizante Techos 10L', brand: 'Marca Sinteplast', price: '$18,000.00' },
    { id: 'TS-300', name: 'Barniz Marino 1L', brand: 'Marca Tersuave', price: '$4,200.00' },
    { id: 'EG-010', name: 'Pincel N°10 Virola 1', brand: 'Pinceles El Galgo', price: '$1,500.00' },
    { id: 'PM-1002', name: 'Latex Exterior 10L', brand: 'Pinturas Mercurio', price: '$19,000.00' },
    { id: 'AL-505', name: 'Sintético Brillante Negro 1L', brand: 'Marca Alba', price: '$5,500.00' },
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
          <h1 className="text-2xl font-bold text-gray-800">Lista de Precios</h1>
        </div>

        {/* Controles de Filtro (Selector y Búsqueda) */}
        <div className="p-6 bg-white rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Selector de Marca */}
            <div>
              <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Marca
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

        {/* Tabla de Lista de Precios */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marca
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {priceList.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{product.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

export default PriceListPage;
