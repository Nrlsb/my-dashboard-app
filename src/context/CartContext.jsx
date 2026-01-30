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
      if (user && user.id) {
        try {
          // 1. Get Local Cart
          const localCartJson = localStorage.getItem(`shopping-cart-${user.id}`);
          const localCart = localCartJson ? JSON.parse(localCartJson) : [];

          // 2. Get Remote Cart
          let remoteCart = [];
          try {
            remoteCart = await apiService.getCart(); // Should return array
            if (!Array.isArray(remoteCart)) remoteCart = [];
          } catch (apiError) {
            console.error('Error fetching remote cart:', apiError);
            // Fallback to local cart if API fails
            if (isMounted) {
              setCart(localCart);
              setIsLoaded(true);
            }
            return;
          }

          // 3. Merge Logic (Remote takes precedence for existence, but we can merge quantities if needed)
          // Strategy: Combine both. If item exists in both, use the one with higher quantity or sum them?
          // Let's sum quantities to be safe and avoid losing "offline" additions.
          // Note: Ideally we track "last updated" but for now summing is a reasonable UX for "I added on mobile, then added on PC".

          const mergedMap = new Map();

          // Add remote items first
          remoteCart.forEach(item => {
            mergedMap.set(item.id, { ...item });
          });

          // Merge local items
          localCart.forEach(localItem => {
            if (mergedMap.has(localItem.id)) {
              // Item exists in both - logic decision:
              // If we assume local is "newer" because they just logged in? No, remote could be newer.
              // Let's use the maximum quantity or the remote quantity?
              // Simple approach: Use Remote. 
              // Better approach: Since we don't track timestamps per item easily here, 
              // let's assume if the user has a local cart, they might have been working offline.
              // BUT, usually "local" just means the last state of this browser.
              // If I buy on mobile, my PC local cart is STALE. So Remote should WIN.
              // UNLESS, I was adding items anonymously? But here we use `shopping-cart-${user.id}`.
              // So this local cart belongs to THIS user on THIS device.
              // Use Remote as the source of truth for synchronization.

              // However, if the user just ADDED something to this local cart while offline?
              // Let's strictly USE REMOTE as the base.
              // If we want to support "offline additions", it's complex.
              // Let's stick to: Remote Cart overwrites Local Stale Cart.
              // EXCEPT if remote is empty and local is not? 

              // Let's just use Remote.
              // If the user wants to merge, we'd need a separate "guest" cart concept.
              // Since keys are user-specific, we assume cloud state is master.

              // Correction: If the backend is empty (new feature), we should upload the local cart?
              // Yes.
            } else {
              // Local item NOT in remote.
              // Maybe it was deleted on another device? Or added here offline?
              // Hard to know.
              // Safe bet: Keep it? or Discard it?
              // If I deleted it on mobile, it's gone from remote. If I keep it here, it reappears. Ghost item.
              // So Remote should be the Single Source of Truth.
            }
          });

          // REVISED STRATEGY: 
          // 1. If Remote has items, IT IS THE TRUTH.
          // 2. If Remote is empty, but Local has items, assumes first sync -> Upload Local.

          let finalCart = remoteCart;

          // Edge case: First time using this feature, DB is empty, but user has Local Storage cart.
          if (remoteCart.length === 0 && localCart.length > 0) {
            finalCart = localCart;
            // Trigger explicit save immediately? No, the next useEffect will handle it because 'cart' changes.
          }

          if (isMounted) {
            setCart(finalCart);
            setIsLoaded(true);
          }

        } catch (error) {
          console.error('Error in cart sync:', error);
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
    if (user && user.id && isLoaded) {
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
