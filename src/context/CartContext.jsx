import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// 1. Crear el Contexto
const CartContext = createContext();

// 2. Crear un hook personalizado para consumir el contexto fácilmente
export const useCart = () => {
  return useContext(CartContext);
};

// 3. Crear el Proveedor del Contexto
export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart when user changes
  useEffect(() => {
    if (user && user.id) {
      try {
        const storedCart = localStorage.getItem(`shopping-cart-${user.id}`);
        if (storedCart) {
          setCart(JSON.parse(storedCart));
        } else {
          setCart([]);
        }
      } catch (error) {
        console.error('Error reading cart from localStorage:', error);
        setCart([]);
      }
      setIsLoaded(true);
    } else {
      setCart([]); // Clear cart view on logout
      setIsLoaded(false);
    }
  }, [user]);

  // Persist cart changes to localStorage (user-scoped)
  useEffect(() => {
    if (user && user.id && isLoaded) {
      try {
        localStorage.setItem(`shopping-cart-${user.id}`, JSON.stringify(cart));
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }
  }, [cart, user, isLoaded]);

  // Lógica centralizada para manejar el carrito
  const addToCart = (product, quantity) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        // Si ya existe, lo quitamos de su posición actual y lo ponemos al inicio con la nueva cantidad
        const otherItems = prevCart.filter((item) => item.id !== product.id);
        const updatedItem = { ...existingItem, quantity: existingItem.quantity + quantity };
        return [updatedItem, ...otherItems];
      } else {
        // Si es nuevo, lo agregamos al inicio
        return [{ ...product, quantity }, ...prevCart];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity < 0) return; // Evita cantidades inválidas

    setCart(
      (prevCart) =>
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

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
