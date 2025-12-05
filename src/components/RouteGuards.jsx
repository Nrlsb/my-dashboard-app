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

// --- Componente para Rutas de Marketing ---
export const MarketingRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <LoadingFallback />;
    // Allow if user is admin OR has marketing role
    return (user?.is_admin || user?.role === 'marketing') ? children : <Navigate to="/dashboard" replace />;
};
