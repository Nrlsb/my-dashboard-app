import React, { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Search, X, ChevronDown, Download, Grid, Tag, DollarSign, AlertTriangle } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { fetchProducts, fetchProtheusBrands, fetchAllProductsForPDF } from '../api/apiService.js';

// Formateador de moneda (reutilizado)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};

// Función auxiliar para obtener el símbolo de moneda
// Asume que la DB usa 1 para ARS y 2 para USD, o directamente el string ('ARS', 'USD')
const getCurrencySymbol = (currencyCode) => {
    const code = String(currencyCode);
    if (code === '2' || code === 'USD') return 'U$';
    return '$';
};

// --- Componentes de UI Internos ---

const ProductRow = ({ product }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">
    <td className="py-3 px-4 text-sm text-gray-500 font-mono">{product.code}</td>
    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{product.name}</td>
    <td className="py-3 px-4 text-sm text-gray-500">{product.brand}</td>
    <td className="py-3 px-4 text-sm text-gray-500">{product.capacity_desc || 'N/A'}</td>
    
    {/* Nuevas Columnas */}
    <td className="py-3 px-4 text-sm text-gray-500">{product.product_group || 'N/A'}</td>
    <td className="py-3 px-4 text-sm text-gray-700 text-right">{product.quote ? parseFloat(product.quote).toFixed(2) : 'N/A'}</td>
    <td className="py-3 px-4 text-sm font-medium text-gray-700 text-center">{getCurrencySymbol(product.currency)}</td>
    {/* Fin Nuevas Columnas */}
    
    <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
      {getCurrencySymbol(product.currency)}
      {product.price ? parseFloat(product.price).toFixed(2) : '0.00'}
    </td>
  </tr>
);

const ProductRowSkeleton = () => (
  <tr className="border-b border-gray-200 animate-pulse">
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-10"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-8 text-center"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
  </tr>
);

