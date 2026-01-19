import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner';

// --- Componente de Carga para Suspense ---
export const LoadingFallback = () => (
    <LoadingSpinner text="Cargando..." />
);

// --- Componente para Rutas que solo requieren Autenticación (sin check de password forzado) ---
export const AuthenticatedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <LoadingFallback />;
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// --- Componente para Rutas Protegidas (Estándar) ---
export const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, user } = useAuth();
    if (loading) return <LoadingFallback />;

    if (isAuthenticated) {
        if (user?.must_change_password) {
            return <Navigate to="/change-password" replace />;
        }
        return children;
    }
    return <Navigate to="/login" replace />;
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
        // [FIX] Priorizar cambio de contraseña si es requerido
        if (user?.must_change_password) {
            return <Navigate to="/change-password" replace />;
        }

        if (user?.role === 'vendedor') {
            return <Navigate to="/vendedor-dashboard" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// --- Componente para Rutas con Visibilidad Controlada ---
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService';

export const VisibilityRoute = ({ children, path }) => {
    const { user, loading: authLoading } = useAuth();

    // Utilizar useQuery para obtener los paneles, aprovechando el caché de React Query
    const { data: panels, isLoading: dashboardLoading } = useQuery({
        queryKey: ['dashboardPanels'],
        queryFn: () => apiService.getDashboardPanels(),
        staleTime: 5 * 60 * 1000, // 5 minutos
        enabled: !!user && !user.is_admin, // Solo cargar si es usuario no admin
    });

    if (authLoading) return <LoadingFallback />;

    // Si es admin, siempre tiene acceso
    if (user?.is_admin) return children;

    if (dashboardLoading) return <LoadingFallback />;

    // Normalizar el path buscado (quitar barra inicial si existe)
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    // Buscar el panel correspondiente
    // Asumimos que getDashboardPanels devuelve los paneles que el usuario PUEDE ver
    // O si devuelve todos, verificamos la propiedad is_visible
    const panel = panels?.find(p => {
        const pPath = p.navigation_path.startsWith('/') ? p.navigation_path.substring(1) : p.navigation_path;
        return pPath === normalizedPath;
    });

    // Si el panel existe y es visible (o si la API solo devuelve los visibles, la existencia basta)
    // Si la API devuelve todos, verificamos is_visible. Si no tiene propiedad is_visible, asumimos true.
    if (panel && (panel.is_visible !== false)) {
        return children;
    }

    // Si no es visible o no se encontró, redirigir al dashboard
    return <Navigate to="/dashboard" replace />;
};
