import React, { createContext, useContext, useState } from 'react';

// 1. Crear el Contexto
const CartContext = createContext();

// 2. Crear un hook personalizado para consumir el contexto fácilmente
export const useCart = () => {
  return useContext(CartContext);
};

// 3. Crear el Proveedor del Contexto
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Lógica centralizada para manejar el carrito
  const addToCart = (product, quantity) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        // Si el item ya existe, actualiza su cantidad
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Si es un item nuevo, lo agrega al carrito
        return [...prevCart, { ...product, quantity }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.id !== productId)
    );
  };

  const updateQuantity = (productId, quantity) => {
    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity < 0) return; // Evita cantidades inválidas

    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.id === productId ? { ...item, quantity: numQuantity } : item
        )
        .filter((item) => item.quantity > 0) // Elimina el item si la cantidad es 0
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // 4. Definir el valor que proveerá el contexto
  const value = {
    cart,
    setCart, // Incluimos setCart por si se necesita (aunque es mejor usar las funciones)
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};