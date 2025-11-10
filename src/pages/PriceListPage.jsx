import React, { useState, useEffect, useMemo } from 'react';
import Header from '/src/components/Header.jsx';
import { ArrowLeft, Search } from 'lucide-react';

// (NUEVO) Definimos la URL de la API
const API_URL = 'http://localhost:3001';

// --- Página de Lista de Precios ---
const PriceListPage = ({ onNavigate }) => {

  // Estados
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  
  // Cargar datos al montar
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/api/products`);
        if (!response.ok) throw new Error('No se pudo cargar la lista de precios.');
        const data = await response.json();
        
        setAllProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // (ACTUALIZADO) Lógica de filtrado con búsqueda inteligente
  const filteredProducts = useMemo(() => {
    // ======================================================
    // --- INICIO DE CORRECCIÓN DE RUNTIME ERROR ---
    // Nos aseguramos de que allProducts sea un array antes de filtrarlo.
    if (!Array.isArray(allProducts)) {
      return [];
    }
    // --- FIN DE CORRECCIÓN DE RUNTIME ERROR ---
    // ======================================================

    // 1. Convertir el término de búsqueda en un array de palabras, en minúscula
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(t => t); 
  
    return allProducts.filter(product => {
      const matchesBrand = selectedBrand ? product.brand === selectedBrand : true;
      
      // ======================================================
      // --- INICIO DE CORRECCIÓN (de la respuesta anterior) ---
      // 1. Aseguramos que 'name' y 'code' sean strings vacíos si son null/undefined
      // 2. Usamos 'product.code' para la búsqueda, no 'product.id'.
      const productName = (product.name || '').toLowerCase();
      const productCode = (product.code || '').toLowerCase();
      // --- FIN DE CORRECCIÓN ---
      // ======================================================

      // Si no hay término de búsqueda, solo filtrar por marca
      if (searchTerms.length === 0) {
        return matchesBrand;
      }
      
      // 3. Comprobar si *todos* los términos de búsqueda están en el nombre O el código
      const matchesSearch = searchTerms.every(term => 
        productName.includes(term) || 
        productCode.includes(term)
      );
      
      return matchesBrand && matchesSearch;
    });
  }, [searchTerm, selectedBrand, allProducts]);
  
  // (ACTUALIZADO) Marcas se derivan de los productos cargados
  const brands = useMemo(() => {
    // ======================================================
    // --- INICIO DE CORRECCIÓN DE RUNTIME ERROR ---
    // Añadimos la misma validación por si acaso.
    if (!Array.isArray(allProducts)) {
      return [];
    }
    // --- FIN DE CORRECCIÓN DE RUNTIME ERROR ---
    // ======================================================
    return [...new Set(allProducts.map(p => p.brand))];
  }, [allProducts]);

  // Formateador de moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  // Renderizado condicional
  const renderContent = () => {
    if (loading) {
      return <div className="p-6 text-center text-gray-600">Cargando productos...</div>;
    }
    
    if (error) {
      return <div className="p-6 text-center text-red-600">{error}</div>;
    }
    
    if (filteredProducts.length === 0) {
       return <div className="p-6 text-center text-gray-600">No se encontraron productos.</div>;
    }

    return (
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
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                {/* ====================================================== */}
                {/* --- INICIO DE CORRECCIÓN (de la respuesta anterior) --- */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.code}</td>
                {/* --- FIN DE CORRECCIÓN --- */}
                {/* ====================================================== */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.brand}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{formatCurrency(product.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* (ACTUALIZADO) Pasamos onNavigate al Header */}
      <Header onNavigate={onNavigate} />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Encabezado con Botón de Volver y Título */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
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
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
          {renderContent()}
        </div>

      </main>
    </div>
  );
};

export default PriceListPage;