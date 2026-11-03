import { useEffect, useState } from "react";
import type {
  CartWithPromotions,
  PromotionDiscount,
  PromotionalBonus,
} from "../services/cartService";
import { fetchServerCartWithPromotions } from "../services/cartService";
import { useCart } from "../contexts/cartContext";

interface UseCartPromotionsResult {
  cartData: CartWithPromotions | null;
  loading: boolean;
  error: string | null;
  totalSavings: number;
  discountedItems: PromotionDiscount[];
  bonusItems: PromotionalBonus[];
  refetch: () => Promise<void>;
}

/**
 * Hook pour récupérer les données du panier avec les promotions appliquées.
 * Se met à jour automatiquement chaque fois que le panier change.
 */
export function useCartPromotions(): UseCartPromotionsResult {
  const { items } = useCart();
  const [cartData, setCartData] = useState<CartWithPromotions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchServerCartWithPromotions();
      setCartData(data);
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement du panier";
      setError(errorMsg);
      console.error(
        "[useCartPromotions] Error fetching cart with promotions:",
        err,
      );
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les promotions au premier rendu
  useEffect(() => {
    fetchCart();
  }, []);

  // Mettre à jour les promotions chaque fois que le panier change
  useEffect(() => {
    if (items.length === 0) {
      setCartData(null);
      return;
    }

    // Utiliser un petit délai pour éviter les appels API répétés trop rapidement
    const timer = setTimeout(() => {
      fetchCart();
    }, 300);

    return () => clearTimeout(timer);
  }, [items]);

  return {
    cartData,
    loading,
    error,
    totalSavings: cartData?.totalSavings ?? 0,
    discountedItems: cartData?.items ?? [],
    bonusItems: cartData?.bonuses ?? [],
    refetch: fetchCart,
  };
}
