import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request } from "express";

jest.mock("../../services/cart.service", () => ({
  __esModule: true,
  CartError: class CartError extends Error {
    code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT";
    constructor(
      code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT",
      message: string,
    ) {
      super(message);
      this.code = code;
    }
  },
  addToCart: jest.fn(),
  getCart: jest.fn(),
  removeOneFromCart: jest.fn(),
  removeItemFromCart: jest.fn(),
  clearCart: jest.fn(),
}));

import * as cartService from "../../services/cart.service";
import { CartError } from "../../services/cart.service";
import {
  addToCartController,
  clearCartController,
  getCartController,
  removeItemFromCartController,
  removeOneFromCartController,
} from "../../controllers/cart.controller";

type MockReq = {
  session?: any;
  cookies?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
};

const makeReqRes = (reqOverrides?: MockReq) => {
  const req = {
    session: {},
    cookies: {},
    body: {},
    params: {},
    ...reqOverrides,
  } as unknown as Request;

  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.cookie = jest.fn(() => res);
  res.clearCookie = jest.fn(() => res);

  return { req, res };
};

describe("CartController", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Vérifie que sans cookie ni session, le service getCart n'est pas appelé
  // et que la réponse est un panier vide.
  it("getCartController_NoCookie_ReturnsEmptyCartWithoutServiceCall", async () => {
    const { req, res } = makeReqRes();

    await getCartController(req, res);

    expect(cartService.getCart).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      cartId: null,
      items: [],
      count: 0,
    });
  });

  // Vérifie que sans identité, un cookie invité est créé et posé sur la réponse.
  it("getCartController_NoIdentity_SetGuestCookie", async () => {
    const { req, res } = makeReqRes();

    await getCartController(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "cart_guest_id",
      expect.any(String),
      {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
      },
    );
  });

  // Vérifie que le cookie invité existant est transmis au service getCart.
  it("getCartController_WithGuestCookie_CallsGetCartWithGuestId", async () => {
    const fakeCart = {
      cartId: 1,
      items: [{ productId: 1, quantity: 2 }],
      count: 2,
    };

    (cartService.getCart as unknown as jest.Mock).mockImplementation(
      async () => fakeCart,
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
    });

    await getCartController(req, res);

    expect(cartService.getCart).toHaveBeenCalledTimes(1);
    expect(cartService.getCart).toHaveBeenCalledWith({ guestId: "guest-123" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeCart);
  });

  // Vérifie qu'une erreur inattendue du service retourne un statut 500.
  it("getCartController_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (cartService.getCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new Error("Cart error");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
    });

    await getCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });

  // Vérifie que sans cookie, un guestId est généré, posé en cookie,
  // et transmis au service addToCart.
  it("addToCartController_NoCookie_CreatesCookie_AndCallsServiceWithGuestId", async () => {
    const serviceResult = {
      cartId: 123,
      item: { cartId: 123, productId: 1, quantity: 2 },
    };
    const updatedCart = {
      cartId: 123,
      items: [{ productId: 1, quantity: 2 }],
      count: 2,
    };

    (cartService.addToCart as unknown as jest.Mock).mockImplementation(
      async () => serviceResult,
    );
    (cartService.getCart as unknown as jest.Mock).mockImplementation(
      async () => updatedCart,
    );

    const { req, res } = makeReqRes({
      body: { productId: 1, quantity: 2 },
      cookies: {},
    });

    await addToCartController(req, res);

    expect(res.cookie).toHaveBeenCalledTimes(1);
    const firstCall = (res.cookie as jest.Mock).mock.calls[0] as any[];
    const cookieName = firstCall[0];
    const guestId = firstCall[1];

    expect(cookieName).toBe("cart_guest_id");
    expect(typeof guestId).toBe("string");

    expect(cartService.addToCart).toHaveBeenCalledTimes(1);
    expect(cartService.addToCart).toHaveBeenCalledWith({
      guestId,
      productId: 1,
      quantity: 2,
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Produit ajouté au panier",
      ...serviceResult,
      cart: updatedCart,
    });
  });

  // Vérifie que le cookie invité existant est réutilisé sans en créer un nouveau.
  it("addToCartController_WithCookie_UsesExistingGuestId", async () => {
    const serviceResult = {
      cartId: 123,
      item: { cartId: 123, productId: 1, quantity: 2 },
    };
    const updatedCart = {
      cartId: 123,
      items: [{ productId: 1, quantity: 2 }],
      count: 2,
    };

    (cartService.addToCart as unknown as jest.Mock).mockImplementation(
      async () => serviceResult,
    );
    (cartService.getCart as unknown as jest.Mock).mockImplementation(
      async () => updatedCart,
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: 1, quantity: 2 },
    });

    await addToCartController(req, res);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(cartService.addToCart).toHaveBeenCalledWith({
      guestId: "guest-123",
      productId: 1,
      quantity: 2,
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Produit ajouté au panier",
      ...serviceResult,
      cart: updatedCart,
    });
  });

  // Vérifie que le userId de session est prioritaire sur le cookie invité.
  it("addToCartController_WithUserId_UsesSessionUserId", async () => {
    const serviceResult = {
      cartId: 1,
      item: { cartId: 1, productId: 1, quantity: 1 },
    };
    const updatedCart = { cartId: 1, items: [], count: 1 };

    (cartService.addToCart as unknown as jest.Mock).mockImplementation(
      async () => serviceResult,
    );
    (cartService.getCart as unknown as jest.Mock).mockImplementation(
      async () => updatedCart,
    );

    const { req, res } = makeReqRes({
      session: { userId: "user-abc" },
      body: { productId: 1, quantity: 1 },
    });

    await addToCartController(req, res);

    expect(cartService.addToCart).toHaveBeenCalledWith({
      userId: "user-abc",
      productId: 1,
      quantity: 1,
    });
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Vérifie que quantity vaut 1 par défaut quand elle est absente du body.
  it("addToCartController_NoQuantityInBody_DefaultsToOne", async () => {
    const serviceResult = {
      cartId: 1,
      item: { cartId: 1, productId: 1, quantity: 1 },
    };
    const updatedCart = { cartId: 1, items: [], count: 1 };

    (cartService.addToCart as unknown as jest.Mock).mockImplementation(
      async () => serviceResult,
    );
    (cartService.getCart as unknown as jest.Mock).mockImplementation(
      async () => updatedCart,
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: 1 },
    });

    await addToCartController(req, res);

    expect(cartService.addToCart).toHaveBeenCalledWith({
      guestId: "guest-123",
      productId: 1,
      quantity: 1,
    });
  });

  // Vérifie que CartError NOT_FOUND est mappée en statut HTTP 404.
  it("addToCartController_CartErrorNotFound_Returns404", async () => {
    (cartService.addToCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new CartError("NOT_FOUND", "Produit introuvable");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: 999, quantity: 1 },
    });

    await addToCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Produit introuvable" });
  });

  // Vérifie que CartError BAD_REQUEST est mappée en statut HTTP 400.
  it("addToCartController_CartErrorBadRequest_Returns400", async () => {
    (cartService.addToCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new CartError("BAD_REQUEST", "productId invalide");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: -1, quantity: 1 },
    });

    await addToCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "productId invalide" });
  });

  // Vérifie que CartError CONFLICT est mappée en statut HTTP 409.
  it("addToCartController_CartErrorConflict_Returns409", async () => {
    (cartService.addToCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new CartError(
          "CONFLICT",
          "Stock insuffisant: 10 disponible(s), 8 déjà au panier",
        );
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: 1, quantity: 5 },
    });

    await addToCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Stock insuffisant: 10 disponible(s), 8 déjà au panier",
    });
  });

  // Vérifie qu'une erreur inattendue retourne un statut 500.
  it("addToCartController_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (cartService.addToCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new Error("Unexpected");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: 1, quantity: 1 },
    });

    await addToCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });

  // Vérifie que removeOneFromCart est appelé et que le panier mis à jour est retourné.
  it("removeOneFromCartController_Success_Returns200WithUpdatedCart", async () => {
    const updatedCart = {
      cartId: 1,
      items: [{ productId: 1, quantity: 1 }],
      count: 1,
    };

    (cartService.removeOneFromCart as unknown as jest.Mock).mockImplementation(
      async () => {},
    );
    (cartService.getCart as unknown as jest.Mock).mockImplementation(
      async () => updatedCart,
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: 1 },
    });

    await removeOneFromCartController(req, res);

    expect(cartService.removeOneFromCart).toHaveBeenCalledWith({
      guestId: "guest-123",
      productId: 1,
    });
    expect(cartService.getCart).toHaveBeenCalledWith({ guestId: "guest-123" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Quantite retiree",
      cart: updatedCart,
    });
  });

  // Vérifie que CartError NOT_FOUND est mappée en statut HTTP 404.
  it("removeOneFromCartController_CartErrorNotFound_Returns404", async () => {
    (cartService.removeOneFromCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new CartError("NOT_FOUND", "Produit absent du panier");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: 999 },
    });

    await removeOneFromCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Produit absent du panier",
    });
  });

  // Vérifie qu'une erreur inattendue retourne un statut 500.
  it("removeOneFromCartController_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (cartService.removeOneFromCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new Error("Unexpected");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      body: { productId: 1 },
    });

    await removeOneFromCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });

  // Vérifie que removeItemFromCart est appelé et que le panier mis à jour est retourné.
  it("removeItemFromCartController_Success_Returns200WithUpdatedCart", async () => {
    const updatedCart = { cartId: 1, items: [], count: 0 };

    (cartService.removeItemFromCart as unknown as jest.Mock).mockImplementation(
      async () => {},
    );
    (cartService.getCart as unknown as jest.Mock).mockImplementation(
      async () => updatedCart,
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      params: { productId: "1" },
    });

    await removeItemFromCartController(req, res);

    expect(cartService.removeItemFromCart).toHaveBeenCalledWith({
      guestId: "guest-123",
      productId: 1,
    });
    expect(cartService.getCart).toHaveBeenCalledWith({ guestId: "guest-123" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Produit retire",
      cart: updatedCart,
    });
  });

  // Vérifie que CartError NOT_FOUND est mappée en statut HTTP 404.
  it("removeItemFromCartController_CartErrorNotFound_Returns404", async () => {
    (cartService.removeItemFromCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new CartError("NOT_FOUND", "Produit absent du panier");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      params: { productId: "999" },
    });

    await removeItemFromCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Produit absent du panier",
    });
  });

  // Vérifie qu'une erreur inattendue retourne un statut 500.
  it("removeItemFromCartController_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (cartService.removeItemFromCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new Error("Unexpected");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
      params: { productId: "1" },
    });

    await removeItemFromCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });

  // Vérifie que clearCart est appelé et que la réponse contient un panier vide statique.
  it("clearCartController_Success_Returns200WithEmptyCart", async () => {
    (cartService.clearCart as unknown as jest.Mock).mockImplementation(
      async () => {},
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
    });

    await clearCartController(req, res);

    expect(cartService.clearCart).toHaveBeenCalledWith({
      guestId: "guest-123",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Panier vide",
      cart: { cartId: null, items: [], count: 0 },
    });
  });

  // Vérifie qu'une erreur inattendue retourne un statut 500.
  it("clearCartController_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (cartService.clearCart as unknown as jest.Mock).mockImplementation(
      async () => {
        throw new Error("Unexpected");
      },
    );

    const { req, res } = makeReqRes({
      cookies: { cart_guest_id: "guest-123" },
    });

    await clearCartController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });
});
