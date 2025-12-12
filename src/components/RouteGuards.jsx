import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner';

// --- Componente de Carga para Suspense ---
export const LoadingFallback = () => (
    <LoadingSpinner text="Cargando..." />
);

// --- Componente para Rutas Protegidas ---
export const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <LoadingFallback />;
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// --- Componente para Rutas de Administrador ---
export const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <LoadingFallback />;
    return user?.is_admin ? children : <Navigate to="/dashboard" replace />;
};

// --- Componente para Rutas con Permisos Específicos ---
export const PermissionRoute = ({ children, permission }) => {
    const { loading, hasPermission } = useAuth();
    if (loading) return <LoadingFallback />;
    return hasPermission(permission) ? children : <Navigate to="/dashboard" replace />;
};

// --- Componente para Rutas de Marketing ---
export const MarketingRoute = ({ children }) => {
    const { user, loading, hasPermission } = useAuth();
    if (loading) return <LoadingFallback />;
    // Allow if user is admin OR has marketing role OR has specific permissions
    if (user?.is_admin || user?.role === 'marketing' || hasPermission('manage_content') || hasPermission('manage_offers')) {
        return children;
    }
    return <Navigate to="/dashboard" replace />;
};

// --- Componente para Rutas de Clientes (No Vendedores) ---
export const ClientRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <LoadingFallback />;
    // Si es vendedor, redirigir a su dashboard
    if (user?.role === 'vendedor') {
        return <Navigate to="/vendedor-dashboard" replace />;
    }
    // Si no es vendedor (es cliente o admin), permitir acceso
    return children;
};

// --- Componente para Rutas Públicas (Redirige si ya está autenticado) ---
export const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading, user } = useAuth();
    if (loading) return <LoadingFallback />;

    if (isAuthenticated) {
        if (user?.role === 'vendedor') {
            return <Navigate to="/vendedor-dashboard" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};
