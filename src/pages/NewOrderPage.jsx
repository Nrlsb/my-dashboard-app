import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import apiService from '../api/apiService.js';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductModal from '../components/NewOrder/ProductModal';
import ProductFilters from '../components/NewOrder/ProductFilters';
import ProductCard from '../components/NewOrder/ProductCard';
import CartSidebar from '../components/NewOrder/CartSidebar';
import MobileCartModal from '../components/NewOrder/MobileCartModal';

const PRODUCTS_PER_PAGE = 20;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};

const NewOrderPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [productMap, setProductMap] = useState(new Map());
  const [totalProducts, setTotalProducts] = useState(0);
  const [allBrands, setAllBrands] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedBrand, setSelectedBrand] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const { cart, addToCart, updateQuantity, removeFromCart, setCart, clearCart } = useCart();

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

  const handleQuantityChange = (productId, quantityStr, product) => {
    let quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity < 1) {
      updateQuantity(productId, 0);
      return;
    }

    const stock = Number(product?.stock_disponible) || 0;
    const packQty = Number(product?.pack_quantity) > 0 ? Number(product.pack_quantity) : 1;
    const rawIndicator = product?.indicator_description;
    const isRestricted = rawIndicator !== null && rawIndicator !== undefined && (String(rawIndicator).trim() === '0' || Number(rawIndicator) === 0);

    if (isRestricted) {
      if (stock <= 0) {
        if (quantity % packQty !== 0) {
          const remainder = quantity % packQty;
          if (remainder >= packQty / 2) {
            quantity = quantity + (packQty - remainder);
          } else {
            quantity = quantity - remainder;
          }
          if (quantity < packQty) quantity = packQty;
        }
      } else {
        if (quantity > stock) {
          const surplus = quantity - stock;
          if (surplus % packQty !== 0) {
            const remainder = surplus % packQty;
            let newSurplus = surplus;
            if (remainder >= packQty / 2) {
              newSurplus = surplus + (packQty - remainder);
            } else {
              newSurplus = surplus - remainder;
            }
            if (newSurplus < packQty) newSurplus = packQty;
            quantity = stock + newSurplus;
          }
        }
      }
    }

    updateQuantity(productId, quantity);
  };

  const handleAddToCartClick = (product) => {
    const stock = Number(product?.stock_disponible) || 0;
    const rawIndicator = product?.indicator_description;
    const isRestricted = rawIndicator !== null && rawIndicator !== undefined && (String(rawIndicator).trim() === '0' || Number(rawIndicator) === 0);
    const packQty = Number(product?.pack_quantity) > 0 ? Number(product.pack_quantity) : 1;

    let qtyToAdd = 1;

    if (isRestricted) {
      // Verificar cantidad actual en el carrito
      const cartItem = cart.find((item) => item.id === product.id);
      const currentInCart = cartItem ? cartItem.quantity : 0;

      // Si ya tenemos todo el stock disponible (o más), sumamos por bulto
      if (currentInCart >= stock) {
        qtyToAdd = packQty;
      }
    }

    addToCart(product, qtyToAdd);
  };

  const handleReviewOrder = () => {
    let hasChanges = false;
    const reviewCart = cart.map(item => {
      const product = productMap.get(item.id) || item;
      const stock = Number(product?.stock_disponible) || 0;
      const rawIndicator = product?.indicator_description;
      const isRestricted = rawIndicator !== null && rawIndicator !== undefined && (String(rawIndicator).trim() === '0' || Number(rawIndicator) === 0);
      const packQty = Number(product?.pack_quantity) > 0 ? Number(product.pack_quantity) : 1;

      let quantity = item.quantity;
      if (isRestricted && quantity > stock) {
        const surplus = quantity - stock;
        const remainder = surplus % packQty;

        if (remainder !== 0) {
          const correction = packQty - remainder;
          quantity = quantity + correction;
          hasChanges = true;
        }
      }

      return { ...item, quantity };
    });

    if (hasChanges) {
      setCart(reviewCart);
    }

    navigate('/order-preview');
  };

  const totalPrice = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
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
      <ProductCard
        key={product.id}
        product={product}
        setSelectedProduct={setSelectedProduct}
        handleAddToCartClick={handleAddToCartClick}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
      />

      <MobileCartModal
        cart={cart}
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        productMap={productMap}
        updateQuantity={handleQuantityChange}
        removeFromCart={removeFromCart}
        totalPrice={totalPrice}
        handleQuantityChange={handleQuantityChange}
        clearCart={clearCart}
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
            <ProductFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
              allBrands={allBrands}
              setCurrentPage={setCurrentPage}
            />

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

          <CartSidebar
            cart={cart}
            productMap={productMap}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            totalPrice={totalPrice}
            handleReviewOrder={handleReviewOrder}
            handleQuantityChange={handleQuantityChange}
          />
        </div>
      </main>

      {/* Sticky Bottom Cart for Mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] px-4 py-3 lg:hidden z-50 flex items-center justify-between gap-3">
          <div
            className="flex flex-col flex-1 cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => setIsMobileCartOpen(true)}
          >
            <span className="text-xs text-gray-500 font-medium flex items-center">
              Total ({totalItems} {totalItems === 1 ? 'ítem' : 'ítems'})
              <span className="ml-1 text-[10px] text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">VER</span>
            </span>
            <span className="text-xl font-bold text-espint-blue">{formatCurrency(totalPrice)}</span>
          </div>
          <button
            onClick={handleReviewOrder}
            className="flex items-center justify-center px-4 py-3 bg-[#8CB818] text-white font-bold rounded-lg shadow-md hover:bg-[#7aa315] transition-colors"
          >
            Ver Pedido
            <ChevronRightIcon className="w-5 h-5 ml-1" />
          </button>
        </div>
      )}

      {cart.length > 0 && <div className="h-24 lg:hidden"></div>}
    </div>
  );
};

export default NewOrderPage;
