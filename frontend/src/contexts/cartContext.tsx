/* eslint-disable react-refresh/only-export-components */
import { useAuth } from "./authContext";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CartItem, CartProduct } from "../services/cartLocalService";
import {
  addGuestCartItem,
  clearGuestCart,
  readGuestCart,
  removeGuestCartItem,
  removeOneGuestCartItem,
} from "../services/cartLocalService";
import {
  addToServerCart,
  clearServerCart,
  fetchServerCart,
  removeItemFromServerCart,
  removeOneFromServerCart,
} from "../services/cartService";

type CartContextValue = {
  count: number;
  items: CartItem[];
  addOne: (productId: number, product?: CartProduct) => Promise<void>;
  addMany: (
    items: Array<{
      productId: number;
      quantity: number;
    }>,
  ) => Promise<void>;
  removeOne: (productId: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clear: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();

  const [guestItems, setGuestItems] = useState<CartItem[]>(() =>
    readGuestCart(),
  );
  const [serverItems, setServerItems] = useState<CartItem[]>([]);

  const items = isLoggedIn ? serverItems : guestItems;
  const count = items.reduce((total, item) => total + item.quantity, 0);

  const refreshCart = useCallback(async () => {
  if (!isLoggedIn) return;
  setServerItems(await fetchServerCart());
}, [isLoggedIn]);

  const mergeGuestCartToServer = async () => {
    if (!isLoggedIn) return;

    const localItems = readGuestCart();

    if (localItems.length === 0) {
      await refreshCart();
      return;
    }

    await clearServerCart(); // Écraser le panier serveur

    for (const item of localItems) {
      await addToServerCart(item.productId, item.quantity);
    }

    clearGuestCart();
    setGuestItems([]);
    await refreshCart();
  };

  const value: CartContextValue = {
    count,
    items,
    refreshCart,

    addOne: async (productId: number, product?: CartProduct) => {
      if (!isLoggedIn) {
        if (!product) {
          throw new Error(
            "Les informations du produit sont requises pour un invité",
          );
        }

        setGuestItems(addGuestCartItem(productId, product));
        return;
      }

      await addToServerCart(productId, 1);
      await refreshCart();
    },

    addMany: async (cartItems) => {
      if (!isLoggedIn) {
        throw new Error("Vous devez être connecté pour ajouter une transaction au panier.");
      }

      for (const item of cartItems) {
        await addToServerCart(item.productId, item.quantity);
      }

      await refreshCart();
    },


    removeOne: async (productId: number) => {
      if (!isLoggedIn) {
        setGuestItems(removeOneGuestCartItem(productId));
        return;
      }

      await removeOneFromServerCart(productId);
      await refreshCart();
    },

    removeItem: async (productId: number) => {
      if (!isLoggedIn) {
        setGuestItems(removeGuestCartItem(productId));
        return;
      }

      await removeItemFromServerCart(productId);
      await refreshCart();
    },

    clear: async () => {
      if (!isLoggedIn) {
        clearGuestCart();
        setGuestItems([]);
        return;
      }

      await clearServerCart();
      await refreshCart();
    },
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const run = async () => {
      try {
        await mergeGuestCartToServer();
      } catch (error) {
        console.error("Erreur lors de la fusion du panier:", error);
      }
    };

    void run();
  }, [isLoggedIn]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error(
      "useCart doit être utilisé à l’intérieur de <CartProvider>.",
    );
  }

  return ctx;
}
