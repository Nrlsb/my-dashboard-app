import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import { CartProvider } from './context/CartContext.jsx'; // Importamos el provider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 5. Envolvemos la App con el CartProvider */}
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>
);