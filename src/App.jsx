import React, { useState } from 'react';
import {
  ShoppingCart,
  Clock,
  DollarSign,
  Gift,
  Banknote,
  FileText,
  HelpCircle,
  UploadCloud,
  Building,
  ChevronDown,
  Search, // <-- Icono importado
  ArrowLeft, // <-- Icono importado
} from 'lucide-react';

// --- Componente de Login ---
// Este es el nuevo componente para la página de inicio de sesión.
const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de autenticación de simulación
    // En un proyecto real, aquí llamarías a tu API
    if (username.trim() !== '' && password.trim() !== '') {
      setError('');
      onLoginSuccess(); // Llama a la función del padre para cambiar el estado
    } else {
      setError('Usuario o contraseña no pueden estar vacíos.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-xl">
        {/* Logo */}
        <div className="text-center">
          {/* Cambiado 'KUM' y ajustado el tamaño de fuente */}
          <span className="text-3xl font-bold text-red-600">Pintureria Mercurio</span>
          {/* Eliminada la línea 'APORTES EN VIRTUAL' para mejor ajuste */}
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800">Iniciar Sesión</h2>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Campo Usuario */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario"
            />
          </div>
          
          {/* Campo Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* Mensaje de Error */}
          {error && (
            <p className="text-sm text-center text-red-600">{error}</p>
          )}

          {/* Botón de Ingreso */}
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};


// --- Componentes del Dashboard (el código original) ---

// El Header
const Header = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            {/* Cambiado 'KUM' y ajustado el tamaño de fuente */}
            <span className="text-2xl font-bold text-red-600">Pintureria Mercurio</span>
            {/* Eliminada la línea 'APORTES EN VIRTUAL' para mejor ajuste */}
          </div>
          
          {/* Perfil de Usuario */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-full">
              <Building className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">Nombre de la Empresa</p>
              <p className="text-xs text-gray-500">Usuario Logueado</p>
            </div>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

// El Card
// Acepta ...props, que usaremos para pasar 'onClick'
const DashboardCard = ({ title, subTitle, icon: Icon, tag, bgColor = 'bg-gray-700', ...props }) => {
  return (
    <div 
      className="relative flex flex-col items-center justify-center p-4 pt-8 text-center bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer overflow-hidden"
      {...props} // <-- onClick se aplicará aquí
    >
      {tag && (
        <span className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white bg-red-600 rounded-bl-lg">
          {tag}
        </span>
      )}
      
      <div className="flex items-center justify-center w-16 h-16 mb-4">
        <Icon className="w-12 h-12 text-gray-700" />
      </div>
      
      <h3 className="text-sm font-semibold text-gray-500 uppercase">{title}</h3>
      
      <button 
        className={`w-full px-4 py-2 mt-4 text-sm font-semibold text-white ${bgColor} rounded-md hover:opacity-90 transition-opacity`}
      >
        {subTitle}
      </button>
    </div>
  );
};

// El Contenido del Dashboard
// Modificado para aceptar 'onNavigate' y pasarlo al card "Nuevo Pedido"
const Dashboard = ({ onNavigate }) => {
  const cards = [
    { 
      title: '', 
      subTitle: 'Nuevo Pedido', 
      icon: ShoppingCart, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('newOrder') // <-- Acción de navegación
    },
    { 
      title: 'Historico', 
      subTitle: 'Histórico de Pedidos', 
      icon: Clock, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('orderHistory') // <-- Acción para Histórico
    },
    { 
      title: 'Precios', 
      subTitle: 'Lista de Precios', 
      icon: DollarSign, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('priceList') // <-- (NUEVO) Acción para Precios
    },
    { 
      title: 'Ofertas', 
      subTitle: 'Nuevas Ofertas', 
      icon: Gift, 
      tag: 'NUEVO', 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('offers') // <-- (NUEVO) Acción para Ofertas
    },
    { title: 'Cuenta Corriente', subTitle: 'Saldo Cuenta', icon: Banknote, bgColor: 'bg-gray-700' },
    { title: 'Información Importante', subTitle: 'Información', icon: FileText, bgColor: 'bg-gray-700' },
    { title: 'Consultas', subTitle: 'Envío de Consultas', icon: HelpCircle, bgColor: 'bg-gray-700' },
    { title: 'Cupones Tarjeta', subTitle: 'Carga Comprobantes', icon: UploadCloud, bgColor: 'bg-gray-700' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {cards.map((card, index) => (
        <DashboardCard
          key={index}
          title={card.title}
          subTitle={card.subTitle}
          icon={card.icon}
          tag={card.tag}
          bgColor={card.bgColor}
          onClick={card.action} // <-- Asignamos el onClick
        />
      ))}
    </div>
  );
};


// --- Página Principal del Dashboard ---
// (Esto era el 'App' original)
// Modificado para aceptar y pasar 'onNavigate'
const DashboardPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Dashboard onNavigate={onNavigate} />
      </main>
    </div>
  );
};

// --- (NUEVO) Página de Nuevo Pedido ---
const NewOrderPage = ({ onNavigate }) => {
  // Lista de marcas de ejemplo para el dropdown
  const brands = [
    'Pinturas Mercurio',
    'Marca Alba',
    'Marca Sinteplast',
    'Marca Tersuave',
    'Pinceles El Galgo',
  ];

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

        {/* Espacio para la lista de productos */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow-md min-h-[300px]">
          <p className="text-center text-gray-500">Los resultados de los productos aparecerán aquí...</p>
        </div>

      </main>
    </div>
  );
};

// --- (NUEVO) Página de Histórico de Pedidos ---
const OrderHistoryPage = ({ onNavigate }) => {
  
  // Datos de ejemplo para el histórico
  const orderHistory = [
    { id: '12345', date: '2024-10-28', total: '$15,000.00', status: 'Entregado' },
    { id: '12346', date: '2024-10-25', total: '$8,200.00', status: 'Entregado' },
    { id: '12347', date: '2024-10-22', total: '$1,500.00', status: 'Pendiente' },
    { id: '12348', date: '2024-10-19', total: '$22,100.00', status: 'En Proceso' },
    { id: '12349', date: '2024-10-15', total: '$5,000.00', status: 'Cancelado' },
  ];

  // Función para obtener el color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'Entregado': return 'bg-green-100 text-green-800';
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'En Proceso': return 'bg-blue-100 text-blue-800';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-2xl font-bold text-gray-800">Histórico de Pedidos</h1>
        </div>

        {/* Tabla de Histórico de Pedidos */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Pedido
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderHistory.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-red-600 hover:text-red-900">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- (NUEVO) Página de Lista de Precios ---
const PriceListPage = ({ onNavigate }) => {

  // Lista de marcas de ejemplo
  const brands = [
    'Pinturas Mercurio',
    'Marca Alba',
    'Marca Sinteplast',
    'Marca Tersuave',
    'Pinceles El Galgo',
  ];

  // Datos de ejemplo para la lista de precios
  const priceList = [
    { id: 'PM-1001', name: 'Latex Interior Mate 20L', brand: 'Pinturas Mercurio', price: '$25,000.00' },
    { id: 'AL-500', name: 'Sintético Brillante Blanco 1L', brand: 'Marca Alba', price: '$5,500.00' },
    { id: 'ST-202', name: 'Impermeabilizante Techos 10L', brand: 'Marca Sinteplast', price: '$18,000.00' },
    { id: 'TS-300', name: 'Barniz Marino 1L', brand: 'Marca Tersuave', price: '$4,200.00' },
    { id: 'EG-010', name: 'Pincel N°10 Virola 1', brand: 'Pinceles El Galgo', price: '$1,500.00' },
    { id: 'PM-1002', name: 'Latex Exterior 10L', brand: 'Pinturas Mercurio', price: '$19,000.00' },
    { id: 'AL-505', name: 'Sintético Brillante Negro 1L', brand: 'Marca Alba', price: '$5,500.00' },
  ];

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
          <h1 className="text-2xl font-bold text-gray-800">Lista de Precios</h1>
        </div>

        {/* Controles de Filtro (Selector y Búsqueda) */}
        <div className="p-6 bg-white rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Selector de Marca */}
            <div>
              <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Marca
              </label>
              <select
                id="brand-select"
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

        {/* Tabla de Lista de Precios */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marca
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {priceList.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{product.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

// --- (NUEVO) Página de Ofertas ---
const OffersPage = ({ onNavigate }) => {

  // Datos de ejemplo para las ofertas
  const offers = [
    {
      id: 1,
      title: 'Kit Pintor Completo Mercurio',
      description: 'Llevate 20L de Latex Interior + Rodillo + Pincel N°10 con un 20% de descuento.',
      price: '$28,000.00',
      oldPrice: '$35,000.00',
      imageUrl: 'https://placehold.co/600x400/ef4444/white?text=Oferta+Kit',
    },
    {
      id: 2,
      title: '2x1 en Sintético Brillante Alba',
      description: 'Comprando 1L de Sintético Brillante Blanco, te llevas otro de regalo (o 50% off en la 2da unidad).',
      price: '$5,500.00',
      oldPrice: '$11,000.00',
      imageUrl: 'https://placehold.co/600x400/3b82f6/white?text=Oferta+2x1',
    },
    {
      id: 3,
      title: 'Envío Gratis Superando $50,000',
      description: 'Todas tus compras superiores a $50,000 tienen envío gratis a tu sucursal.',
      price: '¡GRATIS!',
      oldPrice: '',
      imageUrl: 'https://placehold.co/600x400/10b981/white?text=Envío+Gratis',
    },
  ];

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
          <h1 className="text-2xl font-bold text-gray-800">Nuevas Ofertas</h1>
        </div>

        {/* Grid de Tarjetas de Ofertas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
              <img 
                src={offer.imageUrl} 
                alt={offer.title} 
                className="w-full h-48 object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/cccccc/white?text=Imagen+no+disponible'; }}
              />
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{offer.title}</h3>
                <p className="text-gray-600 text-sm mb-4 flex-1">{offer.description}</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-red-600">{offer.price}</span>
                  {offer.oldPrice && (
                    <span className="text-lg text-gray-500 line-through">{offer.oldPrice}</span>
                  )}
                </div>
                <button className="w-full px-4 py-2 mt-4 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
};


// --- Componente Raíz (Maneja la autenticación y navegación) ---
// Este es el componente principal que decide qué página mostrar.
// Modificado para manejar múltiples vistas
export default function App() {
  // Estado para manejar la vista actual: 'login', 'dashboard', 'newOrder'
  const [currentView, setCurrentView] = useState('login');

  // Función para cambiar de vista
  const navigateTo = (view) => {
    setCurrentView(view);
  };

  // Renderizado condicional basado en la vista
  if (currentView === 'login') {
    return <LoginPage onLoginSuccess={() => navigateTo('dashboard')} />;
  }

  if (currentView === 'dashboard') {
    return <DashboardPage onNavigate={navigateTo} />;
  }
  
  if (currentView === 'newOrder') {
    return <NewOrderPage onNavigate={navigateTo} />;
  }

  // (NUEVO) Renderizado para Histórico
  if (currentView === 'orderHistory') {
    return <OrderHistoryPage onNavigate={navigateTo} />;
  }

  // (NUEVO) Renderizado para Lista de Precios
  if (currentView === 'priceList') {
    return <PriceListPage onNavigate={navigateTo} />;
  }

  // (NUEVO) Renderizado para Ofertas
  if (currentView === 'offers') {
    return <OffersPage onNavigate={navigateTo} />;
  }

  // Fallback por si acaso
  return <LoginPage onLoginSuccess={() => navigateTo('dashboard')} />;
}

