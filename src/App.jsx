import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import CategoryPage from './pages/CategoryPage.jsx'; // (NUEVO) Importar la página de categorías
// (NUEVO) Importar la nueva página de detalle de producto
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import DashboardSettingsPage from './pages/DashboardSettingsPage.jsx'; // (NUEVO) Importar la página de configuración
import ManageOffersPage from './pages/ManageOffersPage.jsx'; // (NUEVO) Importar la página de gestión de ofertas
import ClientGroupPermissionsPage from './pages/ClientGroupPermissionsPage.jsx'; // (NUEVO) Importar la página de permisos
import ManageAdminsPage from './pages/ManageAdminsPage.jsx'; // (NUEVO) Importar la página de gestión de admins
import VendedorDashboardPage from './pages/VendedorDashboardPage.jsx'; // (NUEVO) Importar panel de vendedor
import ClientesPage from './pages/ClientesPage.jsx'; // (NUEVO) Importar página de clientes
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'; // (NUEVO) Importar página de cambio de contraseña
import Header from './components/Header.jsx'; // Importa el Header unificado

// Importar el hook del carrito
// (CORREGIDO) Se cambian las rutas a relativas
import { useCart } from './context/CartContext.jsx'; 
import { useAuth } from './context/AuthContext.jsx'; // (NUEVO) Importar useAuth

