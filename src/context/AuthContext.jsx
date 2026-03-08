import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiService from '../api/apiService'; // Importar el apiService

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firstLogin, setFirstLogin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Token lives in HttpOnly cookie (handled automatically by the browser).
      // We only persist the user object in localStorage for UI display purposes.
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setIsAuthenticated(true);
          setUser(parsedUser);
        } catch (e) {
          console.error('Failed to parse user from localStorage', e);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    // setLoading(true); // Removed to prevent re-render of App component
    try {
      const data = await apiService.login({ email, password });

      if (data.success && data.token) {
        // Token is stored in HttpOnly cookie by the server (no localStorage for security)
        localStorage.setItem('user', JSON.stringify(data.user));
        queryClient.clear(); // Limpiar el cache de React Query para el nuevo usuario
        setIsAuthenticated(true);
        setUser(data.user);
        if (data.first_login || data.user.must_change_password) {
          setFirstLogin(true);
        }
        // setLoading(false); // Removed
        return data;
      } else {
        // El login falló, asegúrate de limpiar cualquier estado residual
        logout();
        console.error('Login failed:', data.message);
        // setLoading(false); // Removed
        return data;
      }
    } catch (error) {
      logout();
      console.error('Error during login API call:', error);
      // setLoading(false); // Removed

      let errorMessage = 'Ocurrió un error inesperado.';

      // Priorizar el mensaje que viene del backend (errorController)
      if (error.data && error.data.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        // Si es un error de conexión o similar
        errorMessage = error.message;
      }

      // Fallback específico para 401 si no hay mensaje claro
      if (error.status === 401 && (!error.data || !error.data.message)) {
        errorMessage = 'Usuario o contraseña incorrectos.';
      }

      return { success: false, ...error.data, message: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout(); // Borrar cookie HttpOnly en el servidor
    } catch {
      // Continuar con el logout local aunque falle la llamada al servidor
    }
    localStorage.removeItem('user');
    localStorage.removeItem('authToken'); // Limpiar tokens legacy si existen
    apiService.setAuthToken(null);
    queryClient.clear(); // Limpiar el cache de React Query al cerrar sesión
    setIsAuthenticated(false);
    setUser(null);
    setFirstLogin(false);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.is_admin || (user.permissions && user.permissions.includes('all'))) return true;
    return user.permissions && user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, loading, login, logout, firstLogin, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
