import React, { useState, useMemo, useEffect } from 'react';
import Header from '../components/Header.jsx';
// (MODIFICADO) Se quita el icono X
import { ArrowLeft, Search, ShoppingCart, Trash2, Package, CheckCircle, AlertTriangle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

// (NUEVO) Definimos la URL de la API
const API_URL = 'http://localhost:3001';

const PRODUCTS_PER_PAGE = 20; // (NUEVO) Paginación

// --- Página de Nuevo Pedido ---
// (MODIFICADO) Recibe cart y setCart como props
const NewOrderPage = ({ onNavigate, cart, setCart }) => {
  // --- Estados ---
  const [allProducts, setAllProducts] = useState([]); // (CAMBIADO) Almacena solo la página actual
  const [productMap, setProductMap] = useState(new Map()); // (NUEVO) Mapa para lookup rápido
  const [totalProducts, setTotalProducts] = useState(0); // (NUEVO)
  const [allBrands, setAllBrands] = useState([]); // (NUEVO)
  
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  
  // (ELIMINADO) Estados de submitting y modal, se mueven a la página de previsualización
  // const [isSubmitting, setIsSubmitting] = useState(false);
  // const [submitStatus, setSubmitStatus] = useState(null); 
  // const [submitMessage, setSubmitMessage] = useState(''); 
  // const [showPreviewModal, setShowPreviewModal] = useState(false);

  // (NUEVO) Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  // --- (NUEVO) Carga de Marcas (solo una vez) ---
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(`${API_URL}/api/brands`);
        if (!response.ok) throw new Error('No se pudieron cargar las marcas.');
        const brandsData = await response.json();
        setAllBrands(brandsData);
      } catch (err) {
        console.error(err);
        // No es un error crítico, así que solo lo logueamos
      }
    };
    fetchBrands();
  }, []);

  // --- (ACTUALIZADO) Carga de Productos (paginada) ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        setProductError(null);
        
        // Construir query string para el backend
        const params = new URLSearchParams({
          page: currentPage,
          limit: PRODUCTS_PER_PAGE,
          search: searchTerm,
          brand: selectedBrand,
        });
        
        const response = await fetch(`${API_URL}/api/products?${params.toString()}`);
        if (!response.ok) throw new Error('No se pudo cargar la lista de productos.');
        
        const data = await response.json();
        
        setAllProducts(data.products); // Almacena solo los productos de la página actual
        setTotalProducts(data.totalProducts); // Almacena el conteo total
        
        // (NUEVO) Actualizar el mapa de productos para el carrito
        setProductMap(prevMap => {
          const newMap = new Map(prevMap);
          data.products.forEach(p => newMap.set(p.id, p));
          return newMap;
        });

      } catch (err) {
        setProductError(err.message);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [currentPage, searchTerm, selectedBrand]); // (ACTUALIZADO) Dependencias del useEffect

  // (ELIMINADO) El useMemo para filteredProducts ya no es necesario.
  // (ELIMINADO) El useMemo para brands ya no es necesario.

  // --- Lógica de Carrito (sin cambios) ---
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            // (CORREGIDO) Usar stock del producto original, no del item del carrito
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    // (CORREGIDO) Buscar el stock del producto en el productMap
    const productStock = productMap.get(productId)?.stock || 999; // Fallback
    const newQuantity = Math.max(0, Math.min(quantity, productStock)); 

    setCart(prevCart => {
      if (newQuantity === 0) {
        return prevCart.filter(item => item.id !== productId);
      }
      return prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // (MODIFICADO) El total se calcula en App.jsx, pero lo necesitamos aquí para el botón
  const totalPrice = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  // Formateador de moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };
  
  // (ELIMINADO) La función generateQuotePDF se movió a OrderPreviewPage
  // const generateQuotePDF = () => { ... };

  // (ELIMINADO) La función handleSubmitOrder se movió a OrderPreviewPage
  // const handleSubmitOrder = async (submissionType) => { ... };

  // --- (ACTUALIZADO) Renderizado de Lista de Productos ---
  const renderProductList = () => {
    if (loadingProducts) {
      return <div className="p-6 bg-white rounded-lg shadow-md text-center text-gray-500">Cargando productos...</div>;
    }
    if (productError) {
      return <div className="p-6 bg-white rounded-lg shadow-md text-center text-red-500">{productError}</div>;
    }
    if (allProducts.length === 0) {
      return <div className="p-6 bg-white rounded-lg shadow-md text-center text-gray-500">No se encontraron productos.</div>;
    }
    
    // (CAMBIADO) Mapea sobre allProducts (que ahora es solo la página actual)
    return allProducts.map(product => (
      <div key={product.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 p-3 bg-gray-100 rounded-lg">
            <Package className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500">{product.brand} (Cód: {product.code})</p>
            <p className="text-sm text-gray-500">Stock: {product.stock}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-800">{formatCurrency(product.price)}</p>
          <button
            onClick={() => addToCart(product)}
            className="mt-2 px-4 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Añadir
          </button>
        </div>
      </div>
    ));
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
          <h1 className="text-2xl font-bold text-gray-800">Nuevo Pedido</h1>
        </div>

        {/* Layout de 2 Columnas: Productos | Carrito */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- Columna Izquierda: Filtros y Productos --- */}
          <div className="lg:col-span-2 space-y-8">
            {/* Controles de Filtro (Selector y Búsqueda) */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* (ACTUALIZADO) Selector de Marca usa allBrands */}
                <div>
                  <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Marca
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrand}
                    onChange={(e) => { setSelectedBrand(e.target.value); setCurrentPage(1); }} // (NUEVO) Resetea página
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Todas las marcas</option>
                    {allBrands.map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* (ACTUALIZADO) Barra de Búsqueda resetea página */}
                <div>
                  <label htmlFor="search-product" className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar Producto
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="search-product"
                      type="text"
                      value={searchTerm}
                      // (NUEVO) Actualiza al escribir, pero el fetch se dispara por el useEffect
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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

            {/* Lista de productos */}
            <div className="space-y-4">
              {renderProductList()}
            </div>
            
            {/* (NUEVO) Controles de Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || loadingProducts}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Anterior
                </button>
                <span className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || loadingProducts}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            )}
          </div>

          <div className="lg-col-span-1">
            {/* (MODIFICADO) Se añade flex-col y un max-h para que el sticky funcione con el scroll interno */}
            <div className="sticky top-8 bg-white rounded-lg shadow-md flex flex-col max-h-[calc(100vh-4rem)]">
              
              {/* (NUEVO) Encabezado del Carrito (no se encoge) */}
              <div className="flex-shrink-0 p-6">
                {/* (ELIMINADO) Mensajes de estado de envío */}
                
                {/* (INICIO DE CORRECCIÓN) - Código erróneo de 'submitStatus' eliminado */}
                <div className="flex items-center mb-4">
                  <ShoppingCart className="w-6 h-6 text-gray-800 mr-3" />
                  <h2 className="text-xl font-bold text-gray-800">Resumen del Pedido</h2>
                </div>
              </div>
              
              {/* (MODIFICADO) Lista de Items (flexible y con scroll) */}
              {/* Se quita max-h-96, se añade flex-1, overflow-y-auto y padding horizontal */}
              <div className="flex-1 divide-y divide-gray-200 overflow-y-auto px-6">
                {cart.length === 0 && ( // (SIMPLIFICADO)
                  <p className="py-4 text-center text-gray-500">Tu carrito está vacío.</p>
                )}
                {cart.map(item => (
                  <div key={item.id} className="py-4 flex items-center space-x-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                      <div className="flex items-center mt-2">
                        <label htmlFor={`qty-${item.id}`} className="text-xs text-gray-600 mr-2">Cant:</label>
                        <input
                          id={`qty-${item.id}`}
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value, 10) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          min="0"
                          // max={item.stock} // Se usa productMap ahora
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      aria-label="Quitar item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* (MODIFICADO) Pie del Carrito (Total y Botones) (no se encoge) */}
              {/* Se quita mt-6 y pt-6, se añade flex-shrink-0 y p-6 */}
              {cart.length > 0 && (
                <div className="flex-shrink-0 p-6 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-medium text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
                  </div>
                  {/* (MODIFICADO) Botón único para navegar a la previsualización */}
                  <button
                    onClick={() => onNavigate('orderPreview')} // <-- Navega a la nueva página
                    disabled={cart.length === 0} // (SIMPLIFICADO)
                    className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Revisar Pedido
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* (ELIMINADO) El modal de previsualización ya no existe aquí */}
        
      </main>
    </div>
  );
};

// (ELIMINADO) El componente OrderPreviewModal se movió a su propio archivo

export default NewOrderPage;