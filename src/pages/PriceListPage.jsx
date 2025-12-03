import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import {
  Loader2,
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  Download,
} from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import apiService from '/src/api/apiService.js';
import { useAuth } from '../context/AuthContext.jsx';

// --- Formateadores ---
const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    amount || 0
  );
const formatUSD = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    amount || 0
  );
const formatRate = (amount) =>
  new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
const formatMoneda = (moneda) => {
  const numericMoneda = Number(moneda);
  if (numericMoneda === 2) return 'USD Billete';
  if (numericMoneda === 3) return 'USD Divisa';
  return 'ARS';
};

// --- Componentes de UI Internos ---
const ProductRow = ({ product }) => (
  <tr className={`border-b border-gray-200 hover:bg-gray-50 ${product.recentlyChanged ? 'bg-yellow-50' : ''}`}>
    <td className="py-3 px-4 text-sm text-gray-500 font-mono">
      {product.code}
    </td>
    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
      {product.name}
      {product.recentlyChanged && (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Precio modificado
        </span>
      )}
    </td>
    <td className="py-3 px-4 text-sm text-gray-500">{product.brand}</td>
    <td className="py-3 px-4 text-sm text-gray-500">{product.product_group}</td>
    <td className="py-3 px-4 text-sm text-gray-500 text-right">
      {formatMoneda(product.moneda)}
    </td>
    <td className="py-3 px-4 text-sm text-gray-500 text-right">
      {formatRate(product.cotizacion)}
    </td>
    <td className="py-3 px-4 text-sm text-gray-600 font-medium text-right">
      {Number(product.moneda) === 2 || Number(product.moneda) === 3
        ? formatUSD(product.originalPrice)
        : '-'}
    </td>
    <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
      {formatCurrency(product.price)}
    </td>
  </tr>
);

const ProductRowSkeleton = () => (
  <tr className="border-b border-gray-200 animate-pulse">
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-48"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-10 ml-auto"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
    </td>
  </tr>
);

const ErrorMessage = ({ message, onRetry, showRetry = true }) => (
  <div className="text-center p-6 bg-white rounded-lg shadow-md my-6">
    <p className="text-red-500 font-semibold">Error al cargar productos</p>
    <p className="text-gray-600 mt-2">{message}</p>
    {showRetry && onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Volver a intentar
      </button>
    )}
  </div>
);

