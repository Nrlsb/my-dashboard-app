import React, { useState, useMemo } from 'react';
// (NUEVO) Importar ArrowLeft
import { Search, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../api/apiService.js';

const PRODUCTS_PER_PAGE = 20;

// Componente para una fila de la tabla
// (CORREGIDO) Se usan los nombres de prop 'code', 'name', 'brand', 'capacity_description' y 'price'
const ProductRow = React.memo(({ product }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">
    <td className="py-3 px-4 text-sm text-gray-700">{product.code}</td>
    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{product.name}</td>
    <td className="py-3 px-4 text-sm text-gray-600">{product.brand || 'N/A'}</td>
    <td className="py-3 px-4 text-sm text-gray-600">{product.capacity_description || product.capacity || 'N/A'}</td>
    <td className="py-3 px-4 text-sm text-gray-800 font-semibold text-right">
      ${parseFloat(product.price).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </td>
  </tr>
));

// Componente de UI para el estado de carga
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Componente de UI para el estado de error
const ErrorMessage = ({ message }) => (
  <div className="text-center py-20">
    <p className="text-red-500 font-semibold">Error al cargar los datos</p>
    <p className="text-gray-600">{message}</p>
  </div>
);

export default function PriceListPage({ onNavigate }) { // (NUEVO) Recibe onNavigate
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(''); // (NUEVO) Estado para la marca
  const [currentPage, setCurrentPage] = useState(1); // (NUEVO) Estado para paginación
  
  // 1. (CORREGIDO) queryKey ahora incluye las dependencias
  const queryKey = ['products', currentPage, searchTerm, selectedBrand];

  const { 
    data, // 'data' será el objeto { products: [...], totalProducts: X }
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: queryKey,
    // (CORREGIDO) queryFn ahora pasa los parámetros
    queryFn: () => fetchProducts(currentPage, searchTerm, selectedBrand),
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
    gcTime: 1000 * 60 * 30,
    placeholderData: (prevData) => prevData, // Mantiene datos anteriores mientras carga
  });

  // 2. (CORREGIDO) Extraemos 'products' y 'totalProducts' del 'data'
  const products = data?.products || [];
  const totalProducts = data?.totalProducts || 0;
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  // 3. La lógica de filtrado ahora es manejada por el backend.
  // Mantenemos el useMemo solo para el caso de que 'products' sea la lista.
  // (CORREGIDO) El filtrado ya no es necesario aquí si el backend lo hace.
  // 'products' ya viene filtrado.
  const filteredProducts = products;

  // --- (NUEVO) Lógica de Paginación ---
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
    }
  };
  
  // (NUEVO) Cargar marcas para el dropdown (consulta separada)
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/api/brands');
      if (!res.ok) throw new Error('No se pudieron cargar las marcas');
      return res.json();
    },
    staleTime: Infinity, // Las marcas no cambian seguido
    gcTime: Infinity,
  });

  // 4. El renderizado ahora usa isLoading, isError y los datos de useQuery
  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (isError) {
      return <ErrorMessage message={error.message} />;
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-500">
            {searchTerm 
              ? "No se encontraron productos que coincidan con su búsqueda." 
              : "No hay productos disponibles."}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md overflow-hidden">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Descripción</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Marca</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Capacidad</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* (CORREGIDO) La key ahora es product.id */}
            {filteredProducts.map(product => (
              <ProductRow key={product.id} product={product} />
            ))}
          </tbody>
        </table>
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
          <h1 className="text-3xl font-bold text-gray-800">Lista de Precios</h1>
          <p className="text-gray-600">Consulte el precio de todos nuestros productos.</p>
        </div>
      </header>

      {/* (NUEVO) Controles de Filtro */}
      <div className="p-6 bg-white rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selector de Marca */}
          <div>
            <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Marca
            </label>
            <select
              id="brand-select"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setCurrentPage(1); // Resetear página
              }}
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
                type="text"
                placeholder="Buscar por código, descripción o marca..."
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1); // Resetear página
                }}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>


      {renderContent()}
      
      {/* (NUEVO) Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 p-4 bg-white rounded-lg shadow-md">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Anterior
          </button>
          <span className="text-sm text-gray-700">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      )}
    </div>
  );
}