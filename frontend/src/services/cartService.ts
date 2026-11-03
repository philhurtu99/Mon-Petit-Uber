import { API_URL } from "../config";
import type { CartItem } from "./cartLocalService";
import { readGuestCart } from "./cartLocalService";

export interface PromotionDiscount {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  originalTotal: number;
  finalTotal: number;
  savings: number;
  appliedPromotions: string[];
}

export interface PromotionalBonus {
  bonusProductId: number;
  bonusProductName: string;
  bonusQuantity: number;
  triggerProductId: number;
  triggerProductName: string;
  promotionName: string;
  bonusImageUrl?: string;
}

export interface CartWithPromotions {
  cartId: number | null;
  count: number;
  total: number;
  totalSavings: number;
  items: PromotionDiscount[];
  bonuses: PromotionalBonus[];
}

type ServerCartResponse = {
  cartId: number | null;
  count: number;
  items?: Array<{
    productId?: number;
    quantity?: number;
    product?: {
      id?: number;
      name?: string;
      description?: string;
      imageUrl?: string;
      price?: number;
      finalPrice?: number;
      stock?: number;
      sale?: number;
    };
  }>;
};

export function normalizeServerCartItems(data: ServerCartResponse): CartItem[] {
  return (data.items ?? [])
    .map((item) => ({
      productId: item.productId ?? item.product?.id ?? 0,
      quantity: item.quantity ?? 0,
      product: {
        id: item.product?.id ?? 0,
        name: item.product?.name ?? "",
        description: item.product?.description ?? "",
        imageUrl: item.product?.imageUrl ?? "",
        price: item.product?.price ?? 0,
        finalPrice: item.product?.finalPrice ?? item.product?.price ?? 0,
        stock: item.product?.stock ?? 0,
        sale: item.product?.sale ?? 0,
      },
    }))
    .filter(
      (item) => item.productId > 0 && item.quantity > 0 && item.product.id > 0,
    );
}

async function getErrorMessage(res: Response, fallback: string) {
  const data = (await res.json().catch(() => null)) as {
    message?: string;
  } | null;
  return data?.message ?? fallback;
}

export async function fetchServerCart(): Promise<CartItem[]> {
  const res = await fetch(`${API_URL}/api/cart/getCart`, {
    credentials: "include",
  });

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as ServerCartResponse;
  return normalizeServerCartItems(data);
}
let syncPromise: Promise<void> | null = null;

/**
 * Synchronise le panier localStorage (invité) avec le serveur
 * Utile pour que le backend puisse appliquer les promotions avec le guestId
 */
export async function syncGuestCartToServer(
  guestItems: CartItem[],
): Promise<void> {
  if (!guestItems || guestItems.length === 0) {
    return;
  }

  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      // D'abord, vider le panier serveur existant
      try {
        const clearRes = await fetch(`${API_URL}/api/cart/clear`, {
          method: "POST",
          credentials: "include",
        });
        if (clearRes.ok) {
        }
      } catch (err) {
        console.warn(
          "[syncGuestCartToServer] Failed to clear server cart:",
          err,
        );
      }

      // Envoyer tous les items au serveur
      for (const item of guestItems) {
        const res = await fetch(`${API_URL}/api/cart/addToCart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
          }),
        });

        if (!res.ok) {
          console.warn(
            `[syncGuestCartToServer] Failed to sync item ${item.productId}: HTTP ${res.status}`,
          );
        }
      }
    } catch (err) {
      console.error("[syncGuestCartToServer] Error syncing guest cart:", err);
    }
  })();

  try {
    await syncPromise;
  } finally {
    syncPromise = null;
  }
}

export async function fetchServerCartWithPromotions(): Promise<CartWithPromotions | null> {
  try {
    const res = await fetch(`${API_URL}/api/cart/cartWithPromotions`, {
      credentials: "include",
    });

    if (!res.ok) {
      console.error(
        `[fetchServerCartWithPromotions] HTTP ${res.status}:`,
        res.statusText,
      );
      return null;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[fetchServerCartWithPromotions] Fetch error:", err);
    return null;
  }
}

export async function addToServerCart(productId: number, quantity = 1) {
  const res = await fetch(`${API_URL}/api/cart/addToCart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ productId, quantity }),
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Impossible d'ajouter au panier"),
    );
  }
}

export async function removeOneFromServerCart(productId: number) {
  const res = await fetch(`${API_URL}/api/cart/removeOne`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ productId }),
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Impossible de retirer du panier"),
    );
  }
}

export async function removeItemFromServerCart(productId: number) {
  const res = await fetch(`${API_URL}/api/cart/removeItem/${productId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Impossible de supprimer l'article"),
    );
  }
}

export async function clearServerCart() {
  const res = await fetch(`${API_URL}/api/cart/clear`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Impossible de vider le panier"),
    );
  }
}