// --- Componente Principal de la Página ---
export default function PriceListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [debounceSearchTerm, setDebounceSearchTerm] = useState('');

  const debounceTimeout = useRef(null);
  const brandDropdownRef = useRef(null);

  const pdfMutation = useMutation({
    mutationFn: () =>
      apiService.fetchAllProductsForPDF(debounceSearchTerm, selectedBrands),
    onSuccess: (products) => {
      if (!products || products.length === 0) {
        alert(
          'No se encontraron productos con los filtros actuales para generar el PDF.'
        );
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('Lista de Precios - Pintureria Mercurio', 14, 22);
      doc.setFontSize(10);
      const brandText =
        selectedBrands.length > 0 ? selectedBrands.join(', ') : 'Todas';
      doc.text(
        `Filtros: ${debounceSearchTerm || 'Ninguno'} | Marca: ${brandText}`,
        14,
        28
      );
      doc.text(
        `Fecha: ${new Date().toLocaleDateString('es-AR')}`,
        doc.internal.pageSize.getWidth() - 14,
        28,
        { align: 'right' }
      );

      const columns = [
        'Código',
        'Descripción',
        'Marca',
        'Grupo',
        'Mon',
        'Cotiz',
        'Precio USD',
        'Precio ARS',
      ];
      const rows = products.map((p) => [
        p.code,
        p.name,
        p.brand,
        p.product_group,
        formatMoneda(p.moneda),
        formatRate(p.cotizacion),
        Number(p.moneda) === 2 || Number(p.moneda) === 3
          ? formatUSD(p.originalPrice)
          : '-',
        formatCurrency(p.price),
      ]);

      doc.autoTable({
        startY: 35,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [40, 58, 90] },
        styles: { fontSize: 8 },
        columnStyles: {
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
        },
      });

      doc.save('lista-de-precios.pdf');
    },
    onError: (error) => {
      console.error('Error al generar el PDF:', error);
      alert(`Error al generar el PDF: ${error.message}`);
    },
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    error,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['products', debounceSearchTerm, selectedBrands, user?.id],
    queryFn: ({ pageParam = 1 }) =>
      apiService.fetchProducts(pageParam, debounceSearchTerm, selectedBrands),
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
    staleTime: 1000 * 60 * 1,
    enabled: !!user,
  });

  const { data: brandsData, isLoading: isBrandsLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => apiService.fetchProtheusBrands(),
    staleTime: 1000 * 60 * 60,
    enabled: !!user,
  });

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(
      () => setDebounceSearchTerm(searchTerm),
      500
    );
    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(event.target)
      ) {
        setIsBrandDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleBrandChange = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedBrands([]);
  };

  const handleGeneratePDF = () => pdfMutation.mutate();

  const allProducts = data?.pages.flatMap((page) => page.products) || [];
  const hasFilters = searchTerm.length > 0 || selectedBrands.length > 0;

  const getBrandButtonLabel = () => {
    if (isBrandsLoading) return 'Cargando marcas...';
    if (selectedBrands.length === 0) return 'Todas las marcas';
    if (selectedBrands.length === 1) return selectedBrands[0];
    return `${selectedBrands.length} marcas seleccionadas`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Lista de Precios</h1>
        </div>
        <button
          onClick={handleGeneratePDF}
          disabled={pdfMutation.isPending}
          className="inline-flex items-center justify-center px-4 py-2 bg-espint-green text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {pdfMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          Descargar PDF
        </button>
      </header>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label htmlFor="search" className="sr-only">
            Buscar producto
          </label>
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Buscar por nombre o código..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-espint-blue"
          />
        </div>

        <div className="relative" ref={brandDropdownRef}>
          <label htmlFor="brand-dropdown" className="sr-only">
            Filtrar por marca
          </label>
          <button
            id="brand-dropdown"
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            disabled={isBrandsLoading}
            className="w-full flex justify-between items-center text-left bg-white pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-espint-blue"
          >
            <span className="truncate">{getBrandButtonLabel()}</span>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${isBrandDropdownOpen ? 'rotate-180' : ''
                }`}
            />
          </button>
          {isBrandDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {brandsData &&
                brandsData.map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandChange(brand)}
                      className="h-4 w-4 rounded border-gray-300 text-espint-blue focus:ring-espint-blue"
                    />
                    <span className="ml-3 text-sm text-gray-700">{brand}</span>
                  </label>
                ))}
            </div>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="mb-6">
          <button
            onClick={handleClearFilters}
            className="flex items-center text-sm text-espint-blue hover:text-blue-800"
          >
            <X className="w-4 h-4 mr-1" />
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider">
                  Código
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider">
                  Descripción
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider">
                  Marca
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider">
                  Grupo
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider text-right">
                  Moneda
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider text-right">
                  Cotización
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider text-right">
                  Precio (USD)
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider text-right">
                  Precio Final (ARS)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading &&
                allProducts.length === 0 &&
                Array.from({ length: 10 }).map((_, i) => (
                  <ProductRowSkeleton key={i} />
                ))}
              {isError && (
                <tr>
                  <td colSpan="8">
                    <ErrorMessage
                      message={error.message}
                      onRetry={() => window.location.reload()}
                    />
                  </td>
                </tr>
              )}
              {allProducts.length > 0 &&
                allProducts.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 text-center">
          {!isLoading && !isError && allProducts.length === 0 && (
            <p className="text-gray-500">
              No se encontraron productos con esos filtros.
            </p>
          )}
          {isFetchingNextPage && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">
                Cargando más productos...
              </span>
            </div>
          )}
          {!hasNextPage && !isLoading && allProducts.length > 0 && (
            <p className="text-gray-500 text-sm">Fin de los resultados.</p>
          )}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-4 px-6 py-2 bg-espint-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center mx-auto"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando
                  más...
                </>
              ) : (
                'Cargar más productos'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
