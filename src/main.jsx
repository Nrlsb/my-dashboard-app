import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx'; // Import AuthProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// (NUEVO) Importar los estilos globales
import './App.css';

// 1. Crear una instancia de QueryClient
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Envolver la app con QueryClientProvider */}
    <QueryClientProvider client={queryClient}>
      <AuthProvider> {/* Wrap with AuthProvider */}
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);