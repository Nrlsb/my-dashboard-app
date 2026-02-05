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
          let response = { items: [], updatedAt: null };
          try {
            const data = await apiService.getCart();
            if (data && data.items) {
              response = data;
            } else if (Array.isArray(data)) {
              // Backward compatibility for old cache
              response = { items: data, updatedAt: null };
            }
          } catch (apiError) {
            console.error('[CartContext] Error fetching remote cart:', apiError);
            if (isMounted) {
              setCart(localCart);
              setIsLoaded(true);
            }
            return;
          }

          const remoteCart = response.items;
          const remoteUpdatedAt = response.updatedAt ? new Date(response.updatedAt).getTime() : 0;
          const localLastSyncedAt = Number(localStorage.getItem(`shopping-cart-last-synced-${user.id}`)) || 0;

          // 3. Merge Logic
          let finalCart = [];

          if (remoteUpdatedAt > localLastSyncedAt) {
            // Remote is newer (someone else deleted or changed things). 
            // Trust remote completely.
            finalCart = remoteCart;
          } else {
            // Local is same age or newer (maybe offline changes here).
            // Proceed with merge (Union).
            const mergedMap = new Map();

            // A. Add Remote Items (Source of Truth for what already exists)
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

            finalCart = Array.from(mergedMap.values());
          }

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
        apiService.updateCart(cart)
          .then(res => {
            if (res && res.updatedAt) {
              localStorage.setItem(`shopping-cart-last-synced-${user.id}`, new Date(res.updatedAt).getTime());
            }
          })
          .catch(err =>
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
