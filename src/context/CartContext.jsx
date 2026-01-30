import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../api/apiService';

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

  // Load cart when user changes (Sync Logic)
  useEffect(() => {
    let isMounted = true;

    const loadCart = async () => {
      // Don't sync for sellers
      if (user?.role === 'vendedor') {
        setCart([]);
        setIsLoaded(true);
        return;
      }

      if (user && user.id) {
        try {
          // 1. Get Local Cart
          const localCartJson = localStorage.getItem(`shopping-cart-${user.id}`);
          const localCart = localCartJson ? JSON.parse(localCartJson) : [];

          // 2. Get Remote Cart
          let remoteCart = [];
          try {
            remoteCart = await apiService.getCart();
            // Ensure array
            if (!Array.isArray(remoteCart)) {
              remoteCart = [];
            }
          } catch (apiError) {
            console.error('[CartContext] Error fetching remote cart:', apiError);
            if (isMounted) {
              setCart(localCart);
              setIsLoaded(true);
            }
            return;
          }

          // 3. Merge Logic (Union: Remote items + Local items not in remote)
          const mergedMap = new Map();

          // A. Add Remote Items (Source of Truth)
          remoteCart.forEach(item => {
            mergedMap.set(item.id, { ...item });
          });

          // B. Add Local Items (Offline additions)
          localCart.forEach(localItem => {
            if (!mergedMap.has(localItem.id)) {
              // Item ONLY in Local. Add to merge.
              mergedMap.set(localItem.id, { ...localItem });
            }
          });

          // Convert Map to Array
          let finalCart = Array.from(mergedMap.values());

          if (isMounted) {
            setCart(finalCart);
            setIsLoaded(true);
          }

        } catch (error) {
          console.error('[CartContext] Critical error in cart sync:', error);
          if (isMounted) setIsLoaded(true);
        }
      } else {
        setCart([]);
        setIsLoaded(false);
      }
    };

    loadCart();

    return () => { isMounted = false; };
  }, [user]);

  // Persist cart changes to localStorage AND Backend
  useEffect(() => {
    if (user && user.id && isLoaded && user.role !== 'vendedor') {
      // 1. Save to LocalStorage (Instant backup)
      try {
        localStorage.setItem(`shopping-cart-${user.id}`, JSON.stringify(cart));
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }

      // 2. Save to Backend (Debounced)
      const saveToBackend = setTimeout(() => {
        apiService.updateCart(cart).catch(err =>
          console.error('Failed to sync cart to backend:', err)
        );
      }, 2000); // 2 seconds debounce

      return () => clearTimeout(saveToBackend);
    }
  }, [cart, user, isLoaded]);

  // Lógica centralizada para manejar el carrito
  const addToCart = (product, quantity) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        const otherItems = prevCart.filter((item) => item.id !== product.id);
        const updatedItem = { ...existingItem, quantity: existingItem.quantity + quantity };
        return [updatedItem, ...otherItems];
      } else {
        return [{ ...product, quantity }, ...prevCart];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    const numQuantity = parseInt(quantity, 10);
    // Permitir 0 para borrar? O manejarlo en el componente?
    // Aquí el código original permitía 0 y borraba.
    if (isNaN(numQuantity) || numQuantity < 0) return;

    setCart(
      (prevCart) =>
        prevCart
          .map((item) =>
            item.id === productId ? { ...item, quantity: numQuantity } : item
          )
          .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const value = {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
