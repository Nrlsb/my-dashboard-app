import React, { useState, useMemo } from 'react';
import Header from '../components/Header.jsx';
import { ArrowLeft, Search, ShoppingCart, Trash2, Package } from 'lucide-react';

// --- Datos de ejemplo (Mock Data) ---
// En una aplicación real, esto vendría de una API.
const mockProducts = [
  { id: 'PM-1001', name: 'Latex Interior Mate 20L', brand: 'Pinturas Mercurio', price: 25000, stock: 10 },
  { id: 'AL-500', name: 'Sintético Brillante Blanco 1L', brand: 'Marca Alba', price: 5500, stock: 50 },
  { id: 'ST-202', name: 'Impermeabilizante Techos 10L', brand: 'Marca Sinteplast', price: 18000, stock: 15 },
  { id: 'TS-300', name: 'Barniz Marino 1L', brand: 'Marca Tersuave', price: 4200, stock: 30 },
  { id: 'EG-010', name: 'Pincel N°10 Virola 1', brand: 'Pinceles El Galgo', price: 1500, stock: 100 },
  { id: 'PM-1002', name: 'Latex Exterior 10L', brand: 'Pinturas Mercurio', price: 19000, stock: 20 },
  { id: 'AL-505', name: 'Sintético Brillante Negro 1L', brand: 'Marca Alba', price: 5500, stock: 40 },
];

// Lista de marcas para el dropdown (derivada de los productos)
const brands = [...new Set(mockProducts.map(p => p.brand))];

// --- Página de Nuevo Pedido ---
const NewOrderPage = ({ onNavigate }) => {
  // --- Estados ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [cart, setCart] = useState([]); // Estado para el carrito

  // --- Lógica de Filtro ---
  const filteredProducts = useMemo(() => {
    return mockProducts.filter(product => {
      const matchesBrand = selectedBrand ? product.brand === selectedBrand : true;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBrand && matchesSearch;
    });
  }, [searchTerm, selectedBrand]);

  // --- Lógica de Carrito ---
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        // Si ya existe, incrementa la cantidad (respetando el stock)
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      } else {
        // Si no existe, añádelo con cantidad 1
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    const product = mockProducts.find(p => p.id === productId);
    const newQuantity = Math.max(0, Math.min(quantity, product.stock)); // No negativo y no más que el stock

    setCart(prevCart => {
      if (newQuantity === 0) {
        // Si la cantidad es 0, elimínalo
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

  // --- Lógica de Total ---
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

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Encabezado con Botón de Volver y Título */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('dashboard')} // <-- Navega de vuelta al dashboard
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
                
                {/* Selector de Marca */}
                <div>
                  <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Marca
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Todas las marcas</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* Barra de Búsqueda */}
                <div>
                  <label htmlFor="search-product" className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar Producto
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="search-product"
                      name="search-product"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 p-3 bg-gray-100 rounded-lg">
                        <Package className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.brand} (Cód: {product.id})</p>
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
                ))
              ) : (
                <div className="p-6 bg-white rounded-lg shadow-md text-center text-gray-500">
                  No se encontraron productos que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>

          {/* --- Columna Derecha: Carrito --- */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 p-6 bg-white rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <ShoppingCart className="w-6 h-6 text-gray-800 mr-3" />
                <h2 className="text-xl font-bold text-gray-800">Resumen del Pedido</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {cart.length === 0 ? (
                  <p className="py-4 text-center text-gray-500">Tu carrito está vacío.</p>
                ) : (
                  cart.map(item => (
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
                            max={item.stock}
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
                  ))
                )}
              </div>

              {/* Total y Botón */}
              {cart.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-medium text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
                  </div>
                  <button
                    onClick={() => console.log('Pedido finalizado:', cart)} // Aquí iría la lógica de envío
                    className="w-full px-6 py-3 font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 transition-colors"
                  >
                    Finalizar Pedido
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