const ErrorMessage = ({ message, onRetry, showRetry = true }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
    <p className="text-red-500 font-semibold text-lg">Error al cargar productos</p>
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

// Componente auxiliar para el dropdown de filtros (reutilizado del chat anterior)
const FilterDropdown = ({ icon, name, label, value, options, onChange }) => (
    <div className="flex items-center space-x-2">
        <span className="text-gray-500">{icon}</span>
        <select
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out shadow-sm"
        >
            <option value="">{label} (Todos)</option>
            {options.map(option => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    </div>
);


// --- Componente Principal de la Página ---

export default function PriceListPage({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [brand, setBrand] = useState('');
  // (NUEVO) Estados para los nuevos filtros
  const [productGroup, setProductGroup] = useState(''); 
  const [currency, setCurrency] = useState(''); 
  
  const [debounceSearchTerm, setDebounceSearchTerm] = useState('');
  const [debounceBrand, setDebounceBrand] = useState('');
  const debounceTimeout = useRef(null);

  // --- (MODIFICADO) Mutación para Generar PDF ---
  const pdfMutation = useMutation({
    // La función fetchAllProductsForPDF ahora también acepta los nuevos filtros
    mutationFn: () => fetchAllProductsForPDF(debounceSearchTerm, debounceBrand),
    onSuccess: (products) => {
      if (!products || products.length === 0) {
        console.warn("No hay productos para generar el PDF.");
        alert("No se encontraron productos con los filtros actuales para generar el PDF.");
        return;
      }
      
      // Generar PDF (requiere jsPDF y jsPDF-AutoTable desde index.html)
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('landscape'); // Usamos landscape para más columnas
      
      doc.setFontSize(16);
      doc.text("Lista de Precios - Pintureria Mercurio", 14, 12);
      doc.setFontSize(10);
      const filterText = `Filtros: ${debounceSearchTerm || 'Ninguno'} | Marca: ${debounceBrand || 'Todas'} | Grupo: ${productGroup || 'Todos'}`;
      doc.text(filterText, 14, 18);
      const dateStr = `Fecha: ${new Date().toLocaleDateString('es-AR')}`;
      doc.text(dateStr, doc.internal.pageSize.getWidth() - 14, 18, { align: 'right' });

      // (*** MODIFICACIÓN CLAVE: Columnas del PDF ***)
      const columns = [
        "Código", 
        "Descripción", 
        "Marca", 
        "Capacidad",
        "Grupo",
        "Cotización",
        "Moneda",
        "Precio Unitario"
      ];
      const rows = products.map(p => [
        p.code,
        p.name,
        p.brand,
        p.capacity_desc || 'N/A',
        p.product_group || 'N/A',
        p.quote ? parseFloat(p.quote).toFixed(2) : 'N/A',
        getCurrencySymbol(p.currency),
        `${getCurrencySymbol(p.currency)}${p.price ? parseFloat(p.price).toFixed(2) : '0.00'}`
      ]);

      doc.autoTable({
        startY: 25,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [40, 58, 90] }, 
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: {
          5: { halign: 'right' }, 
          7: { halign: 'right' } 
        },
        // Ajustar el ancho de las columnas para que quepan
        didParseCell: function(data) {
            if (data.column.index === 1 && data.cell.section === 'body') {
                data.cell.styles.fontSize = 6; // Descripción más pequeña
            }
        }
      });

      doc.save("lista-de-precios.pdf");
    },
    onError: (error) => {
      console.error("Error al generar el PDF:", error);
      alert(`Error al generar el PDF: ${error.message}`);
    }
  });

  // --- Consultas de Datos ---
  // (MODIFICADO) Incluimos el nuevo filtro de grupo en la clave de la query
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isError, 
    error,
    isLoading 
  } = useInfiniteQuery({
    queryKey: ['products', debounceSearchTerm, debounceBrand, productGroup, currency],
    queryFn: ({ pageParam = 1 }) => 
        // Pasamos todos los parámetros al servicio (el servicio solo usa search y brand)
        fetchProducts(pageParam, debounceSearchTerm, debounceBrand, productGroup, currency), 
    getNextPageParam: (lastPage, allPages) => {
      const productsLoaded = allPages.reduce((acc, page) => acc + page.products.length, 0);
      const totalProducts = lastPage.totalProducts;
      return productsLoaded < totalProducts ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 1, // 1 minuto de caché
  });
  
  // Hook para el 'Intersection Observer' (Carga infinita)
  const { ref: infiniteScrollRef, inView } = useInView({
    threshold: 0.5,
  });

  // Consulta para las marcas (dropdown) y grupos (para filtros)
  // Reutilizaremos esta consulta para obtener todos los grupos únicos para el filtro
  const { 
    data: brandsData, 
    isLoading: isBrandsLoading, 
    isError: isBrandsError 
  } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchProtheusBrands,
    staleTime: 1000 * 60 * 60, // Cachear marcas por 1 hora
  });
  
  // Extraemos los grupos de productos de los datos cargados para el filtro
  const allProductGroups = useMemo(() => {
    const groups = new Set();
    data?.pages.forEach(page => {
        page.products.forEach(p => {
            if (p.product_group) groups.add(p.product_group);
        });
    });
    return Array.from(groups).sort();
  }, [data]);
  
  // Definimos las monedas disponibles (asumimos las configuradas en el backend/DB)
  const availableCurrencies = ['1', '2', 'ARS', 'USD'];


  // useEffect para el 'debounce' del buscador
  useEffect(() => {
    // Limpiar el timeout anterior
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    // Establecer un nuevo timeout
    debounceTimeout.current = setTimeout(() => {
      setDebounceSearchTerm(searchTerm);
      setDebounceBrand(brand);
    }, 500); // 500ms de debounce

    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm, brand]);

  // useEffect para manejar el scroll infinito
  useEffect(() => {
    // Solo cargamos la siguiente página si estamos viendo el trigger, hay más páginas
    // y no estamos ya cargando
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- Handlers de UI ---
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleBrandChange = (e) => {
    setBrand(e.target.value);
  };
  
  const handleProductGroupChange = (e) => {
    setProductGroup(e.target.value);
  };
  
  const handleCurrencyChange = (e) => {
    setCurrency(e.target.value);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setBrand('');
    setProductGroup('');
    setCurrency('');
  };

  // (NUEVO) Handler para el botón de PDF
  const handleGeneratePDF = () => {
    pdfMutation.mutate();
  };

  // --- Renderizado ---
  const allProducts = data?.pages.flatMap(page => page.products) || [];
  const hasFilters = searchTerm.length > 0 || brand.length > 0 || productGroup.length > 0 || currency.length > 0;

  // Filtrado final en el frontend para los nuevos campos que el backend no filtra (Grupo y Moneda)
  const finalFilteredProducts = allProducts.filter(product => {
      const matchesGroup = productGroup === '' || product.product_group === productGroup;
      // Usamos String() para asegurar la comparación si la DB devuelve INT
      const matchesCurrency = currency === '' || String(product.currency) === currency || String(product.currency) === currency.toUpperCase();
      
      // Aplicamos el filtro de búsqueda y marca que ya hizo el backend por defecto
      return matchesGroup && matchesCurrency;
  });
  
  const totalDisplayCount = finalFilteredProducts.length;
  const totalFetchedCount = allProducts.length;


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* --- Encabezado --- */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Lista de Precios</h1>
        </div>
        
        {/* --- Botón Descargar PDF --- */}
        <button
          onClick={handleGeneratePDF}
          disabled={pdfMutation.isPending || allProducts.length === 0}
          className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {pdfMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          Descargar PDF
        </button>
      </header>

      {/* --- Controles de Filtro y Búsqueda --- */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-4 gap-4">
          
        {/* Buscador */}
        <div className="relative col-span-1 md:col-span-2">
          <label htmlFor="search" className="sr-only">Buscar producto</label>
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Buscar por nombre o código..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Filtro de Marca */}
        <div className="relative">
          <label htmlFor="brand" className="sr-only">Filtrar por marca</label>
          <select
            id="brand"
            value={brand}
            onChange={handleBrandChange}
            disabled={isBrandsLoading}
            className="w-full appearance-none bg-white pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{isBrandsLoading ? "Cargando marcas..." : "Marca (Todas)"}</option>
            {brandsData && brandsData.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <Tag className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        
        {/* Filtro de Grupo */}
        <div className="relative">
          <label htmlFor="group" className="sr-only">Filtrar por Grupo</label>
          <select
            id="group"
            value={productGroup}
            onChange={handleProductGroupChange}
            className="w-full appearance-none bg-white pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Grupo (Todos)</option>
            {allProductGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <Grid className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        
        {/* Filtro de Moneda (Adicional) */}
        <div className="relative">
          <label htmlFor="currency" className="sr-only">Filtrar por Moneda</label>
          <select
            id="currency"
            value={currency}
            onChange={handleCurrencyChange}
            className="w-full appearance-none bg-white pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Moneda (Todas)</option>
            {availableCurrencies.map(c => <option key={c} value={c}>{getCurrencySymbol(c)}</option>)}
          </select>
          <DollarSign className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Botón Limpiar Filtros */}
        <div className="col-span-1 md:col-span-4 flex justify-end">
             {hasFilters && (
                <button
                    onClick={handleClearFilters}
                    className="flex items-center text-sm text-red-600 hover:text-red-800"
                >
                    <X className="w-4 h-4 mr-1" />
                    Limpiar filtros
                </button>
            )}
        </div>
      </div>
      
      {/* Indicador de resultados */}
      <p className="text-sm text-gray-600 mb-4">
        Mostrando {totalDisplayCount} productos de {totalFetchedCount} cargados.
      </p>

      {/* --- Tabla de Productos --- */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-indigo-600">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Código</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Descripción</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Marca</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Capacidad/Desc.</th>
                
                {/* Nuevas Columnas en el encabezado */}
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Grupo</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Cotización</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Moneda</th>
                {/* Fin Nuevas Columnas */}
                
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Precio Unitario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && allProducts.length === 0 && (
                Array.from({ length: 10 }).map((_, i) => <ProductRowSkeleton key={i} />)
              )}
              
              {isError && (
                <tr>
                  <td colSpan="8">
                    <ErrorMessage message={error.message} onRetry={() => window.location.reload()} />
                  </td>
                </tr>
              )}

              {finalFilteredProducts.length > 0 ? (
                  finalFilteredProducts.map((product) => (
                    <ProductRow key={product.id} product={product} />
                  ))
              ) : (
                <tr>
                    <td colSpan="8" className="py-6 text-center text-gray-500">
                        {isLoading ? 'Cargando...' : 'No se encontraron productos con esos filtros.'}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* --- Fin de la tabla y Carga Infinita --- */}
        <div className="p-4 text-center">
          
          {isFetchingNextPage && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Cargando más productos...</span>
            </div>
          )}

          {!hasNextPage && !isLoading && finalFilteredProducts.length > 0 && (
            <p className="text-gray-500 text-sm">Fin de los resultados.</p>
          )}
          
          {/* Elemento invisible que dispara la carga infinita */}
          <div ref={infiniteScrollRef} style={{ height: '10px' }} />
        </div>
      </div>
    </div>
  );
}