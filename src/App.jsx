import React from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import SessionExpiredModal from './components/SessionExpiredModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/ScrollToTop';

// --- Contexto y Componentes ---
import { useAuth } from './context/AuthContext.jsx';
import { useCart } from './context/CartContext.jsx';
import Header from './components/Header.jsx';
import { Outlet } from 'react-router-dom';
// import AppRoutes from './AppRoutes.jsx'; // Removed

import AnalyticsTracker from './components/AnalyticsTracker';
import ErrorBoundary from './components/ErrorBoundary';

import Footer from './components/Footer';
import PublicHeader from './components/PublicHeader';
import NovedadesNotification from './components/NovedadesNotification';

// --- Componente Raíz ---
function App() {
  const { isAuthenticated, user, loading, logout, firstLogin } = useAuth();
  const { clearCart } = useCart();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const location = useLocation();
  const [isSessionExpired, setIsSessionExpired] = React.useState(false);

  const isPublicCatalogRoute = [
    '/catalogo',
    '/solicitar-acceso',
    '/products',
    '/category',
    '/product-detail',
    '/offers',
    '/brands',
    '/new-releases'
  ].some(path => location.pathname.startsWith(path));

  React.useEffect(() => {
    const handleSessionExpired = () => {
      if (isPublicCatalogRoute) {
        // Silently logout and clear sensitive state, allowing guest browsing
        logout();
      } else {
        setIsSessionExpired(true);
      }
    };

    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [isPublicCatalogRoute, logout]);

  const handleExpiredConfirm = () => {
    setIsSessionExpired(false);
    handleLogout();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCompleteOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
    queryClient.invalidateQueries({ queryKey: ['accountBalance'] });
    clearCart();
    navigate('/order-history');
  };

  if (loading) {
    return <LoadingSpinner text="Iniciando aplicación..." />;
  }

  return (
    <div className="app-container flex flex-col min-h-screen">
      <AnalyticsTracker />
      <ScrollToTop />
      {isPublicCatalogRoute && !isAuthenticated && (
        <PublicHeader />
      )}
      {isAuthenticated && !firstLogin && (
        <Header onLogout={handleLogout} currentUser={user} />
      )}
      <div className="page-content p-2 w-[95%] mx-auto my-2 box-border flex-grow">
        <ErrorBoundary>
          <Outlet context={{ onCompleteOrder: handleCompleteOrder }} />
        </ErrorBoundary>
      </div>
      {location.pathname !== '/login' && <Footer />}
      {isAuthenticated && !firstLogin && ['cliente', 'test_user'].includes(user?.role) && (
        <NovedadesNotification />
      )}
      <Toaster position="top-right" />
      <SessionExpiredModal
        isOpen={isSessionExpired}
        onConfirm={handleExpiredConfirm}
      />
    </div>
  );

}

export default App;
