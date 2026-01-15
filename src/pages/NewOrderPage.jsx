import React, { useState, useMemo, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { useCart } from '../context/CartContext.jsx';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Trash2,
  Package,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import apiService from '../api/apiService.js';
import CustomSelect from '../components/CustomSelect.jsx';

const PRODUCTS_PER_PAGE = 20;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};

import { useProductQuantity } from '../hooks/useProductQuantity';

const ProductModal = ({ product, onClose, onAddToCart }) => {
  const {
    quantity,
    setQuantity,
    increment,
    decrement,
    handleInputChange,
    handleBlur,
    stock,
    isRestricted,
    packQty
  } = useProductQuantity(product);

  const [isAdded, setIsAdded] = useState(false);
  const navigate = useNavigate();

  // Reset local state when product changes, handled by hook mostly, 
  // but if we want to ensure clean slate for isAdded.
  useEffect(() => {
    setIsAdded(false);
  }, [product]);

  const handleAddToCartClick = () => {
    onAddToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleViewDetails = (productId) => {
    navigate(`/product-detail/${productId}`);
    onClose();
  };

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-100 p-8">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="max-h-64 object-contain rounded-lg"
            />
          ) : (
            <Package className="w-48 h-48 text-gray-400" />
          )}
        </div>

        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center overflow-y-auto">
          <span className="text-sm font-medium text-blue-600 uppercase">
            {product.brand || 'Marca'}
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            {product.name}
          </h2>

          <p className="text-3xl font-extrabold text-gray-800 mt-3">
            {formatCurrency(product.price)}
          </p>



          <div className="flex items-center space-x-4 my-4">
            <span className="font-medium text-gray-700">Cantidad:</span>
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={decrement}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className="w-16 text-center border-y-0 border-x focus:ring-0"
              />
              <button
                onClick={increment}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {stock <= 0 ? (
              <div className="flex items-center ml-2">
                <span className="text-sm font-medium text-red-600">
                  Sin Stock
                </span>
                {product.stock_de_seguridad > 0 && (
                  <span className="ml-2 text-xs text-blue-600 font-medium">
                    | Previsto de ingreso
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center ml-2">
                <span className="text-sm font-medium text-gray-600">
                  Stock: {stock > 100 ? '+100' : stock}
                </span>
                {product.stock_de_seguridad > 0 && (
                  <span className="ml-2 text-xs text-blue-600 font-medium">
                    | Previsto de ingreso
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleAddToCartClick}
            disabled={isAdded}
            className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-colors duration-300 ${isAdded
              ? 'bg-espint-green hover:bg-green-600'
              : 'bg-espint-blue hover:bg-blue-700'
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
            onClick={() => handleViewDetails(product.id)}
            className="mt-4 text-center text-sm text-blue-600 hover:underline"
          >
            Ver detalles completos del producto
          </button>
        </div>
      </div>
    </div>
  );
};

const NewOrderPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Hook to get URL params
  const [allProducts, setAllProducts] = useState([]);
  const [productMap, setProductMap] = useState(new Map());
  const [totalProducts, setTotalProducts] = useState(0);
  const [allBrands, setAllBrands] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || ''); // Initialize with URL param
  const [selectedBrand, setSelectedBrand] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);

  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brandsData = await apiService.fetchProtheusBrands();
        setAllBrands(brandsData);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) {
      fetchBrands();
    }
  }, [user]);

  // Update searchTerm when URL param changes
  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setSearchTerm(query);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        setProductError(null);

        const brandsParam = selectedBrand ? [selectedBrand] : [];
        const data = await apiService.fetchProducts(
          currentPage,
          searchTerm,
          brandsParam
        );

        setAllProducts(data.products);
        setTotalProducts(data.totalProducts);

        setProductMap((prevMap) => {
          const newMap = new Map(prevMap);
          data.products.forEach((p) => newMap.set(p.id, p));
          return newMap;
        });
      } catch (err) {
        console.error('Error al cargar productos:', err);
        setProductError(err.message);
      } finally {
        setLoadingProducts(false);
      }
    };
    if (user) {
      loadProducts();
    }
  }, [currentPage, searchTerm, selectedBrand, user]);

  const handleQuantityChange = (productId, quantityStr) => {
    const quantity = parseInt(quantityStr, 10);
    updateQuantity(productId, isNaN(quantity) ? 0 : quantity);
  };

  const handleAddToCartClick = (product) => {
    addToCart(product, 1);
  };

  const totalPrice = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const renderProductList = () => {
    if (loadingProducts) {
      return <LoadingSpinner text="Cargando productos..." />;
    }
    if (productError) {
      return (
        <div className="p-6 bg-white rounded-lg shadow-md text-center text-red-500">
          {productError}
        </div>
      );
    }
    if (allProducts.length === 0) {
      return (
        <div className="p-6 bg-white rounded-lg shadow-md text-center text-gray-500">
          No se encontraron productos.
        </div>
      );
    }

    return allProducts.map((product) => (
      <div
        key={product.id}
        className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow gap-4 md:gap-0"
        onClick={() => setSelectedProduct(product)}
      >
        <div className="flex items-start md:items-center space-x-4 w-full md:w-auto">
          <div className="flex-shrink-0 p-3 bg-gray-100 rounded-lg">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-md"
              />
            ) : (
              <Package className="w-6 h-6 text-gray-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 line-clamp-2 md:line-clamp-2">
              {product.name}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              {product.brand} <span className="mx-1">•</span> Cód: {product.code}
            </p>
            <div className="flex items-center mt-1">
              {product.stock_disponible <= 0 ? (
                <div className="flex items-center">
                  <span className="text-xs md:text-sm font-medium text-red-600">
                    Sin Stock
                  </span>
                  {product.stock_de_seguridad > 0 && (
                    <span className="ml-2 text-[10px] md:text-xs text-blue-600 font-medium">
                      | Previsto de ingreso
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-xs md:text-sm font-medium text-gray-600">
                    Stock: {product.stock_disponible > 100 ? '+100' : product.stock_disponible}
                  </span>
                  {product.stock_de_seguridad > 0 && (
                    <span className="ml-2 text-[10px] md:text-xs text-blue-600 font-medium">
                      | Previsto de ingreso
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:flex-col md:items-end md:justify-center w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
          <p className="text-lg font-bold text-[#0B3D68]">
            {formatCurrency(product.price)}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCartClick(product);
            }}
            className="px-6 py-2 md:px-4 md:py-1 text-sm font-medium text-white bg-[#8CB818] rounded-md hover:bg-[#7aa315] transition-colors cursor-pointer md:mt-2"
          >
            Añadir
          </button>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
      />

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Nuevo Pedido</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="search-product" className="sr-only">
                    Buscar Producto
                  </label>
                  <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="search-product"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-espint-blue focus:border-espint-blue"
                      placeholder="Buscar por nombre o código..."
                    />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="brand-select" className="sr-only">
                    Seleccionar Marca
                  </label>
                  <CustomSelect
                    options={allBrands}
                    value={selectedBrand}
                    onChange={(val) => {
                      setSelectedBrand(val);
                      setCurrentPage(1);
                    }}
                    placeholder="Todas las marcas"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-espint-blue p-4 mb-4 rounded-r-lg">
              <p className="text-sm text-blue-900">
                <strong>Nota:</strong> Seleccione los productos de la lista para agregarlos al pedido.
              </p>
            </div>

            <div className="space-y-4">{renderProductList()}</div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || loadingProducts}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Anterior
                </button>
                <span className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages || loadingProducts}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            )}
          </div>

          <div className="lg-col-span-1 hidden lg:block">
            <div className="sticky top-8 bg-white rounded-lg shadow-md flex flex-col max-h-[calc(100vh-4rem)] border-t-4 border-espint-magenta">
              <div className="flex-shrink-0 p-6">
                <div className="flex items-center mb-4">
                  <ShoppingCart className="w-6 h-6 text-gray-800 mr-3" />
                  <h2 className="text-xl font-bold text-gray-800">
                    Resumen del Pedido
                  </h2>
                </div>
              </div>

              <div className="flex-1 divide-y divide-gray-200 overflow-y-auto px-6">
                {cart.length === 0 && (
                  <p className="py-4 text-center text-gray-500">
                    Tu carrito está vacío.
                  </p>
                )}
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 flex items-center space-x-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.price)}
                      </p>
                      <div className="flex items-center mt-2">
                        <label
                          htmlFor={`qty-${item.id}`}
                          className="text-xs text-gray-600 mr-2"
                        >
                          Cant:
                        </label>
                        <input
                          id={`qty-${item.id}`}
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(item.id, e.target.value)
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          min="0"
                          max={item.stock_disponible}
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

              {cart.length > 0 && (
                <div className="flex-shrink-0 p-6 border-t border-gray-200 space-y-3">

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-medium text-gray-900">
                      Total:
                    </span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/order-preview')}
                    disabled={cart.length === 0}
                    className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold text-white bg-[#8CB818] rounded-md shadow-sm hover:bg-[#7aa315] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Revisar Pedido
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Precio con IVA incluído
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Cart for Mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 lg:hidden z-50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium">Total Estimado</span>
            <span className="text-xl font-bold text-espint-blue">{formatCurrency(totalPrice)}</span>
          </div>
          <button
            onClick={() => navigate('/order-preview')}
            className="flex items-center justify-center px-6 py-3 bg-[#8CB818] text-white font-bold rounded-lg shadow-md hover:bg-[#7aa315] transition-colors"
          >
            Ver Pedido
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      )}

      {/* Spacer to prevent content from being hidden behind sticky cart */}
      {cart.length > 0 && <div className="h-24 lg:hidden"></div>}
    </div>
  );
};

export default NewOrderPage;
