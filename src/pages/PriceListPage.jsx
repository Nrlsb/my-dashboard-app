import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import {
  Loader2,
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  Download,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle,
} from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import apiService from '/src/api/apiService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useProductQuantity } from '../hooks/useProductQuantity';

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
const ProductRow = ({ product, onAddToCart }) => {
  const {
    quantity,
    setQuantity,
    increment,
    decrement,
    handleInputChange,
    handleBlur,
    stock,
    isRestricted
  } = useProductQuantity(product);

  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);

    // Reset to initial correct quantity
    const packQty = Number(product.pack_quantity) > 0 ? Number(product.pack_quantity) : 1;
    const initial = (isRestricted && stock <= 0) ? packQty : 1;
    setQuantity(initial);
  };

  return (
    <tr className={`border-b border-gray-200 hover:bg-gray-50 ${product.recentlyChanged ? 'bg-yellow-50' : ''}`}>
      <td className="py-3 px-4 text-sm text-gray-500 font-mono">
        {product.code}
      </td>
      <td className="py-3 px-4 text-sm text-gray-900 font-medium">
        {product.name}
        {(product.recentlyChanged || product.isPriceModified) && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            {product.isPriceModified ? 'Precio modificado' : 'Reciente'}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">{product.brand}</td>
      <td className="py-3 px-4 text-sm text-center">
        {stock <= 0 ? (
          <span className="text-red-600 font-medium">Sin Stock</span>
        ) : (
          <span className="text-gray-600 font-medium">
            {stock > 100 ? '+100' : stock}
          </span>
        )}
        {product.stock_de_seguridad > 0 && (
          <div className="text-[10px] text-blue-600 font-medium">Previsto de ingreso</div>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-gray-500 text-right">
        {formatMoneda(product.moneda)}
      </td>
      <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
        {formatCurrency(product.price)}
      </td>
      <td className="py-3 px-4 text-sm">
        <div className="flex items-center justify-end space-x-2">
          <div className="flex items-center border border-gray-300 rounded-md bg-white">
            <button
              onClick={decrement}
              className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-l-md cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className="w-16 text-center text-xs border-none focus:ring-0 p-1" // Width increased slightly to handle larger packaged numbers
            />
            <button
              onClick={increment}
              className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-r-md cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isAdded}
            className={`p-1.5 rounded-md transition-colors ${isAdded
              ? 'bg-green-100 text-green-600'
              : 'bg-espint-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
              }`}
            title={isAdded ? 'Agregado' : 'Agregar al carrito'}
          >
            {isAdded ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
};

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
      <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-10 ml-auto"></div>
    </td>
    <td className="py-3 px-4">
      <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
    </td>
    <td className="py-3 px-4">
      <div className="flex justify-end space-x-2">
        <div className="h-6 w-16 bg-gray-200 rounded"></div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
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
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
      >
        Volver a intentar
      </button>
    )}
  </div>
);

