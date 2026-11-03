import type { Product } from "../models";

export type CartProduct = Pick<
  Product,
  | "id"
  | "name"
  | "description"
  | "imageUrl"
  | "price"
  | "stock"
  | "finalPrice"
  | "sale"
>;

export type CartItem = {
  productId: number;
  quantity: number;
  product: CartProduct;
};

const LOCAL_CART_KEY = "guest_cart";

export function toCartProduct(product: Product): CartProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    price: product.price,
    stock: product.stock,
    finalPrice: product.finalPrice,
    sale: product.sale,
  };
}

export function readGuestCart(): CartItem[] {
  const raw = localStorage.getItem(LOCAL_CART_KEY);

  if (!raw) return [];

  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export function writeGuestCart(items: CartItem[]) {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
}

export function clearGuestCart() {
  localStorage.removeItem(LOCAL_CART_KEY);
}

export function addGuestCartItem(
  productId: number,
  product: CartProduct,
  quantity = 1,
): CartItem[] {
  const quantityToAdd = Math.max(1, quantity);
  const currentItems = readGuestCart();
  const existingItem = currentItems.find(
    (item) => item.productId === productId,
  );

  const existingQty = existingItem?.quantity ?? 0;

  if (existingQty + quantityToAdd > product.stock) {
    throw new Error(
      `Stock insuffisant: ${product.stock} disponible(s), ${existingQty} déjà au panier`,
    );
  }

  const nextItems = existingItem
    ? currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + quantityToAdd, product }
          : item,
      )
    : [...currentItems, { productId, quantity: quantityToAdd, product }];

  writeGuestCart(nextItems);
  return nextItems;
}

export function removeOneGuestCartItem(productId: number): CartItem[] {
  const nextItems = readGuestCart()
    .map((item) =>
      item.productId === productId
        ? { ...item, quantity: item.quantity - 1 }
        : item,
    )
    .filter((item) => item.quantity > 0);

  writeGuestCart(nextItems);
  return nextItems;
}

export function removeGuestCartItem(productId: number): CartItem[] {
  const nextItems = readGuestCart().filter(
    (item) => item.productId !== productId,
  );
  writeGuestCart(nextItems);
  return nextItems;
}
