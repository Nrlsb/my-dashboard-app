import React, { useState, useRef, useEffect } from 'react';
// (MODIFICADO) Se importa useMutation y el ícono Download
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Search, X, ChevronDown, Download } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
// (MODIFICADO) Se importa la nueva función fetchAllProductsForPDF
import { fetchProducts, fetchProtheusBrands, fetchAllProductsForPDF } from '/src/api/apiService.js';

// (NUEVO) Formateador de moneda (copiado de otras páginas)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};

// (NUEVO) Formateador de moneda USD
const formatUSD = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};


// (NUEVO) Formateador para la cotización (número decimal)
const formatRate = (amount) => {
  // Muestra 1.00 como '1,00', y 350.50 como '350,50'
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// (NUEVO) Formateador para el código de moneda (1 = ARS, 2 = USD)
const formatMoneda = (moneda) => {
  const numericMoneda = Number(moneda);
  if (numericMoneda === 2) {
    return 'USD Billete';
  }
  if (numericMoneda === 3) {
    return 'USD Divisa';
  }
  // Asumimos ARS para 1 o cualquier otro valor
  return 'ARS';
};


// --- Componentes de UI Internos ---

// (MODIFICADO) Añadidas las nuevas columnas
const ProductRow = ({ product }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">
    <td className="py-3 px-4 text-sm text-gray-500 font-mono">{product.code}</td>
    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{product.name}</td>
    <td className="py-3 px-4 text-sm text-gray-500">{product.brand}</td>
    <td className="py-3 px-4 text-sm text-gray-500">{product.product_group}</td>
    <td className="py-3 px-4 text-sm text-gray-500 text-right">{formatMoneda(product.moneda)}</td>
    <td className="py-3 px-4 text-sm text-gray-500 text-right">{formatRate(product.cotizacion)}</td>
    {/* --- (NUEVA COLUMNA) --- */}
    <td className="py-3 px-4 text-sm text-gray-600 font-medium text-right">
      {(Number(product.moneda) === 2 || Number(product.moneda) === 3)
        ? formatUSD(product.originalPrice)
        : '-'}
    </td>
    {/* --- (FIN NUEVA COLUMNA) --- */}
    <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
      {formatCurrency(product.price)}
    </td>
  </tr>
);

// (MODIFICADO) Añadidos 4 esqueletos de columna (1 más)
const ProductRowSkeleton = () => (
  <tr className="border-b border-gray-200 animate-pulse">
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-10 ml-auto"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
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

export default function PriceListPage({ onNavigate }) {

  const [searchTerm, setSearchTerm] = useState('');

  const [brand, setBrand] = useState('');

  const [moneda, setMoneda] = useState('1'); // 1: ARS, 2: USD Billete, 3: USD Divisa

  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);

  const [debounceSearchTerm, setDebounceSearchTerm] = useState('');

  const debounceTimeout = useRef(null);



  // --- (NUEVO) Mutación para Generar PDF ---

  const pdfMutation = useMutation({

    mutationFn: () => fetchAllProductsForPDF(debounceSearchTerm, brand, moneda),

    onSuccess: (products) => {

      if (!products || products.length === 0) {

        console.warn("No hay productos para generar el PDF.");

        // Aquí se podría mostrar un mensaje al usuario

        alert("No se encontraron productos con los filtros actuales para generar el PDF.");

        return;

      }

      

      // Generar PDF (requiere jsPDF y jsPDF-AutoTable desde index.html)

      const { jsPDF } = window.jspdf;

      const doc = new jsPDF();

      

      doc.setFontSize(16);

      doc.text("Lista de Precios - Pintureria Mercurio", 14, 22);

      doc.setFontSize(10);

      doc.text(`Filtros: ${debounceSearchTerm || 'Ninguno'} | Marca: ${brand || 'Todas'}`, 14, 28);

      const dateStr = `Fecha: ${new Date().toLocaleDateString('es-AR')}`;

      doc.text(dateStr, doc.internal.pageSize.getWidth() - 14, 28, { align: 'right' });



      // (MODIFICADO) Añadidas columnas al PDF

      const columns = ["Código", "Descripción", "Marca", "Grupo", "Mon", "Cotiz", "Precio USD", "Precio ARS"];

      const rows = products.map(p => [

        p.code,

        p.name,

        p.brand,

        p.product_group, // <-- AÑADIDO

        formatMoneda(p.moneda), // <-- AÑADIDO

        formatRate(p.cotizacion), // <-- AÑADIDO

        (p.moneda === 2 || p.moneda === 3) ? formatUSD(p.originalPrice) : '-', // <-- NUEVA COLUMNA PDF

        formatCurrency(p.price)

      ]);



      doc.autoTable({

        startY: 35,

        head: [columns],

        body: rows,

        theme: 'striped',

        headStyles: { fillColor: [40, 58, 90] }, // Color oscuro para el encabezado

        styles: { fontSize: 8 },

        // (MODIFICADO) Ajuste de alineación de columnas

        columnStyles: {

          4: { halign: 'right' }, // Moneda

          5: { halign: 'right' }, // Cotización

          6: { halign: 'right' }, // Precio USD

          7: { halign: 'right' }  // Precio ARS

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

  const { 

    data, 

    fetchNextPage, 

    hasNextPage, 

    isFetchingNextPage, 

    isError, 

    error,

    isLoading 

  } = useInfiniteQuery({

    queryKey: ['products', debounceSearchTerm, brand, moneda],

    queryFn: ({ pageParam = 1 }) => fetchProducts(pageParam, debounceSearchTerm, brand, moneda),

    getNextPageParam: (lastPage, allPages) => {

      const productsLoaded = allPages.reduce((acc, page) => acc + page.products.length, 0);

      const totalProducts = lastPage.totalProducts;

      return productsLoaded < totalProducts ? allPages.length + 1 : undefined;

    },

    initialPageParam: 1,

    staleTime: 1000 * 60 * 1, // 1 minuto de caché

  });

  

    // No se usa useInView para carga infinita, se usará un botón "Cargar más"



  // Consulta para las marcas (dropdown)

  const { 

    data: brandsData, 

    isLoading: isBrandsLoading, 

    isError: isBrandsError 

  } = useQuery({

    queryKey: ['brands'],

    queryFn: fetchProtheusBrands,

    staleTime: 1000 * 60 * 60, // Cachear marcas por 1 hora

  });



  // useEffect para el 'debounce' del buscador

  useEffect(() => {

    // Limpiar el timeout anterior

    if (debounceTimeout.current) {

      clearTimeout(debounceTimeout.current);

    }

    

    // Establecer un nuevo timeout

    debounceTimeout.current = setTimeout(() => {

      setDebounceSearchTerm(searchTerm);

    }, 500); // 500ms de debounce



    return () => clearTimeout(debounceTimeout.current);

  }, [searchTerm]);



    // (ELIMINADO) useEffect para manejar el scroll infinito, ahora se usa un botón



  // --- Handlers de UI ---

  const handleSearchChange = (e) => {

    setSearchTerm(e.target.value);

  };



  const handleBrandChange = (e) => {

    setBrand(e.target.value);

  };



  const handleMonedaChange = (e) => {

    setMoneda(e.target.value);

  };



  const handleClearFilters = () => {

    setSearchTerm('');

    setBrand('');

    setMoneda('1');

  };



  // (NUEVO) Handler para el botón de PDF

  const handleGeneratePDF = () => {

    pdfMutation.mutate();

  };



  // --- Renderizado ---

  const allProducts = data?.pages.flatMap(page => page.products) || [];

  const hasFilters = searchTerm.length > 0 || brand.length > 0 || moneda !== '1';



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

        

        {/* --- (NUEVO) Botón Descargar PDF --- */}

        <button

          onClick={handleGeneratePDF}

          disabled={pdfMutation.isPending}

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



      {/* --- Filtros --- */}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Buscador */}

        <div className="relative">

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

        

        {/* Dropdown de Marcas */}

        <div className="relative">

          <label htmlFor="brand" className="sr-only">Filtrar por marca</label>

          <select

            id="brand"

            value={brand}

            onChange={handleBrandChange}

            disabled={isBrandsLoading}

            className="w-full appearance-none bg-white pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

          >

            <option value="">{isBrandsLoading ? "Cargando marcas..." : "Todas las marcas"}</option>

            {brandsData && brandsData.map(b => <option key={b} value={b}>{b}</option>)}

          </select>

          <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

        </div>



        {/* Dropdown de Moneda */}

        <div className="relative">

          <label htmlFor="moneda" className="sr-only">Filtrar por moneda</label>

          <select

            id="moneda"

            value={moneda}

            onChange={handleMonedaChange}

            className="w-full appearance-none bg-white pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

          >

            <option value="1">ARS</option>

            <option value="2">USD Billete</option>

            <option value="3">USD Divisa</option>

          </select>

          <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

        </div>

      </div>



      {/* Botón Limpiar Filtros */}

      {hasFilters && (

        <div className="mb-6">

          <button

            onClick={handleClearFilters}

            className="flex items-center text-sm text-blue-600 hover:text-blue-800"

          >

            <X className="w-4 h-4 mr-1" />

            Limpiar filtros

          </button>

        </div>

      )}



      {/* --- Tabla de Productos --- */}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">

        <div className="overflow-x-auto">

          <table className="min-w-full bg-white">

            {/* (MODIFICADO) Encabezado de tabla actualizado */}

            <thead className="bg-gray-100 border-b border-gray-300">

              <tr>

                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>

                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Descripción</th>

                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Marca</th>

                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Grupo</th>

                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Moneda</th>

                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Cotización</th>

                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Precio (USD)</th>

                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Precio Final (ARS)</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-200">

              {isLoading && allProducts.length === 0 && (

                // Esqueleto de carga inicial

                Array.from({ length: 10 }).map((_, i) => <ProductRowSkeleton key={i} />)

              )}

              

              {isError && (

                // Error principal (MODIFICADO) colSpan="8"

                <tr>

                  <td colSpan="8">

                    <ErrorMessage message={error.message} onRetry={() => window.location.reload()} />

                  </td>

                </tr>

              )}



              {allProducts.length > 0 && allProducts.map((product) => (

                <ProductRow key={product.id} product={product} />

              ))}

            </tbody>

          </table>

        </div>

        

        {/* --- Fin de la tabla y Carga Infinita --- */}

        <div className="p-4 text-center">

          {!isLoading && !isError && allProducts.length === 0 && (

            <p className="text-gray-500">No se encontraron productos con esos filtros.</p>

          )}



          {isFetchingNextPage && (

            <div className="flex justify-center items-center py-4">

              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />

              <span className="ml-2 text-gray-600">Cargando más productos...</span>

            </div>

          )}



          {!hasNextPage && !isLoading && allProducts.length > 0 && (

            <p className="text-gray-500 text-sm">Fin de los resultados.</p>

          )}

          

                    {/* Botón "Cargar más" */}

          

                    {hasNextPage && (

          

                      <button

          

                        onClick={() => fetchNextPage()}

          

                        disabled={isFetchingNextPage}

          

                        className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center mx-auto"

          

                      >

          

                        {isFetchingNextPage ? (

          

                          <>

          

                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />

          

                            Cargando más...

          

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