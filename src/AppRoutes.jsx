import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { useAuth } from './context/AuthContext.jsx';

// --- Carga diferida (Lazy Loading) de Páginas ---
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const NewOrderPage = lazy(() => import('./pages/NewOrderPage.jsx'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage.jsx'));
const PriceListPage = lazy(() => import('./pages/PriceListPage.jsx'));
const OffersPage = lazy(() => import('./pages/OffersPage.jsx'));
const AccountBalancePage = lazy(() => import('./pages/AccountBalancePage.jsx'));
const QueriesPage = lazy(() => import('./pages/QueriesPage.jsx'));
const VoucherUploadPage = lazy(() => import('./pages/VoucherUploadPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const OrderPreviewPage = lazy(() => import('./pages/OrderPreviewPage.jsx'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage.jsx'));
const CategoryPage = lazy(() => import('./pages/CategoryPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const DashboardSettingsPage = lazy(() => import('./pages/DashboardSettingsPage.jsx'));
const ManageOffersPage = lazy(() => import('./pages/ManageOffersPage.jsx'));
const ClientGroupPermissionsPage = lazy(() => import('./pages/ClientGroupPermissionsPage.jsx'));
const ManageAdminsPage = lazy(() => import('./pages/ManageAdminsPage.jsx'));
const VendedorDashboardPage = lazy(() => import('./pages/VendedorDashboardPage.jsx'));
const VendedorClientsPage = lazy(() => import('./pages/VendedorClientsPage.jsx'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage.jsx'));
const VendedorAccountBalancePage = lazy(() => import('./pages/VendedorAccountBalancePage.jsx'));
const VendedorOrderHistoryPage = lazy(() => import('./pages/VendedorOrderHistoryPage.jsx'));

// --- Componente de Carga para Suspense ---
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-100">
    <div className="text-lg font-semibold text-gray-700">Cargando...</div>
  </div>
);

// --- Componente para Rutas Protegidas ---
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// --- Componente para Rutas de Administrador ---
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return user?.is_admin ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes({ onCompleteOrder }) {
  const { isAuthenticated, user, firstLogin } = useAuth(); // Se extraen del hook de autenticación

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to={firstLogin ? '/change-password' : (user?.role === 'vendedor' ? '/vendedor-dashboard' : '/dashboard')} replace />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" replace />} />

        {/* Ruta para Cambio de Contraseña Obligatorio */}
        <Route path="/change-password" element={isAuthenticated && firstLogin ? <ChangePasswordPage /> : <Navigate to="/login" replace />} />

        {/* Rutas Protegidas */}
        <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute>{user?.role === 'vendedor' ? <VendedorDashboardPage /> : <DashboardPage />}</ProtectedRoute>} />
        <Route path="/vendedor-dashboard" element={<ProtectedRoute>{user?.role === 'vendedor' ? <VendedorDashboardPage /> : <Navigate to="/dashboard" />}</ProtectedRoute>} />
        <Route path="/vendedor-clients" element={<ProtectedRoute>{user?.role === 'vendedor' ? <VendedorClientsPage /> : <Navigate to="/dashboard" />}</ProtectedRoute>} />
        <Route path="/vendedor-cuentas-corrientes" element={<ProtectedRoute>{user?.role === 'vendedor' ? <VendedorAccountBalancePage /> : <Navigate to="/dashboard" />}</ProtectedRoute>} />
        <Route path="/vendedor-pedidos-ventas" element={<ProtectedRoute>{user?.role === 'vendedor' ? <OrderHistoryPage /> : <Navigate to="/dashboard" />}</ProtectedRoute>} />
        <Route path="/vendedor-price-list" element={<ProtectedRoute>{user?.role === 'vendedor' ? <PriceListPage /> : <Navigate to="/dashboard" />}</ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/price-list" element={<ProtectedRoute><PriceListPage /></ProtectedRoute>} />
        <Route path="/new-order" element={<ProtectedRoute><NewOrderPage /></ProtectedRoute>} />
        <Route path="/order-preview" element={<ProtectedRoute><OrderPreviewPage onCompleteOrder={onCompleteOrder} /></ProtectedRoute>} />
        <Route path="/order-history" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
        <Route path="/order-detail/:orderId" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
        <Route path="/category/:groupCode" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
        <Route path="/product-detail/:productId" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
        <Route path="/account-balance" element={<ProtectedRoute><AccountBalancePage /></ProtectedRoute>} />
        <Route path="/voucher-upload" element={<ProtectedRoute><VoucherUploadPage /></ProtectedRoute>} />
        <Route path="/offers" element={<ProtectedRoute><OffersPage /></ProtectedRoute>} />
        <Route path="/queries" element={<ProtectedRoute><QueriesPage /></ProtectedRoute>} />
        <Route path="/dashboard-settings" element={<ProtectedRoute><DashboardSettingsPage /></ProtectedRoute>} />

        {/* Rutas de Administrador */}
        <Route path="/manage-offers" element={<AdminRoute><ManageOffersPage /></AdminRoute>} />
        <Route path="/client-group-permissions" element={<AdminRoute><ClientGroupPermissionsPage currentUser={user} /></AdminRoute>} />
        <Route path="/manage-admins" element={<AdminRoute><ManageAdminsPage /></AdminRoute>} />

        {/* Fallback - Redirigir al dashboard si está logueado, si no al login */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
