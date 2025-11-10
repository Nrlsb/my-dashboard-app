import React, { useState, useMemo } from 'react';

// --- Importar Páginas ---
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewOrderPage from './pages/NewOrderPage.jsx';
import OrderHistoryPage from './pages/OrderHistoryPage.jsx';
import PriceListPage from './pages/PriceListPage.jsx';
import OffersPage from './pages/OffersPage.jsx';
import AccountBalancePage from './pages/AccountBalancePage.jsx';
import QueriesPage from './pages/QueriesPage.jsx';
import VoucherUploadPage from './pages/VoucherUploadPage.jsx'; 
import ProfilePage from './pages/ProfilePage.jsx'; 
import OrderPreviewPage from './pages/OrderPreviewPage.jsx'; 
import Header from './components/Header.jsx'; // Importa el Header unificado

// (NUEVO) Importar el hook del carrito
import { useCart } from './context/CartContext.jsx'; 

// --- Componente Raíz (Maneja la autenticación y navegación) ---
function App() {
  const [currentPage, setCurrentPage] = useState('login');
  
  // (NUEVO) Guardamos el objeto del usuario logueado (ej: { id: 1, full_name: '...', email: '...' })
  const [currentUser, setCurrentUser] = useState(null);
  
  // (MODIFICADO) El estado de login ahora es una variable derivada
  const isLoggedIn = !!currentUser;
  
  // (NUEVO) Obtenemos el carrito y la función para limpiarlo desde el contexto
  const { cart, clearCart } = useCart();

  // Función para cambiar de vista (nuestro "router" simple)
  const handleNavigate = (page) => {
    // Estandarizamos los nombres de las rutas para evitar errores
    const pageMap = {
      'newOrder': 'new-order',
      'orderHistory': 'order-history',
      'priceList': 'price-list',
      'accountBalance': 'account-balance',
      'voucherUpload': 'voucher-upload',
      'orderPreview': 'order-preview',
    };
    // Si viene un nombre antiguo, lo convierte. Si no, usa el nombre nuevo.
    setCurrentPage(pageMap[page] || page);
  };

  // (MODIFICADO) handleLogin ahora recibe y guarda el objeto 'user'
  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentPage('dashboard');
  };

  // (MODIFICADO) handleLogout limpia el usuario y el carrito
  const handleLogout = () => {
    setCurrentUser(null);
    clearCart(); // Limpiamos el carrito al cerrar sesión
    setCurrentPage('login');
  };

  // (MODIFICADO) Esta función ahora usa 'clearCart' del contexto
  const handleCompleteOrder = () => {
    // La lógica de envío ahora está en OrderPreviewPage
    // App solo necesita limpiar el carrito y navegar
    console.log('Pedido completado, limpiando carrito y navegando...');
    clearCart(); // Limpia el carrito usando la función del contexto
    setCurrentPage('order-history'); // Navega al historial
  };

  // Función para renderizar la página correcta
  const renderPage = () => {
    // Si no está logueado, solo mostramos Login o Register
    if (!isLoggedIn) {
      switch (currentPage) {
        case 'register':
          return <RegisterPage onNavigate={handleNavigate} />;
        case 'login':
        default:
          return <LoginPage onNavigate={handleNavigate} onLogin={handleLogin} />;
      }
    }

    // Si está logueado, mostramos el resto de las páginas
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'profile':
        // Pasamos el currentUser para que la página cargue sus datos
        return <ProfilePage onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'price-list':
        return <PriceListPage onNavigate={handleNavigate} />;
      case 'new-order':
        // Ya no pasamos props de carrito (vienen del context)
        // Pasamos currentUser para la lógica de cliente
        return <NewOrderPage onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'order-preview':
        // Pasamos currentUser para la lógica de envío
        return (
          <OrderPreviewPage
            onNavigate={handleNavigate}
            onCompleteOrder={handleCompleteOrder} // Esta prop es necesaria
            currentUser={currentUser}
          />
        );
      case 'order-history':
        // Pasamos currentUser para filtrar pedidos
        return <OrderHistoryPage onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'account-balance':
        // Pasamos currentUser para filtrar movimientos
        return <AccountBalancePage onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'voucher-upload':
        // Pasamos currentUser para asociar el archivo
        return <VoucherUploadPage onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'offers':
        return <OffersPage onNavigate={handleNavigate} />;
      case 'queries':
        // Pasamos currentUser para asociar la consulta
        return <QueriesPage onNavigate={handleNavigate} currentUser={currentUser} />;
      default:
        // Fallback si la página no se conoce
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app-container">
      {isLoggedIn && (
        // El Header se renderiza aquí para todas las páginas logueadas
        <Header
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          currentUser={currentUser}
        />
      )}
      <div className="page-content">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;