// --- Componente Principal de la Página ---
export default function PriceListPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [debounceSearchTerm, setDebounceSearchTerm] = useState('');
  const [onlyModifiedPrices, setOnlyModifiedPrices] = useState(false); // New State

  useEffect(() => {
    const brandParam = searchParams.get('brand');
    if (brandParam) {
      // Decode and split by comma to support multiple brands
      const brands = decodeURIComponent(brandParam).split(',');
      setSelectedBrands(brands);
    }
  }, [searchParams]);



  const debounceTimeout = useRef(null);
  const brandDropdownRef = useRef(null);

  const excelMutation = useMutation({
    mutationFn: () =>
      apiService.fetchAllProductsForPDF(debounceSearchTerm, selectedBrands),
    onSuccess: async (products) => {
      if (!products || products.length === 0) {
        alert(
          'No se encontraron productos con los filtros actuales para generar el Excel.'
        );
        return;
      }

      try {
        // Importación dinámica de ExcelJS para no aumentar el bundle inicial
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Lista de Precios');

        // Definir columnas
        worksheet.columns = [
          { header: 'Código', key: 'code', width: 15 },
          { header: 'Descripción', key: 'name', width: 40 },
          { header: 'Marca', key: 'brand', width: 20 },
          { header: 'Stock', key: 'stock', width: 15 },
          { header: 'Moneda', key: 'moneda', width: 12 },
          { header: 'Precio Final (ARS)', key: 'price', width: 20 },
        ];

        // Estilar encabezados
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF283A5A' }, // Color azul oscuro similar al del PDF
        };

        // Agregar filas
        products.forEach((p) => {
          const row = worksheet.addRow({
            code: p.code,
            name: p.name,
            brand: p.brand,
            stock:
              p.stock_disponible <= 0
                ? 'Sin Stock' + (p.stock_de_seguridad > 0 ? ' (Previsto)' : '')
                : (p.stock_disponible > 100
                  ? '+100'
                  : p.stock_disponible) +
                (p.stock_de_seguridad > 0 ? ' (Previsto)' : ''),
            moneda: formatMoneda(p.moneda),
            price: Number(p.price),
          });

          // Formato de celdas numéricas
          row.getCell('price').numFmt = '"$"#,##0.00';
        });

        // Generar archivo y descargar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'lista-de-precios.xlsx';
        anchor.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error al generar el Excel:', error);
        alert(`Error al generar el Excel: ${error.message}`);
      }
    },
    onError: (error) => {
      console.error('Error al obtener productos para Excel:', error);
      alert(`Error al obtener productos: ${error.message}`);
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
    queryKey: ['products', debounceSearchTerm, selectedBrands, onlyModifiedPrices, user?.id],
    queryFn: ({ pageParam = 1 }) => {
      return apiService.fetchProducts(pageParam, debounceSearchTerm, selectedBrands, false, 20, '', false, onlyModifiedPrices);
    },
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
    setOnlyModifiedPrices(false);
  };

  const handleGenerateExcel = () => excelMutation.mutate();
  const allProducts = data?.pages.flatMap((page) => page.products) || [];
  const hasFilters = searchTerm.length > 0 || selectedBrands.length > 0 || onlyModifiedPrices;

  const getBrandButtonLabel = () => {
    if (isBrandsLoading) return 'Cargando marcas...';
    if (selectedBrands.length === 0) return 'Todas las marcas';
    if (selectedBrands.length === 1) return selectedBrands[0];
    return `${selectedBrands.length} marcas seleccionadas`;
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center p-2 mr-2 md:mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <h1 className="text-xl md:text-3xl font-bold text-gray-800">Lista de Precios</h1>
        </div>
        <button
          onClick={handleGenerateExcel}
          disabled={excelMutation.isPending}
          className="inline-flex items-center justify-center px-3 py-2 md:px-4 md:py-2 bg-espint-green text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {excelMutation.isPending ? (
            <Loader2 className="w-5 h-5 md:mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 md:mr-2" />
          )}
          <span className="hidden md:inline">Descargar Excel</span>
        </button>
      </header>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
            className="w-full flex justify-between items-center text-left bg-white pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-espint-blue cursor-pointer"
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

        <div className="flex items-center space-x-2">
          <input
            id="modified-prices"
            type="checkbox"
            checked={onlyModifiedPrices}
            onChange={(e) => setOnlyModifiedPrices(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-espint-blue focus:ring-espint-blue cursor-pointer"
          />
          <label htmlFor="modified-prices" className="text-gray-700 font-medium cursor-pointer">
            Precios Modificados
          </label>
        </div>


      </div>

      {hasFilters && (
        <div className="mb-6">
          <button
            onClick={handleClearFilters}
            className="flex items-center text-sm text-espint-blue hover:text-blue-800 cursor-pointer"
          >
            <X className="w-4 h-4 mr-1" />
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 mb-6">
        {isLoading &&
          allProducts.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 ml-auto"></div>
            </div>
          ))}

        {isError && (
          <ErrorMessage
            message={error.message}
            onRetry={() => window.location.reload()}
          />
        )}

        {allProducts.length > 0 &&
          allProducts.map((product) => (
            <div key={product.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                  {product.name}
                  {(product.recentlyChanged || product.isPriceModified) && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                      {product.isPriceModified ? 'Precio modificado' : 'Reciente'}
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-xs text-gray-500">
                  <p>Cód: {product.code}</p>
                  <p>Marca: {product.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(product.price)}</p>
                  {(Number(product.moneda) === 2 || Number(product.moneda) === 3) && (
                    <p className="text-xs text-gray-400">{formatUSD(product.originalPrice)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
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
                <th className="py-3 px-4 text-center text-xs font-semibold text-espint-blue uppercase tracking-wider">
                  Stock
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider text-right">
                  Moneda
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-espint-blue uppercase tracking-wider text-right">
                  Precio Final (ARS)
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-espint-blue uppercase tracking-wider">
                  Acciones
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
                  <td colSpan="6">
                    <ErrorMessage
                      message={error.message}
                      onRetry={() => window.location.reload()}
                    />
                  </td>
                </tr>
              )}
              {allProducts.length > 0 &&
                allProducts.map((product) => (
                  <ProductRow key={product.id} product={product} onAddToCart={addToCart} />
                ))}
            </tbody>
          </table>
        </div>

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
            className="mt-4 px-6 py-2 bg-espint-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center mx-auto cursor-pointer"
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
  );
}
