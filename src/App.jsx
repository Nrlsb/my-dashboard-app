import React from 'react';
import LoadingSpinner from './components/LoadingSpinner';
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

import Footer from './components/Footer';

// --- Componente Raíz ---
function App() {
  const { isAuthenticated, user, loading, logout, firstLogin } = useAuth();
  const { clearCart } = useCart();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    // clearCart(); // Removed to persist cart on logout
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
      {isAuthenticated && !firstLogin && (
        <Header onLogout={handleLogout} currentUser={user} />
      )}
      <div className="page-content p-2 w-[95%] mx-auto my-2 box-border flex-grow">
        <Outlet context={{ onCompleteOrder: handleCompleteOrder }} />
      </div>
      {location.pathname !== '/login' && <Footer />}
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
