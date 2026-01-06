import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import App from './App';
import { lazyImport } from './utils/lazyImport';
import { ProtectedRoute, AdminRoute, MarketingRoute, LoadingFallback, PublicRoute, ClientRoute, PermissionRoute, VisibilityRoute } from './components/RouteGuards';


// --- Carga diferida (Lazy Loading) de Páginas ---
import LoginPage from './pages/LoginPage.jsx';
// const LoginPage = lazyImport(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazyImport(() => import('./pages/RegisterPage.jsx'));
const DashboardPage = lazyImport(() => import('./pages/DashboardPage.jsx'));
const NewOrderPage = lazyImport(() => import('./pages/NewOrderPage.jsx'));
const OrderHistoryPage = lazyImport(() => import('./pages/OrderHistoryPage.jsx'));
const PriceListPage = lazyImport(() => import('./pages/PriceListPage.jsx'));
const ProductsPage = lazyImport(() => import('./pages/ProductsPage.jsx'));
const OffersPage = lazyImport(() => import('./pages/OffersPage.jsx'));
const AccountBalancePage = lazyImport(() => import('./pages/AccountBalancePage.jsx'));
const QueriesPage = lazyImport(() => import('./pages/QueriesPage.jsx'));
const VoucherUploadPage = lazyImport(() => import('./pages/VoucherUploadPage.jsx'));
const ProfilePage = lazyImport(() => import('./pages/ProfilePage.jsx'));
const OrderPreviewPage = lazyImport(() => import('./pages/OrderPreviewPage.jsx'));
const OrderDetailPage = lazyImport(() => import('./pages/OrderDetailPage.jsx'));
const CategoryPage = lazyImport(() => import('./pages/CategoryPage.jsx'));
const ProductDetailPage = lazyImport(() => import('./pages/ProductDetailPage.jsx'));
const DashboardSettingsPage = lazyImport(() => import('./pages/DashboardSettingsPage.jsx'));
const ManageOffersPage = lazyImport(() => import('./pages/ManageOffersPage.jsx'));
const ClientGroupPermissionsPage = lazyImport(() => import('./pages/ClientGroupPermissionsPage.jsx'));
const ClientProductPermissionsPage = lazyImport(() => import('./pages/ClientProductPermissionsPage.jsx'));
const ManageAdminsPage = lazyImport(() => import('./pages/ManageAdminsPage.jsx'));
const ManageContentPage = lazyImport(() => import('./pages/ManageContentPage.jsx'));
const CollectionPage = lazyImport(() => import('./pages/CollectionPage.jsx'));
const VendedorDashboardPage = lazyImport(() => import('./pages/VendedorDashboardPage.jsx'));
const VendedorClientsPage = lazyImport(() => import('./pages/VendedorClientsPage.jsx'));
const ChangePasswordPage = lazyImport(() => import('./pages/ChangePasswordPage.jsx'));
const VendedorAccountBalancePage = lazyImport(() => import('./pages/VendedorAccountBalancePage.jsx'));
const VendedorOrderHistoryPage = lazyImport(() => import('./pages/VendedorOrderHistoryPage.jsx'));
const ImageUpload = lazyImport(() => import('./components/ImageUpload.jsx'));
const AdminAnalyticsPage = lazyImport(() => import('./pages/AdminAnalyticsPage.jsx'));
const AboutPage = lazyImport(() => import('./pages/AboutPage.jsx'));
const NewReleasesPage = lazyImport(() => import('./pages/NewReleasesPage.jsx'));
const ManageNewReleasesPage = lazyImport(() => import('./pages/ManageNewReleasesPage.jsx'));

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

            <Route path="about" element={
                <Suspense fallback={<LoadingFallback />}>
                    <AboutPage />
                </Suspense>
            } />

            <Route path="new-releases" element={
                <Suspense fallback={<LoadingFallback />}>
                    <NewReleasesPage />
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
                    <VisibilityRoute path="price-list">
                        <Suspense fallback={<LoadingFallback />}>
                            <PriceListPage />
                        </Suspense>
                    </VisibilityRoute>
                </ProtectedRoute>
            } />

            <Route path="products" element={
                <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ProductsPage />
                    </Suspense>
                </ProtectedRoute>
            } />

            <Route path="new-order" element={
                <ProtectedRoute>
                    <VisibilityRoute path="new-order">
                        <Suspense fallback={<LoadingFallback />}>
                            <NewOrderPage />
                        </Suspense>
                    </VisibilityRoute>
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
                    <VisibilityRoute path="order-history">
                        <Suspense fallback={<LoadingFallback />}>
                            <OrderHistoryPage />
                        </Suspense>
                    </VisibilityRoute>
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
                    <VisibilityRoute path="account-balance">
                        <Suspense fallback={<LoadingFallback />}>
                            <AccountBalancePage />
                        </Suspense>
                    </VisibilityRoute>
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
                    <VisibilityRoute path="offers">
                        <Suspense fallback={<LoadingFallback />}>
                            <OffersPage />
                        </Suspense>
                    </VisibilityRoute>
                </ProtectedRoute>
            } />

            <Route path="queries" element={
                <ProtectedRoute>
                    <VisibilityRoute path="queries">
                        <Suspense fallback={<LoadingFallback />}>
                            <QueriesPage />
                        </Suspense>
                    </VisibilityRoute>
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

            <Route path="manage-new-releases" element={
                <MarketingRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ManageNewReleasesPage />
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
                <PermissionRoute permission="manage_admins">
                    <Suspense fallback={<LoadingFallback />}>
                        <ManageAdminsPage />
                    </Suspense>
                </PermissionRoute>
            } />

            <Route path="manage-content" element={
                <MarketingRoute>
                    <Suspense fallback={<LoadingFallback />}>
                        <ManageContentPage />
                    </Suspense>
                </MarketingRoute>
            } />

            <Route path="analytics" element={
                <PermissionRoute permission="view_analytics">
                    <Suspense fallback={<LoadingFallback />}>
                        <AdminAnalyticsPage />
                    </Suspense>
                </PermissionRoute>
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
