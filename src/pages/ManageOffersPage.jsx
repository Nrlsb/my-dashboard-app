import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import {
  useInfiniteQuery,
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import { Loader2, ArrowLeft, Search, CheckCircle, XCircle, Edit2, Save, X } from 'lucide-react';
import apiService from '../api/apiService.js';
import { useAuth } from "../context/AuthContext.jsx";

// --- Componente Reutilizable para el Interruptor ---
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${checked ? 'bg-green-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    aria-label={checked ? 'Desactivar oferta' : 'Activar oferta'}
  >
    <span
      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'
        }`}
    />
  </button>
);

// --- Modal de Edición ---
const EditOfferModal = ({ product, onClose, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    custom_title: product.custom_title || '',
    custom_description: product.custom_description || '',
    custom_image_url: product.custom_image_url || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(product.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Editar Oferta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título Personalizado
            </label>
            <input
              type="text"
              name="custom_title"
              value={formData.custom_title}
              onChange={handleChange}
              placeholder={product.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Dejar en blanco para usar el nombre original.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción Personalizada
            </label>
            <textarea
              name="custom_description"
              value={formData.custom_description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL de Imagen Personalizada
            </label>
            <input
              type="text"
              name="custom_image_url"
              value={formData.custom_image_url}
              onChange={handleChange}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Componente para la Fila de Producto ---
const ProductRow = ({ product, onToggle, isToggling, onEdit }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">
    <td className="py-3 px-4 text-sm text-gray-500 font-mono">
      {product.code}
    </td>
    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
      <div>
        {product.custom_title || product.name}
        {product.custom_title && (
          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            Personalizado
          </span>
        )}
      </div>
    </td>
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
      <div className="flex items-center justify-center space-x-4">
        <ToggleSwitch
          checked={product.oferta}
          onChange={onToggle}
          disabled={isToggling}
        />
        {product.oferta && (
          <button
            onClick={() => onEdit(product)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
            title="Editar detalles de oferta"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </td>
  </tr>
);

// --- Componente Principal de la Página ---
export default function ManageOffersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debounceSearchTerm, setDebounceSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const debounceTimeout = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    queryFn: ({ pageParam = 1 }) =>
      apiService.fetchProducts(pageParam, debounceSearchTerm, [], true), // Filtros vacíos para traer todo, bypassCache = true
    getNextPageParam: (lastPage, allPages) => {
      const productsLoaded = allPages.reduce(
        (acc, page) => acc + page.products.length,
        0
      );
      return productsLoaded < lastPage.totalProducts
        ? allPages.length + 1
        : undefined;
    },
    initialPageParam: 1,
    enabled: !!(user?.is_admin || user?.role === 'marketing'), // Habilitar si es admin o marketing
  });

  // Mutación para cambiar el estado de la oferta
  const { mutate: toggleOffer, isPending: isToggling } = useMutation({
    mutationFn: (productId) => apiService.toggleProductOffer(productId),
    onSuccess: (data) => {
      // Actualizamos el caché de react-query para reflejar el cambio instantáneamente
      queryClient.setQueryData(
        ['products', debounceSearchTerm, []],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.map((p) =>
                p.id === data.id
                  ? { ...p, oferta: data.oferta }
                  : p
              ),
            })),
          };
        }
      );
      // Invalidate offers query to refresh the public offers page immediately
      queryClient.invalidateQueries({ queryKey: ['offers'] });

      toast.success(
        data.oferta
          ? 'Oferta activada correctamente'
          : 'Oferta desactivada correctamente'
      );
    },
    onError: (err) => {
      toast.error(`Error al cambiar el estado de la oferta: ${err.message}`);
    },
  });

  // Mutación para guardar detalles personalizados
  const { mutate: saveOfferDetails, isPending: isSavingDetails } = useMutation({
    mutationFn: ({ productId, details }) => apiService.updateProductOfferDetails(productId, details),
    onSuccess: (data, variables) => {
      // Actualizar caché local
      queryClient.setQueryData(
        ['products', debounceSearchTerm, []],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.map((p) =>
                p.id === variables.productId
                  ? { ...p, ...variables.details }
                  : p
              ),
            })),
          };
        }
      );
      // Invalidate offers query to refresh the public offers page immediately
      queryClient.invalidateQueries({ queryKey: ['offers'] });

      setEditingProduct(null);
      toast.success('Detalles de la oferta actualizados');
    },
    onError: (err) => {
      toast.error(`Error al guardar los detalles: ${err.message}`);
    },
  });

  const allProducts = data?.pages.flatMap((page) => page.products) || [];

  if (!user?.is_admin && user?.role !== 'marketing') {
    return <div className="p-8 text-center text-red-500">Acceso denegado.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/manage-content')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Volver a Configuración"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Gestionar Ofertas
            </h1>
            <p className="text-gray-500">
              Activa o desactiva productos en oferta y personaliza su apariencia.
            </p>
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

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {isLoading && (
            <div className="p-4">
              <LoadingSpinner text="Cargando productos..." />
            </div>
          )}
          {isError && (
            <div className="p-8 text-center text-red-500">
              Error: {error.message}
            </div>
          )}
          {!isLoading && !isError && allProducts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No se encontraron productos.
            </div>
          )}
          {allProducts.map((product) => (
            <div key={product.id} className="p-4 flex flex-col space-y-3">
              <div className="flex justify-between items-start">
                <div className="pr-4">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                    {product.custom_title || product.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Cód: {product.code}
                  </p>
                  {product.custom_title && (
                    <span className="inline-block mt-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      Personalizado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div>
                  {product.oferta ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      En Oferta
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <XCircle className="w-3 h-3 mr-1" />
                      Sin Oferta
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {product.oferta && (
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-full transition-colors cursor-pointer"
                      aria-label="Editar oferta"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  <ToggleSwitch
                    checked={product.oferta}
                    onChange={() => toggleOffer(product.id)}
                    disabled={isToggling}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Código
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Descripción
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Estado Actual
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan="4" className="p-0">
                    <LoadingSpinner text="Cargando productos..." />
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-red-500">
                    Error: {error.message}
                  </td>
                </tr>
              )}
              {!isLoading && !isError && allProducts.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    No se encontraron productos.
                  </td>
                </tr>
              )}
              {allProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onToggle={() => toggleOffer(product.id)}
                  isToggling={isToggling}
                  onEdit={setEditingProduct}
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
              className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {isFetchingNextPage ? 'Cargando...' : 'Cargar más productos'}
            </button>
          )}
          {!hasNextPage && !isLoading && allProducts.length > 0 && (
            <p className="text-gray-500 text-sm">Fin de los resultados.</p>
          )}
        </div>
      </div>

      {editingProduct && (
        <EditOfferModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(productId, details) => saveOfferDetails({ productId, details })}
          isSaving={isSavingDetails}
        />
      )}
    </div>
  );
}
