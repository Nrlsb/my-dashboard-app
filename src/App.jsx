import React from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// --- Contexto y Componentes ---
import { useAuth } from './context/AuthContext.jsx';
import { useCart } from './context/CartContext.jsx';
import Header from './components/Header.jsx';
import { Outlet } from 'react-router-dom';
// import AppRoutes from './AppRoutes.jsx'; // Removed

import AnalyticsTracker from './components/AnalyticsTracker';

// --- Componente Raíz ---
function App() {
  const { isAuthenticated, user, loading, logout, firstLogin } = useAuth();
  const { clearCart } = useCart();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    clearCart();
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
      {isAuthenticated && !firstLogin && (
        <Header onLogout={handleLogout} currentUser={user} />
      )}
      <div className="page-content p-6 max-w-6xl mx-auto my-5 w-full box-border">
        <Outlet context={{ onCompleteOrder: handleCompleteOrder }} />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
