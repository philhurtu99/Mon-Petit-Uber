import { Request, Response } from "express";
import {
  addToCart,
  CartError,
  clearCart,
  getCart,
  getCartWithPromotions,
  removeItemFromCart,
  removeOneFromCart,
  type CartIdentity,
} from "../services/cart.service";
import { randomUUID } from "crypto";

const GUEST_COOKIE_NAME = "cart_guest_id";

function getCartIdentity(req: Request): CartIdentity {
  const userId = (req as any).session?.userId as string | undefined;
  const guestId = req.cookies?.[GUEST_COOKIE_NAME] as string | undefined;

  return userId ? { userId } : guestId ? { guestId } : {};
}

function setGuestCookie(res: Response, guestId: string) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  });
}

function handleCartError(res: Response, err: unknown, logLabel: string) {
  if (err instanceof CartError) {
    const status =
      err.code === "BAD_REQUEST" ? 400 : err.code === "NOT_FOUND" ? 404 : 409;

    res.status(status).json({ message: err.message });
    return;
  }

  console.error(logLabel, err);
  res.status(500).json({ message: "Erreur serveur" });
}

export const getCartController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const identity = getCartIdentity(req);

    if (!identity.userId && !identity.guestId) {
      const guestId = randomUUID();
      setGuestCookie(res, guestId);

      res.status(200).json({ cartId: null, items: [], count: 0 });
      return;
    }

    const cart = await getCart(identity);
    res.status(200).json(cart);
  } catch (err) {
    handleCartError(res, err, "Erreur getCartController:");
  }
};

export const addToCartController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { productId, quantity } = req.body as {
      productId: number;
      quantity?: number;
    };

    let identity = getCartIdentity(req);

    if (!identity.userId && !identity.guestId) {
      const guestId = randomUUID();
      setGuestCookie(res, guestId);
      identity = { guestId };
    }

    const result = await addToCart({
      ...identity,
      productId: Number(productId),
      quantity: Number(quantity ?? 1),
    });

    const updatedCart = await getCart(identity);

    res.status(201).json({
      message: "Produit ajouté au panier",
      ...result,
      cart: updatedCart,
    });
  } catch (err) {
    handleCartError(res, err, "Erreur addToCartController:");
  }
};

export const removeOneFromCartController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { productId } = req.body as { productId: number };
    const identity = getCartIdentity(req);

    await removeOneFromCart({
      ...identity,
      productId: Number(productId),
    });

    const cart = await getCart(identity);

    res.status(200).json({ message: "Quantite retiree", cart });
  } catch (err) {
    handleCartError(res, err, "Erreur removeOneFromCartController:");
  }
};

export const removeItemFromCartController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const productId = Number(req.params.productId);
    const identity = getCartIdentity(req);

    await removeItemFromCart({
      ...identity,
      productId,
    });

    const cart = await getCart(identity);

    res.status(200).json({ message: "Produit retire", cart });
  } catch (err) {
    handleCartError(res, err, "Erreur removeItemFromCartController:");
  }
};

export const clearCartController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const identity = getCartIdentity(req);

    await clearCart(identity);

    res.status(200).json({
      message: "Panier vide",
      cart: { cartId: null, items: [], count: 0 },
    });
  } catch (err) {
    handleCartError(res, err, "Erreur clearCartController:");
  }
};

export const getCartWithPromotionsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const identity = getCartIdentity(req);

    if (!identity.userId && !identity.guestId) {
      const guestId = randomUUID();
      setGuestCookie(res, guestId);

      res.status(200).json({
        cartId: null,
        items: [],
        count: 0,
        total: 0,
        totalSavings: 0,
        bonuses: [],
      });
      return;
    }

    const cartWithPromos = await getCartWithPromotions(identity);

    res.status(200).json(cartWithPromos);
  } catch (err) {
    handleCartError(res, err, "Erreur getCartWithPromotionsController:");
  }
};
