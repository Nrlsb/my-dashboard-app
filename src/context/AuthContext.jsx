import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../api/apiService'; // Importar el apiService

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firstLogin, setFirstLogin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          apiService.setAuthToken(token); // Configurar token en el servicio
          setIsAuthenticated(true);
          setUser(parsedUser);
        } catch (e) {
          console.error('Failed to parse user from localStorage', e);
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          apiService.setAuthToken(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiService.login({ email, password });

      if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        apiService.setAuthToken(data.token); // Configurar token en el servicio
        setIsAuthenticated(true);
        setUser(data.user);
        if (data.first_login) {
          setFirstLogin(true);
        }
        setLoading(false);
        return data;
      } else {
        // El login falló, asegúrate de limpiar cualquier estado residual
        logout();
        console.error('Login failed:', data.message);
        setLoading(false);
        return data;
      }
    } catch (error) {
      logout();
      console.error('Error during login API call:', error);
      setLoading(false);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    apiService.setAuthToken(null); // Limpiar token del servicio
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
