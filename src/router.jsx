import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import App from './App';
import { ProtectedRoute, AdminRoute, MarketingRoute, LoadingFallback, PublicRoute, ClientRoute } from './components/RouteGuards';


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
const ClientProductPermissionsPage = lazy(() => import('./pages/ClientProductPermissionsPage.jsx'));
const ManageAdminsPage = lazy(() => import('./pages/ManageAdminsPage.jsx'));
const ManageContentPage = lazy(() => import('./pages/ManageContentPage.jsx'));
const CollectionPage = lazy(() => import('./pages/CollectionPage.jsx'));
const VendedorDashboardPage = lazy(() => import('./pages/VendedorDashboardPage.jsx'));
const VendedorClientsPage = lazy(() => import('./pages/VendedorClientsPage.jsx'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage.jsx'));
const VendedorAccountBalancePage = lazy(() => import('./pages/VendedorAccountBalancePage.jsx'));
const VendedorOrderHistoryPage = lazy(() => import('./pages/VendedorOrderHistoryPage.jsx'));
const ImageUpload = lazy(() => import('./components/ImageUpload.jsx'));

// Error Element for Dashboard
const DashboardError = () => (
    <div className="text-center p-8 text-red-500">
        No se pudieron cargar los paneles del dashboard.
    </div>
);

import { useAuth } from './context/AuthContext';

// --- Redirect Component based on Role ---
const RootRedirect = () => {
    const { user, isAuthenticated } = useAuth();
    if (isAuthenticated && user?.role === 'vendedor') {
        return <Navigate to="/vendedor-dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
};

import GlobalErrorElement from './components/GlobalErrorElement';

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/" element={<App />} errorElement={<GlobalErrorElement />}>
            {/* Rutas Públicas */}
            <Route path="login" element={
                <PublicRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <LoginPage />
                    </Suspense>
                </PublicRoute>
            } />
            <Route path="register" element={
                <PublicRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <RegisterPage />
                    </Suspense>
                </PublicRoute>
            } />
            <Route path="change-password" element={
                <Suspense fallback={<LoadingFallback />}>
                    <ChangePasswordPage />
                </Suspense>
            } />

            {/* Rutas Protegidas */}
            <Route index element={<RootRedirect />} />

            <Route path="dashboard" element={
                <ProtectedRoute>
                    <ClientRoute>
                        <Suspense fallback={<LoadingFallback />}>
                            <DashboardPage />
                        </Suspense>
                    </ClientRoute>
                </ProtectedRoute>
            }
            />

            <Route path="vendedor-dashboard" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <VendedorDashboardPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="vendedor-clients" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <VendedorClientsPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="vendedor-cuentas-corrientes" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <VendedorAccountBalancePage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="vendedor-pedidos-ventas" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <OrderHistoryPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="vendedor-price-list" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <PriceListPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="profile" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ProfilePage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="price-list" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <PriceListPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="new-order" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <NewOrderPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="order-preview" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <OrderPreviewPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="order-history" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <OrderHistoryPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="order-detail/:orderId" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <OrderDetailPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="category/:groupCode" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <CategoryPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="product-detail/:productId" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ProductDetailPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="account-balance" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <AccountBalancePage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="voucher-upload" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <VoucherUploadPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="offers" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <OffersPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="queries" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <QueriesPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="dashboard-settings" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <DashboardSettingsPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="collection/:collectionId" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <CollectionPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            {/* Rutas de Administrador */}
            <Route path="manage-offers" element={
                <MarketingRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ManageOffersPage />
                    </Suspense>
                </MarketingRoute>
            } />

            <Route path="client-group-permissions" element={
                <AdminRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ClientGroupPermissionsPage />
                    </Suspense>
                </AdminRoute>
            } />

            <Route path="client-product-permissions" element={
                <AdminRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ClientProductPermissionsPage />
                    </Suspense>
                </AdminRoute>
            } />

            <Route path="manage-admins" element={
                <AdminRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ManageAdminsPage />
                    </Suspense>
                </AdminRoute>
            } />

            <Route path="manage-content" element={
                <MarketingRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ManageContentPage />
                    </Suspense>
                </MarketingRoute>
            } />

            <Route path="upload-images" element={
                <AdminRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ImageUpload />
                    </Suspense>
                </AdminRoute>
            } />

            <Route path="*" element={<RootRedirect />} />
        </Route>
    )
);

export default router;
