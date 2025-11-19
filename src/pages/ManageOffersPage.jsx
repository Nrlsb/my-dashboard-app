import React, { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Search, CheckCircle, XCircle } from 'lucide-react';
import apiService from '../api/apiService.js';

// --- Componente Reutilizable para el Interruptor ---
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
      checked ? 'bg-green-600' : 'bg-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    aria-label={checked ? 'Desactivar oferta' : 'Activar oferta'}
  >
    <span
      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// --- Componente para la Fila de Producto ---
const ProductRow = ({ product, onToggle, isToggling }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">
    <td className="py-3 px-4 text-sm text-gray-500 font-mono">{product.code}</td>
    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{product.name}</td>
    <td className="py-3 px-4 text-sm text-gray-500">
      {product.oferta ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-4 h-4 mr-1" />
          En Oferta
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="w-4 h-4 mr-1" />
          Sin Oferta
        </span>
      )}
    </td>
    <td className="py-3 px-4 text-center">
      <ToggleSwitch 
        checked={product.oferta} 
        onChange={onToggle} 
        disabled={isToggling} 
      />
    </td>
  </tr>
);

// --- Componente Principal de la Página ---
export default function ManageOffersPage({ onNavigate, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debounceSearchTerm, setDebounceSearchTerm] = useState('');
  const debounceTimeout = useRef(null);
  const queryClient = useQueryClient();

  // Debounce para el campo de búsqueda
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebounceSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm]);

  // Query para obtener los productos con paginación infinita
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['products', debounceSearchTerm, []], // Usamos una queryKey que no colisione
    queryFn: ({ pageParam = 1 }) => apiService.fetchProducts(pageParam, debounceSearchTerm, []), // Filtros vacíos para traer todo
    getNextPageParam: (lastPage, allPages) => {
      const productsLoaded = allPages.reduce((acc, page) => acc + page.products.length, 0);
      return productsLoaded < lastPage.totalProducts ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!currentUser?.is_admin, // Solo habilitar si es admin
  });

  // Mutación para cambiar el estado de la oferta
  const { mutate: toggleOffer, isPending: isToggling } = useMutation({
    mutationFn: (productId) => apiService.toggleProductOffer(productId),
    onSuccess: (data) => {
      // Actualizamos el caché de react-query para reflejar el cambio instantáneamente
      queryClient.setQueryData(['products', debounceSearchTerm, []], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            products: page.products.map(p => 
              p.id === data.product.id ? { ...p, oferta: data.product.oferta } : p
            ),
          })),
        };
      });
    },
    onError: (err) => {
      alert(`Error al cambiar el estado de la oferta: ${err.message}`);
    },
  });

  const allProducts = data?.pages.flatMap(page => page.products) || [];

  if (!currentUser?.is_admin) {
    return <div className="p-8 text-center text-red-500">Acceso denegado.</div>
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('dashboard-settings')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver a Configuración"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gestionar Ofertas</h1>
            <p className="text-gray-500">Activa o desactiva productos en oferta.</p>
          </div>
        </div>
      </header>

      <div className="mb-6 relative">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="w-full max-w-sm pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Estado Actual</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Poner en Oferta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && <tr><td colSpan="4" className="p-8 text-center text-gray-500">Cargando productos...</td></tr>}
              {isError && <tr><td colSpan="4" className="p-8 text-center text-red-500">Error: {error.message}</td></tr>}
              {!isLoading && !isError && allProducts.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No se encontraron productos.</td></tr>}
              {allProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onToggle={() => toggleOffer(product.id)}
                  isToggling={isToggling}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 text-center">
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Cargando...' : 'Cargar más productos'}
            </button>
          )}
          {!hasNextPage && !isLoading && allProducts.length > 0 && <p className="text-gray-500 text-sm">Fin de los resultados.</p>}
        </div>
      </div>
    </div>
  );
}