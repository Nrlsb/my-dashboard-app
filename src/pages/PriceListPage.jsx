import React, { useState, useEffect, useMemo } from 'react';
import Header from '/src/components/Header.jsx';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Definimos la URL de la API
const API_URL = 'http://localhost:3001';
const PRODUCTS_PER_PAGE = 20;

// --- Página de Lista de Precios ---
const PriceListPage = ({ onNavigate }) => {

  // --- Estados ---
  const [products, setProducts] = useState([]); // (CAMBIADO) Almacena solo la página actual
  const [brands, setBrands] = useState([]); // (NUEVO) Almacena las marcas para el filtro
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  
  // (NUEVO) Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // --- Carga de Datos ---

  // (NUEVO) Cargar marcas (solo una vez)
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(`${API_URL}/api/brands`);
        if (!response.ok) throw new Error('No se pudo cargar las marcas.');
        const data = await response.json();
        setBrands(data);
      } catch (err) {
        // No es un error crítico si las marcas no cargan, seteamos el error
        setError(err.message);
      }
    };
    fetchBrands();
  }, []);

  // (ACTUALIZADO) Cargar productos (se ejecuta cada vez que cambian los filtros o la página)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // (NUEVO) Construir los parámetros de consulta para el backend
        const params = new URLSearchParams({
          page: currentPage,
          limit: PRODUCTS_PER_PAGE,
          search: searchTerm,
          brand: selectedBrand,
        });

        // (ACTUALIZADO) Hacer la solicitud con los parámetros
        const response = await fetch(`${API_URL}/api/products?${params.toString()}`);
        if (!response.ok) throw new Error('No se pudo cargar la lista de precios.');
        
        const data = await response.json(); // data ahora es { products: [...], totalProducts: X }

        // (CORREGIDO) Seteamos los productos y el total
        setProducts(data.products);
        setTotalProducts(data.totalProducts);

      } catch (err) {
        setError(err.message);
        setProducts([]); // Limpiar productos en caso de error
        setTotalProducts(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [currentPage, searchTerm, selectedBrand]); // (ACTUALIZADO) Dependencias del useEffect

  // (ELIMINADO) El useMemo para filteredProducts ya no es necesario.
  // (ELIMINADO) El useMemo para brands ya no es necesario.

  // --- Lógica de Paginación ---
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
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
    
    // (ACTUALIZADO) Comprobar 'products.length' en lugar de 'filteredProducts.length'
    if (products.length === 0) {
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
            {/* (ACTUALIZADO) Mapear 'products' directamente */}
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.code}</td>
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
            
            {/* (ACTUALIZADO) Selector de Marca usa el estado 'brands' */}
            <div>
              <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Marca
              </label>
              <select
                id="brand-select"
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setCurrentPage(1); // (NUEVO) Resetear a página 1 al cambiar filtro
                }}
              >
                <option value="">Todas las marcas</option>
                {/* (ACTUALIZADO) Mapear estado 'brands' */}
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // (NUEVO) Resetear a página 1 al cambiar filtro
                  }}
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

        {/* (NUEVO) Controles de Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-6 py-4 bg-white rounded-lg shadow-md">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Anterior
            </button>
            <span className="text-sm text-gray-700">
              Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        )}

      </main>
    </div>
  );
};

export default PriceListPage;