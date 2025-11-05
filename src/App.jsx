import React, { useState } from 'react';

// --- Importar Páginas ---
import LoginPage from '/src/pages/LoginPage.jsx';
import RegisterPage from '/src/pages/RegisterPage.jsx'; // (NUEVO) Importar Registro
import DashboardPage from '/src/pages/DashboardPage.jsx';
import NewOrderPage from '/src/pages/NewOrderPage.jsx';
import OrderHistoryPage from '/src/pages/OrderHistoryPage.jsx';
import PriceListPage from '/src/pages/PriceListPage.jsx';
import OffersPage from '/src/pages/OffersPage.jsx';
import AccountBalancePage from '/src/pages/AccountBalancePage.jsx';
import QueriesPage from '/src/pages/QueriesPage.jsx';
import VoucherUploadPage from '/src/pages/VoucherUploadPage.jsx'; 

// --- Componente Raíz (Maneja la autenticación y navegación) ---
// Este es el componente principal que decide qué página mostrar.
export default function App() {
  // Estado para manejar la vista actual: 'login', 'dashboard', 'newOrder', etc.
  const [currentView, setCurrentView] = useState('login');

  // Función para cambiar de vista
  const navigateTo = (view) => {
    setCurrentView(view);
  };

  // Renderizado condicional basado en la vista
  
  // 1. Vista de Login
  if (currentView === 'login') {
    // (ACTUALIZADO) Pasamos 'onNavigate' para el enlace de "Regístrate aquí"
    return <LoginPage onLoginSuccess={() => navigateTo('dashboard')} onNavigate={navigateTo} />;
  }

  // (NUEVO) Vista de Registro
  if (currentView === 'register') {
    return <RegisterPage onNavigate={navigateTo} />;
  }

  // 2. Vista de Dashboard
  if (currentView === 'dashboard') {
    return <DashboardPage onNavigate={navigateTo} />;
  }
  
  // 3. Vista de Nuevo Pedido
  if (currentView === 'newOrder') {
    return <NewOrderPage onNavigate={navigateTo} />;
  }

  // 4. Vista de Histórico
  if (currentView === 'orderHistory') {
    return <OrderHistoryPage onNavigate={navigateTo} />;
  }

  // 5. Vista de Lista de Precios
  if (currentView === 'priceList') {
    return <PriceListPage onNavigate={navigateTo} />;
  }

  // 6. Vista de Ofertas
  if (currentView === 'offers') {
    return <OffersPage onNavigate={navigateTo} />;
  }

  // 7. Vista de Cuenta Corriente
  if (currentView === 'accountBalance') {
    return <AccountBalancePage onNavigate={navigateTo} />;
  }

  // 8. Vista de Consultas
  if (currentView === 'queries') {
    return <QueriesPage onNavigate={navigateTo} />;
  }

  // 9. Vista de Carga de Comprobantes
  if (currentView === 'voucherUpload') {
    return <VoucherUploadPage onNavigate={navigateTo} />;
  }

  // Fallback por si acaso: si la vista no se reconoce, vuelve al login.
  return <LoginPage onLoginSuccess={() => navigateTo('dashboard')} onNavigate={navigateTo} />;
}