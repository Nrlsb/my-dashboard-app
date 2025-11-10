import React, { useState, useMemo } from 'react';
// (NUEVO) Importamos el hook para acceder al cliente de React Query
import { useQueryClient } from '@tanstack/react-query';

// --- Importar Páginas ---
// (CORREGIDO) Se cambian las rutas a relativas
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
// (NUEVO) Importar la nueva página de detalle
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import Header from './components/Header.jsx'; // Importa el Header unificado

// Importar el hook del carrito
// (CORREGIDO) Se cambian las rutas a relativas
import { useCart } from './context/CartContext.jsx'; 

// --- Componente Raíz (Maneja la autenticación y navegación) ---
function App() {
  const [currentPage, setCurrentPage] = useState('login');
  
  const [currentUser, setCurrentUser] = useState(null);
  // (NUEVO) Estado para guardar el ID del pedido que queremos ver
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  const isLoggedIn = !!currentUser;
  
  const { cart, clearCart } = useCart();
  
  const queryClient = useQueryClient();

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
  
  // (NUEVO) Función para navegar a la página de detalle
  const handleViewOrderDetail = (orderId) => {
    setSelectedOrderId(orderId);
    setCurrentPage('order-detail');
  };


  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    clearCart(); // Limpiamos el carrito al cerrar sesión
    setCurrentPage('login');
  };

  // (MODIFICADO) Esta función ahora invalida el caché antes de navegar
  const handleCompleteOrder = () => {
    console.log('Pedido completado, invalidando caché, limpiando carrito y navegando...');

    // --- INICIO DE LA SOLUCIÓN ---
    // 1. Invalidamos las 'queries' cacheadas.
    // Esto le dice a React Query que los datos de 'orderHistory' y 'accountBalance' 
    // están obsoletos y debe volver a pedirlos a la API la próxima vez que se 
    // rendericen las páginas correspondientes.
    queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
    queryClient.invalidateQueries({ queryKey: ['accountBalance'] });
    // --- FIN DE LA SOLUCIÓN ---

    // 2. Limpiamos el carrito local
    clearCart(); 
    
    // 3. Navegamos al historial
    setCurrentPage('order-history');
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
        // (CORREGIDO) Cambiado 'currentUser' por 'user' para que coincida con el prop de ProfilePage.jsx
        return <ProfilePage onNavigate={handleNavigate} user={currentUser} />;
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
        // (CORREGIDO) Cambiado 'currentUser' por 'user' para que coincida con el prop de OrderHistoryPage.jsx
        // (NUEVO) Pasamos el manejador 'handleViewOrderDetail'
        return (
          <OrderHistoryPage 
            onNavigate={handleNavigate} 
            user={currentUser} 
            onViewDetails={handleViewOrderDetail} 
          />
        );
      case 'account-balance':
        // Pasamos currentUser para filtrar movimientos
        // (CORREGIDO) Cambiado 'currentUser' por 'user' para que coincida con el prop de AccountBalancePage.jsx
        return <AccountBalancePage onNavigate={handleNavigate} user={currentUser} />;
      
      // (NUEVO) Caso para la nueva página de detalle
      case 'order-detail':
        return (
          <OrderDetailPage 
            onNavigate={handleNavigate} 
            user={currentUser} 
            orderId={selectedOrderId} 
          />
        );
        
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