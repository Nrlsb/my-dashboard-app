import React, { useState, useMemo, useEffect } from 'react';
import Header from '../components/Header.jsx';
import { ArrowLeft, Search, ShoppingCart, Trash2, Package, CheckCircle, AlertTriangle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

// (NUEVO) Definimos la URL de la API
const API_URL = 'http://localhost:3001';
const PRODUCTS_PER_PAGE = 20; // (NUEVO) Paginación

// --- Página de Nuevo Pedido ---
const NewOrderPage = ({ onNavigate }) => {
  // --- Estados ---
  const [allProducts, setAllProducts] = useState([]); // (CAMBIADO) Almacena solo la página actual
  const [brands, setBrands] = useState([]); // (NUEVO) Almacena las marcas para el filtro
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [cart, setCart] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); 
  const [submitMessage, setSubmitMessage] = useState(''); 

  // (NUEVO) Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // --- Carga de Datos ---

  // (NUEVO) Cargar marcas (solo una vez)
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(`${API_URL}/api/brands`);
        if (!response.ok) throw new Error('No se pudo cargar las marcas.');
        const data = await response.json();
        setBrands(data);
      } catch (err) {
        // No es un error crítico si las marcas no cargan
        console.error("Error cargando marcas:", err);
      }
    };
    fetchBrands();
  }, []);

  // (ACTUALIZADO) Cargar productos (se ejecuta cada vez que cambian los filtros o la página)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      setProductError(null);
      
      try {
        // (NUEVO) Construir los parámetros de consulta para el backend
        const params = new URLSearchParams({
          page: currentPage,
          limit: PRODUCTS_PER_PAGE,
          search: searchTerm,
          brand: selectedBrand,
        });
        
        // (ACTUALIZADO) Hacer la solicitud con los parámetros
        const response = await fetch(`${API_URL}/api/products?${params.toString()}`);
        if (!response.ok) throw new Error('No se pudo cargar la lista de productos.');
        
        const data = await response.json(); // data ahora es { products: [...], totalProducts: X }

        // (CORREGIDO) Seteamos los productos y el total
        setAllProducts(data.products);
        setTotalProducts(data.totalProducts);

      } catch (err) {
        setProductError(err.message);
        setAllProducts([]); // Limpiar productos en caso de error
        setTotalProducts(0);
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
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } // Usa el stock del producto
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }]; // Añade el producto completo (incluido el stock)
      }
    });
  };

  // (CORREGIDO) updateCartQuantity ahora usa el stock guardado en el carrito,
  //            para no depender de 'allProducts' (que ahora está paginado).
  const updateCartQuantity = (productId, quantity) => {
    setCart(prevCart => {
      const itemInCart = prevCart.find(item => item.id === productId);
      if (!itemInCart) return prevCart; // El item no está en el carrito

      // Usar el stock guardado en el item del carrito
      const newQuantity = Math.max(0, Math.min(quantity, itemInCart.stock)); 

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

  // --- Lógica de Total (sin cambios) ---
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
  
  // --- (NUEVO) Lógica de Paginación ---
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // --- (NUEVO) Función para Generar PDF ---
  const generateQuotePDF = () => {
    // jsPDF estará disponible en 'window' gracias al script en index.html
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const clientName = "CLIENTE-001"; // Simulado
    const companyName = "Pintureria Mercurio";
    const date = new Date().toLocaleDateString('es-AR');
    let yPos = 20; // Posición vertical inicial

    // Título y Cabecera
    doc.setFontSize(20);
    doc.text("PRESUPUESTO", 105, yPos, { align: 'center' });
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`${companyName}`, 20, yPos);
    doc.text(`Fecha: ${date}`, 180, yPos, { align: 'right' });
    yPos += 7;
    doc.text(`Cliente: ${clientName}`, 20, yPos);
    yPos += 10;
    
    // Línea divisoria
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Cabecera de la tabla
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Cód.", 20, yPos);
    doc.text("Descripción", 40, yPos);
    doc.text("Cant.", 120, yPos, { align: 'right' });
    doc.text("Precio Unit.", 150, yPos, { align: 'right' });
    doc.text("Subtotal", 180, yPos, { align: 'right' });
    doc.setFont(undefined, 'normal');
    yPos += 7;

    // Items del carrito
    cart.forEach(item => {
      const subtotal = item.price * item.quantity;
      doc.text(String(item.code), 20, yPos); // Usar code
      doc.text(doc.splitTextToSize(item.name, 70), 40, yPos); // Auto-ajuste de texto
      doc.text(item.quantity.toString(), 120, yPos, { align: 'right' });
      doc.text(formatCurrency(item.price), 150, yPos, { align: 'right' });
      doc.text(formatCurrency(subtotal), 180, yPos, { align: 'right' });
      yPos += 10; // Espacio para siguiente item
    });

    // Línea divisoria
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    // Total
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("TOTAL:", 140, yPos);
    doc.text(formatCurrency(totalPrice), 180, yPos, { align: 'right' });

    // Guardar el PDF
    doc.save(`presupuesto-${clientName}-${date}.pdf`);
  };

  // --- Lógica de Envío de Pedido (Actualizada) ---
  const handleSubmitOrder = async (submissionType) => { // submissionType: 'order' | 'quote'
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage('');
    
    // Generar PDF si es un presupuesto
    if (submissionType === 'quote') {
      try {
        generateQuotePDF();
      } catch (pdfError) {
        console.error("Error al generar PDF:", pdfError);
        setSubmitStatus('error'); 
        setSubmitMessage("Error al generar el PDF. El presupuesto se guardará de todas formas.");
      }
    }
    
    try {
      // Preparamos solo los datos necesarios para el backend
      const orderData = {
        items: cart.map(item => ({ 
          id: item.id, 
          code: item.code, 
          quantity: item.quantity, 
          price: item.price 
        })),
        total: totalPrice,
        clientCode: 'CLIENTE-001', // Simulado
        type: submissionType 
      };
      
      if (orderData.items.some(item => !item.code)) {
        console.error("Error: items en el carrito no tienen 'code'", cart);
        throw new Error("Error interno: los items del carrito no tienen código.");
      }

      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) throw new Error('Error al enviar la solicitud.');
      
      const result = await response.json();
      console.log('Solicitud exitosa:', result);
      
      setSubmitStatus('success');
      setSubmitMessage(submissionType === 'order' ? '¡Pedido Enviado!' : '¡Presupuesto Generado!');
      setCart([]); // Vaciar carrito
      
      setTimeout(() => {
        onNavigate('orderHistory'); 
        setSubmitStatus(null); 
        setSubmitMessage('');
      }, 3000);

    } catch (err) {
      console.error(err);
      setSubmitStatus('error');
      setSubmitMessage(submissionType === 'order' ? 'Error al enviar el pedido.' : 'Error al generar el presupuesto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- (ACTUALIZADO) Renderizado de Lista de Productos ---
  const renderProductList = () => {
    if (loadingProducts) {
      return <div className="p-6 bg-white rounded-lg shadow-md text-center text-gray-500">Cargando productos...</div>;
    }
    if (productError) {
      return <div className="p-6 bg-white rounded-lg shadow-md text-center text-red-500">{productError}</div>;
    }
    // (ACTUALIZADO) Usar 'allProducts.length'
    if (allProducts.length === 0) {
      return <div className="p-6 bg-white rounded-lg shadow-md text-center text-gray-500">No se encontraron productos.</div>;
    }
    
    // (ACTUALIZADO) Mapear 'allProducts' directamente
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
                
                {/* (ACTUALIZADO) Selector de Marca usa el estado 'brands' */}
                <div>
                  <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Marca
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                      setCurrentPage(1); // (NUEVO) Resetear página
                    }}
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
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // (NUEVO) Resetear página
                      }}
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
              <div className="flex items-center justify-between mt-6 px-6 py-4 bg-white rounded-lg shadow-md">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loadingProducts}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Anterior
                </button>
                <span className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || loadingProducts}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              </div>
            )}
          </div>

          {/* --- Columna Derecha: Carrito --- */}
          <div className="lg:col-span-1">
            {/* (MODIFICADO) Se añade flex-col y un max-h para que el sticky funcione con el scroll interno */}
            <div className="sticky top-8 bg-white rounded-lg shadow-md flex flex-col max-h-[calc(100vh-4rem)]">
              
              {/* (NUEVO) Encabezado del Carrito (no se encoge) */}
              <div className="flex-shrink-0 p-6">
                {/* Mensajes de estado de envío */}
                {submitStatus === 'success' && (
                  <div className="p-4 mb-4 text-center bg-green-100 text-green-800 rounded-md">
                  <p className="text-sm">Serás redirigido al Histórico.</p>
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="p-4 mb-4 text-center bg-red-100 text-red-800 rounded-md">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">{submitMessage}</p>
                  <p className="text-sm">Inténtalo de nuevo más tarde.</p>
                </div>
              )}

              <div className="flex items-center mb-4">
                <ShoppingCart className="w-6 h-6 text-gray-800 mr-3" />
                <h2 className="text-xl font-bold text-gray-800">Resumen del Pedido</h2>
              </div>
              </div>
              
              {/* (MODIFICADO) Lista de Items (flexible y con scroll) */}
              {/* Se quita max-h-96, se añade flex-1, overflow-y-auto y padding horizontal */}
              <div className="flex-1 divide-y divide-gray-200 overflow-y-auto px-6">
                {cart.length === 0 && submitStatus !== 'success' && (
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
                  <button
                    onClick={() => handleSubmitOrder('quote')}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Generando...' : 'Generar Presupuesto'}
                  </button>
                  <button
                    onClick={() => handleSubmitOrder('order')}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Enviando...' : 'Generar Pedido de Venta'}
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