// --- Componente Raíz (Maneja la autenticación y navegación) ---
function App() {
  const { isAuthenticated, user, loading, login, logout, firstLogin } = useAuth(); // (MODIFICADO) Usar useAuth
  const [currentPage, setCurrentPage] = useState('login');
  
  // (ELIMINADO) const [currentUser, setCurrentUser] = useState(null); // Ya no necesitamos este estado duplicado
  
  // (NUEVO) Estado para guardar el ID del pedido que queremos ver
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  // (NUEVO) Estado para guardar el ID del producto que queremos ver
  const [selectedProductId, setSelectedProductId] = useState(null);
  // (NUEVO) Estado para guardar el código de grupo que queremos ver
  const [selectedGroupCode, setSelectedGroupCode] = useState(null);
  
  // (ELIMINADO) const isLoggedIn = !!currentUser; // Ahora usamos isAuthenticated de useAuth
  
  const { cart, clearCart } = useCart();
  
  const queryClient = useQueryClient();

  const initialPageSet = useRef(false); // (NUEVO) Para asegurar que la página inicial se establezca solo una vez

  // (MODIFICADO) Sincronizar currentPage con el estado de autenticación (solo una vez al cargar)
  useEffect(() => {
    if (!loading && !initialPageSet.current) {
      if (isAuthenticated) {
        if (firstLogin) {
          setCurrentPage('change-password');
        } else if (user?.role === 'vendedor') {
          setCurrentPage('vendedor-dashboard');
        } else {
          setCurrentPage('dashboard');
        }
      } else {
        setCurrentPage('login');
      }
      initialPageSet.current = true; // Marcar que la inicialización ya se hizo
    }
  }, [loading, isAuthenticated, user, firstLogin]);

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
  
  // (NUEVO) Función para navegar a la página de detalle de pedido
  const handleViewOrderDetail = (orderId) => {
    setSelectedOrderId(orderId);
    setCurrentPage('order-detail');
  };

  // (NUEVO) Función para navegar a la página de detalle de producto
  const handleViewProductDetails = (productId) => {
    setSelectedProductId(productId);
    setCurrentPage('product-detail');
  };

  // (NUEVO) Función para navegar a la página de categoría
  const handleNavigateToCategory = (groupCode) => {
    setSelectedGroupCode(groupCode);
    setCurrentPage('category');
  };


  const handleLogin = async (email, password) => { // (MODIFICADO) Ahora usa la función login del contexto
    const result = await login(email, password);
    if (result.success) {
      if (result.first_login) {
        setCurrentPage('change-password');
      } else if (result.user?.role === 'vendedor') {
        setCurrentPage('vendedor-dashboard');
      } else {
        setCurrentPage('dashboard');
      }
    }
    return result;
  };

  const handleLogout = () => { // (MODIFICADO) Ahora usa la función logout del contexto
    logout();
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
    if (!isAuthenticated) { // (MODIFICADO) Usamos isAuthenticated de useAuth
      switch (currentPage) {
        case 'register':
          return <RegisterPage onNavigate={handleNavigate} />;
        case 'login':
        default:
          return <LoginPage onNavigate={handleNavigate} onLogin={handleLogin} />;
      }
    }

    if (isAuthenticated && firstLogin) {
      return <ChangePasswordPage />;
    }

    // Si está logueado, mostramos el resto de las páginas
    switch (currentPage) {
      case 'dashboard':
        // (NUEVO) Si es vendedor, se renderiza su panel. Si no, el de cliente.
        if (user?.role === 'vendedor') {
          return <VendedorDashboardPage onNavigate={handleNavigate} />;
        }
        return <DashboardPage onNavigate={handleNavigate} onNavigateToCategory={handleNavigateToCategory} onViewProductDetails={handleViewProductDetails} />;
      // (NUEVO) Panel específico para vendedor
      case 'vendedor-dashboard':
        return <VendedorDashboardPage onNavigate={handleNavigate} />;
      // (NUEVO) Página de clientes para el vendedor
      case 'vendedor-clientes':
        return <ClientesPage onNavigate={handleNavigate} />;
      case 'profile':
        // Pasamos el user del contexto
        return <ProfilePage onNavigate={handleNavigate} user={user} />; // (MODIFICADO)
      case 'price-list':
        return <PriceListPage onNavigate={handleNavigate} />;
      case 'new-order':
        // Pasamos user del contexto
        return <NewOrderPage onNavigate={handleNavigate} currentUser={user} onViewProductDetails={handleViewProductDetails} />; // (MODIFICADO)
      case 'order-preview':
        // Pasamos user del contexto
        return (
          <OrderPreviewPage
            onNavigate={handleNavigate}
            onCompleteOrder={handleCompleteOrder} // Esta prop es necesaria
            currentUser={user} // (MODIFICADO)
          />
        );
      case 'order-history':
        // Pasamos user del contexto
        return (
          <OrderHistoryPage 
            onNavigate={handleNavigate} 
            user={user} // (MODIFICADO)
            onViewDetails={handleViewOrderDetail} 
          />
        );
      case 'account-balance':
        // Pasamos user del contexto
        return <AccountBalancePage onNavigate={handleNavigate} user={user} />; // (MODIFICADO)
      
      // (NUEVO) Caso para la nueva página de detalle de pedido
      case 'order-detail':
        return (
          <OrderDetailPage 
            onNavigate={handleNavigate} 
            user={user} // (MODIFICADO)
            orderId={selectedOrderId} 
          />
        );

      // (NUEVO) Caso para la nueva página de categoría
      case 'category':
        return (
          <CategoryPage
            onNavigate={handleNavigate}
            groupCode={selectedGroupCode}
            onViewProductDetails={handleViewProductDetails}
          />
        );
        
      // (NUEVO) Caso para la nueva página de detalle de producto
      case 'product-detail':
        return (
          <ProductDetailPage
            onNavigate={handleNavigate}
            productId={selectedProductId}
          />
        );

      case 'voucher-upload':
        // Pasamos user del contexto
        return <VoucherUploadPage onNavigate={handleNavigate} currentUser={user} />; // (MODIFICADO)
      case 'offers':
        return <OffersPage onNavigate={handleNavigate} />;
      case 'queries':
        // Pasamos user del contexto
        return <QueriesPage onNavigate={handleNavigate} currentUser={user} />; // (MODIFICADO)
      case 'dashboard-settings': // (NUEVO)
        return <DashboardSettingsPage onNavigate={handleNavigate} currentUser={user} />; // (MODIFICADO)
      
      case 'manage-offers': // (NUEVO)
        if (user?.is_admin) { // (MODIFICADO)
          return <ManageOffersPage onNavigate={handleNavigate} currentUser={user} />; // (MODIFICADO)
        }
        // Si no es admin, lo mandamos al dashboard
        return <DashboardPage onNavigate={handleNavigate} />;

      case 'client-group-permissions': // (NUEVO)
        if (user?.is_admin) { // (MODIFICADO)
          return <ClientGroupPermissionsPage onNavigate={handleNavigate} currentUser={user} />; // (MODIFICADO)
        }
        // Si no es admin, lo mandamos al dashboard
        return <DashboardPage onNavigate={handleNavigate} />;

      case 'manage-admins': // (NUEVO)
        if (user?.is_admin) {
          return <ManageAdminsPage onNavigate={handleNavigate} />;
        }
        // Si no es admin, lo mandamos al dashboard
        return <DashboardPage onNavigate={handleNavigate} />;
      
      case 'change-password':
        return <ChangePasswordPage />;

      default:
        // Fallback si la página no se conoce
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  // (NUEVO) Mostrar un spinner o mensaje de carga mientras AuthContext está cargando
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg font-semibold text-gray-700">Cargando autenticación...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {isAuthenticated && !firstLogin && ( // (MODIFICADO) Usamos isAuthenticated de useAuth
        // El Header se renderiza aquí para todas las páginas logueadas
        <Header
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          currentUser={user} // (MODIFICADO)
        />
      )}
      <div className="page-content">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;