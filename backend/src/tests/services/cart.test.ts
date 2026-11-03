import { prismaMock } from "../prismaMock";
import {
  addToCart,
  clearCart,
  getCart,
  removeItemFromCart,
  removeOneFromCart,
} from "../../services/cart.service";
import { describe, expect, it } from "@jest/globals";

describe("CartServiceTests", () => {
  // Teste que addToCart lève une erreur si productId est invalide
  it("AddToCart_ShouldThrowBadRequest_WhenProductIdInvalid", async () => {
    await expect(
      addToCart({ guestId: "guest-1", productId: -1, quantity: 1 }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "productId invalide",
    });
  });

  // Teste que addToCart lève une erreur si la quantité est invalide
  it("AddToCart_ShouldThrowBadRequest_WhenQuantityInvalid", async () => {
    await expect(
      addToCart({ guestId: "guest-1", productId: 1, quantity: -1 }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "quantity invalide",
    });
  });

  // Teste que addToCart lève une erreur si le produit est introuvable
  it("AddToCart_ShouldThrowNotFound_WhenProductNotFound", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(
      addToCart({ guestId: "guest-1", productId: 1, quantity: 1 }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Produit introuvable",
    });
  });

  // Teste que addToCart lève une erreur conflit si le produit est "idle"/ en pause
  it("AddToCart_ShouldThrowConflict_WhenProductIdle", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 1,
      idle: true,
      stock: 10,
    } as any);

    await expect(
      addToCart({ guestId: "guest-1", productId: 1, quantity: 1 }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Produit indisponible",
    });
  });

  // Teste que addToCart lève une erreur si userId/guestId sont manquants
  it("AddToCart_ShouldThrowBadRequest_WhenGuestIdMissing", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 1,
      idle: false,
      stock: 10,
    } as any);

    await expect(
      addToCart({ productId: 1, quantity: 1 }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "userId ou guestId requis",
    });
  });

  // Teste que addToCart lève une erreur si la quantité demandée dépasse le stock
  it("AddToCart_ShouldThrowConflict_WhenQuantityExceedsStock", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 1,
      idle: false,
      stock: 10,
    } as any);

    prismaMock.cart.findFirst.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue({ quantity: 5 } as any);

    await expect(
      addToCart({ guestId: "guest-1", productId: 1, quantity: 6 }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Stock insuffisant: 10 disponible(s), 5 déjà au panier",
    });
  });

  // Teste que addToCart ajoute le produit au panier avec succès
  it("AddToCart_ShouldAddToCart_WhenValid", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 1,
      idle: false,
      stock: 10,
    } as any);

    prismaMock.cart.findFirst.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue(null);
    prismaMock.cartItem.upsert.mockResolvedValue({
      cartId: 1,
      productId: 1,
      quantity: 1,
    } as any);

    const result = await addToCart({
      guestId: "guest-1",
      productId: 1,
      quantity: 1,
    });

    expect(result).toEqual({
      cartId: 1,
      item: { cartId: 1, productId: 1, quantity: 1 },
    });
  });

  // Teste que getCart retourne un panier vide si il n'y a pas de userId/guestId
  it("GetCart_ShouldReturnEmpty_WhenNoUserIdGuestId", async () => {
    const result = await getCart({});

    expect(result).toEqual({
      cartId: null,
      items: [],
      count: 0,
    });
  });

  // Teste que getCart retourne un panier vide si le panier est introuvable
  it("GetCart_ShouldReturnEmpty_WhenCartNotFound", async () => {
    prismaMock.cart.findFirst.mockResolvedValue(null);

    const result = await getCart({ guestId: "guest-1" });

    expect(result).toEqual({
      cartId: null,
      items: [],
      count: 0,
    });
  });

  // Teste que getCart retourne le panier avec les produits si le panier est trouvé
  it("GetCart_ShouldReturnCart_WhenCartFound", async () => {
    prismaMock.cart.findFirst.mockResolvedValue({
      id: 1,
      items: [{ productId: 1, quantity: 1 }],
    } as any);

    const result = await getCart({ guestId: "guest-1" });

    expect(result).toEqual({
      cartId: 1,
      items: [{ productId: 1, quantity: 1 }],
      count: 1,
    });
  });

  // Teste que removeOneFromCart lève NOT_FOUND si le panier est introuvable
  it("RemoveOneFromCart_ShouldThrowNotFound_WhenCartNotFound", async () => {
    prismaMock.cart.findFirst.mockResolvedValue(null);

    await expect(
      removeOneFromCart({ guestId: "guest-1", productId: 1 }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Panier introuvable",
    });
  });

  // Teste que removeOneFromCart lève NOT_FOUND si le produit est absent du panier
  it("RemoveOneFromCart_ShouldThrowNotFound_WhenItemNotFound", async () => {
    prismaMock.cart.findFirst.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue(null);

    await expect(
      removeOneFromCart({ guestId: "guest-1", productId: 1 }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Produit absent du panier",
    });
  });

  // Teste que removeOneFromCart décrémente la quantité si elle est > 1
  it("RemoveOneFromCart_ShouldDecrement_WhenQuantityAboveOne", async () => {
    prismaMock.cart.findFirst.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue({ quantity: 3 } as any);
    prismaMock.cartItem.update.mockResolvedValue({} as any);

    await removeOneFromCart({ guestId: "guest-1", productId: 1 });

    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
      where: { cartId_productId: { cartId: 1, productId: 1 } },
      data: { quantity: { decrement: 1 } },
    });
    expect(prismaMock.cartItem.delete).not.toHaveBeenCalled();
  });

  // Teste que removeOneFromCart supprime l'item si la quantité est 1
  it("RemoveOneFromCart_ShouldDelete_WhenQuantityIsOne", async () => {
    prismaMock.cart.findFirst.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue({ quantity: 1 } as any);
    prismaMock.cartItem.delete.mockResolvedValue({} as any);

    await removeOneFromCart({ guestId: "guest-1", productId: 1 });

    expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({
      where: { cartId_productId: { cartId: 1, productId: 1 } },
    });
    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  // Teste que removeItemFromCart lève NOT_FOUND si le panier est introuvable
  it("RemoveItemFromCart_ShouldThrowNotFound_WhenCartNotFound", async () => {
    prismaMock.cart.findFirst.mockResolvedValue(null);

    await expect(
      removeItemFromCart({ guestId: "guest-1", productId: 1 }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Panier introuvable",
    });
  });

  // Teste que removeItemFromCart lève NOT_FOUND si le produit est absent du panier
  it("RemoveItemFromCart_ShouldThrowNotFound_WhenItemNotFound", async () => {
    prismaMock.cart.findFirst.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue(null);

    await expect(
      removeItemFromCart({ guestId: "guest-1", productId: 1 }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Produit absent du panier",
    });
  });

  // Teste que removeItemFromCart supprime l'item entièrement quelle que soit la quantité
  it("RemoveItemFromCart_ShouldDelete_WhenItemExists", async () => {
    prismaMock.cart.findFirst.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue({ quantity: 5 } as any);
    prismaMock.cartItem.delete.mockResolvedValue({} as any);

    await removeItemFromCart({ guestId: "guest-1", productId: 1 });

    expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({
      where: { cartId_productId: { cartId: 1, productId: 1 } },
    });
  });

  // Teste que clearCart ne fait rien si le panier est introuvable
  it("ClearCart_ShouldDoNothing_WhenCartNotFound", async () => {
    prismaMock.cart.findFirst.mockResolvedValue(null);

    await clearCart({ guestId: "guest-1" });

    expect(prismaMock.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  // Teste que clearCart supprime tous les items du panier
  it("ClearCart_ShouldDeleteAllItems_WhenCartExists", async () => {
    prismaMock.cart.findFirst.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 3 } as any);

    await clearCart({ guestId: "guest-1" });

    expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 1 },
    });
  });

  // Teste que addToCart crée un nouveau panier via guestId quand aucun panier n'existe encore
  it("AddToCart_ShouldCreateCart_WhenNoExistingCartWithGuestId", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 1,
      idle: false,
      stock: 10,
    } as any);

    prismaMock.cart.findFirst.mockResolvedValue(null);
    prismaMock.cart.create.mockResolvedValue({ id: 99 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue(null);
    prismaMock.cartItem.upsert.mockResolvedValue({
      cartId: 99,
      productId: 1,
      quantity: 1,
    } as any);

    const result = await addToCart({ guestId: "guest-new", productId: 1, quantity: 1 });

    expect(prismaMock.cart.create).toHaveBeenCalledWith({ data: { guestId: "guest-new" } });
    expect(result).toEqual({ cartId: 99, item: { cartId: 99, productId: 1, quantity: 1 } });
  });

  // Teste que addToCart fonctionne avec un userId (crée le panier lié à l'utilisateur)
  it("AddToCart_ShouldAddToCart_WhenValidWithUserId", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 1,
      idle: false,
      stock: 10,
    } as any);

    prismaMock.cart.findFirst.mockResolvedValue(null);
    prismaMock.cart.create.mockResolvedValue({ id: 1 } as any);
    prismaMock.cartItem.findUnique.mockResolvedValue(null);
    prismaMock.cartItem.upsert.mockResolvedValue({
      cartId: 1,
      productId: 1,
      quantity: 1,
    } as any);

    const result = await addToCart({
      userId: "user-1",
      productId: 1,
      quantity: 1,
    });

    expect(prismaMock.cart.create).toHaveBeenCalledWith({
      data: { userId: "user-1" },
    });
    expect(result).toEqual({
      cartId: 1,
      item: { cartId: 1, productId: 1, quantity: 1 },
    });
  });

  // Teste que getCart retourne le panier avec les produits quand l'identité est un userId
  it("GetCart_ShouldReturnCart_WhenCartFoundWithUserId", async () => {
    prismaMock.cart.findFirst.mockResolvedValue({
      id: 1,
      items: [{ productId: 1, quantity: 2 }],
    } as any);

    const result = await getCart({ userId: "user-1" });

    expect(result).toEqual({
      cartId: 1,
      items: [{ productId: 1, quantity: 2 }],
      count: 2,
    });
  });

  // Teste que clearCart ne fait rien quand aucune identité n'est fournie
  it("ClearCart_ShouldDoNothing_WhenNoIdentity", async () => {
    await clearCart({});

    expect(prismaMock.cartItem.deleteMany).not.toHaveBeenCalled();
  });
});
