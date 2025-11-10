import React, { useState, useMemo, useEffect } from 'react';
// (NUEVO) Importamos el hook useCart
import { useCart } from '../context/CartContext.jsx';
import { 
  ArrowLeft, Search, ShoppingCart, Trash2, Package, CheckCircle, 
  ChevronLeft, ChevronRight, X, Plus, Minus, Star 
} from 'lucide-react';

const API_URL = 'http://localhost:3001';
const PRODUCTS_PER_PAGE = 20;

// Formateador de moneda (reutilizado)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};

// --- (NUEVO) Componente de Modal de Vista Rápida ---
const ProductModal = ({ product, onClose, onAddToCart, onViewDetails }) => {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Resetea la cantidad si el producto cambia
  useEffect(() => {
    setQuantity(1);
    setIsAdded(false);
  }, [product]);

  const handleAddToCartClick = () => {
    onAddToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => {
      onClose(); // Cierra el modal después de agregar
    }, 1500); // Espera 1.5s
  };

  if (!product) return null;

  return (
    // Fondo oscuro (Backdrop)
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      {/* Contenedor del Modal */}
      <div
        className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Evita que el clic en el modal lo cierre
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Columna de Imagen (Placeholder) */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-100 p-8">
          <Package className="w-48 h-48 text-gray-400" />
        </div>

        {/* Columna de Detalles */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center overflow-y-auto">
          <span className="text-sm font-medium text-blue-600 uppercase">{product.brand || 'Marca'}</span>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h2>
          
          {/* --- BLOQUE DE ESTRELLAS ELIMINADO ---
          <div className="flex items-center my-3">
            <div className="flex text-yellow-400">
              <Star className="w-5 h-5 fill-current" />
              <Star className="w-5 h-5 fill-current" />
              <Star className="w-5 h-5 fill-current" />
              <Star className="w-5 h-5 fill-current" />
              <Star className="w-5 h-5 text-gray-300 fill-current" />
            </div>
            <span className="text-sm text-gray-500 ml-2">(1)</span>
          </div>
          */}

          <p className="text-3xl font-extrabold text-gray-800 mt-3">{formatCurrency(product.price)}</p>

          <p className="text-gray-600 leading-relaxed my-4 text-sm">
            {product.capacity_description || 'Descripción no disponible.'} 
            Aquí tienes una descripción de producto para "Látex Interior Constructor Mate Blanco 20L" de Alba.
          </p>
          
          <div className="flex items-center space-x-4 my-4">
            <span className="font-medium text-gray-700">Cantidad:</span>
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={quantity}
                readOnly
                className="w-16 text-center border-y-0 border-x focus:ring-0"
              />
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-gray-500">({product.stock} disponibles)</span>
          </div>

          <button
            onClick={handleAddToCartClick}
            disabled={isAdded}
            className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-colors duration-300 ${
              isAdded
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isAdded ? (
              <span className="flex items-center justify-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Agregado
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Agregar al Carrito
              </span>
            )}
          </button>

          <button
            onClick={() => onViewDetails(product.id)}
            className="mt-4 text-center text-sm text-blue-600 hover:underline"
          >
            Ver detalles completos del producto
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Página de Nuevo Pedido ---
// (MODIFICADO) Acepta 'onViewProductDetails'
const NewOrderPage = ({ onNavigate, currentUser, onViewProductDetails }) => {
  // --- Estados ---
  const [allProducts, setAllProducts] = useState([]); // Almacena solo la página actual
  const [productMap, setProductMap] = useState(new Map()); // Mapa para lookup rápido
  const [totalProducts, setTotalProducts] = useState(0); // 
  const [allBrands, setAllBrands] = useState([]); // 
  
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  
  // (NUEVO) Estado para el modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // (NUEVO) Obtenemos el carrito y sus funciones del Contexto
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  
  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  // --- Carga de Marcas (solo una vez) ---
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
  }, []); // Array vacío, se ejecuta al montar

  // --- Carga de Productos (paginada) ---
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
        
        // Actualizar el mapa de productos para el carrito
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
  }, [currentPage, searchTerm, selectedBrand]); // Dependencias del useEffect

  
  // --- Lógica de Carrito (usa funciones del Contexto) ---
  
  // Esta función es solo para el input numérico
  const handleQuantityChange = (productId, quantityStr) => {
    const quantity = parseInt(quantityStr, 10);
    // Llama a la función del contexto
    updateQuantity(productId, isNaN(quantity) ? 0 : quantity); 
  };
  
  // Esta función es para el botón "Añadir"
  const handleAddToCartClick = (product) => {
    // Llama a la función del contexto
    addToCart(product, 1); // Añade 1 por defecto
  };

  // El totalPrice ahora lee del 'cart' del contexto
  const totalPrice = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);
  

  // --- Renderizado de Lista de Productos ---
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
    
    return allProducts.map(product => (
      // (MODIFICADO) Se añade onClick para abrir el modal
      <div 
        key={product.id} 
        className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setSelectedProduct(product)} // <-- Abre el modal
      >
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
          {/* (MODIFICADO) El botón ahora está en el modal, pero dejamos uno aquí por si acaso */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Evita que el clic en el botón abra el modal
              handleAddToCartClick(product);
            }}
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
      {/* (ELIMINADO) Header ya no se renderiza aquí */}
      
      {/* (NUEVO) Renderiza el modal si hay un producto seleccionado */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        onViewDetails={onViewProductDetails}
      />
      
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
                
                <div>
                  <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Marca
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrand}
                    onChange={(e) => { setSelectedBrand(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Todas las marcas</option>
                    {allBrands.map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="search-product" className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar Producto
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="search-product"
                      type="text"
                      value={searchTerm}
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
            
            {/* Controles de Paginación */}
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

          {/* --- Columna Derecha: Carrito Sticky --- */}
          <div className="lg-col-span-1">
            <div className="sticky top-8 bg-white rounded-lg shadow-md flex flex-col max-h-[calc(100vh-4rem)]">
              
              <div className="flex-shrink-0 p-6">
                <div className="flex items-center mb-4">
                  <ShoppingCart className="w-6 h-6 text-gray-800 mr-3" />
                  <h2 className="text-xl font-bold text-gray-800">Resumen del Pedido</h2>
                </div>
              </div>
              
              {/* Lista de Items (del contexto) */}
              <div className="flex-1 divide-y divide-gray-200 overflow-y-auto px-6">
                {cart.length === 0 && (
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
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)} // (MODIFICADO)
                          className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          min="0"
                          max={item.stock} // Usamos el stock del item (que vino del producto)
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)} // (MODIFICADO)
                      className="p-1 text-gray-400 hover:text-red-600"
                      aria-label="Quitar item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Pie del Carrito */}
              {cart.length > 0 && (
                <div className="flex-shrink-0 p-6 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-medium text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
                  </div>
                  {/* (MODIFICADO) Botón navega a 'order-preview' */}
                  <button
                    onClick={() => onNavigate('order-preview')} 
                    disabled={cart.length === 0}
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
      </main>
    </div>
  );
};

export default NewOrderPage;