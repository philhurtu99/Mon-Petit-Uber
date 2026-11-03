import { useCart } from "../../contexts/cartContext";
import type { CartProduct } from "../../services/cartLocalService";
import { API_URL } from "../../config";
import { useState } from "react";
import "./cart.css";
import { useCartPromotions } from "../../hooks/useCartPromotions";
import { PromotionSummary } from "../../components/promotions/PromotionSummary";

export default function CartPage() {
  const { items, removeOne, addOne, removeItem } = useCart();
  const { cartData, totalSavings, loading, error } = useCartPromotions();
  const [maxReached, setMaxReached] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"livraison" | "ramassage">("livraison");

  // Fonction qui gère le clic sur +, vérifie si le produit a atteint sa limite
  const showMaxReached = (productId: number) => {
    setMaxReached((prev) => new Set(prev).add(productId));
    setTimeout(() => {
      setMaxReached((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }, 3000);
  };

  const handleAddOne = async (productId: number, product: CartProduct) => {
    try {
      await addOne(productId, product);
      const item = items.find((i) => i.productId === productId);
      if (item && item.quantity + 1 >= item.product.stock) {
        showMaxReached(productId);
      }
    } catch {
      showMaxReached(productId);
    }
  };

  // Calcul du sous-total avec les promotions appliquées du serveur
  const subtotal =
    cartData?.items?.reduce((acc, item) => acc + item.finalTotal, 0) ??
    items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div className="cart__wrapper">
      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.2)",
            color: "#fca5a5",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "12px",
          }}
        >
          ⚠️ Erreur promotions: {error}
        </div>
      )}
      {loading && (
        <div
          style={{
            color: "#8dc640",
            padding: "12px",
          }}
        >
          ⏳ Chargement des promotions...
        </div>
      )}
      <div className="cart__header">
        <div>
          <h1 className="cart__title">Mon panier</h1>
          <p className="cart__subtitle">{items.length} article(s)</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="cart__empty">Votre panier est vide.</p>
      ) : (
        <div className="cart__layout">
          <ul className="cart__list">
            {items.map((item) => {
              const imgSrc = item.product.imageUrl?.startsWith("http")
                ? item.product.imageUrl
                : `${API_URL}${item.product.imageUrl}`;

              // Trouver les données de promo pour ce produit dans cartData
              const promoItem = cartData?.items?.find(
                (i) => i.productId === item.productId,
              );
              const finalTotal =
                promoItem?.finalTotal ?? item.product.price * item.quantity;
              const itemSavings = promoItem?.savings ?? 0;

              return (
                <li key={item.productId} className="cart__row-wrapper">
                  <div className="cart__row">
                    <img
                      src={imgSrc}
                      alt={item.product.name}
                      className="cart__row-img"
                    />

                    <div className="cart__row-info">
                      <span className="cart__row-name">
                        {item.product.name}
                      </span>
                      <span className="cart__row-price">
                        {item.product.price.toFixed(2)} $
                      </span>
                    </div>

                    <div className="cart__row-qty-wrapper">
                      <div className="cart__row-qty">
                        <button
                          onClick={() => removeOne(item.productId)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() =>
                            handleAddOne(item.productId, item.product)
                          }
                          disabled={item.quantity >= item.product.stock}
                        >
                          +
                        </button>
                      </div>
                      {maxReached.has(item.productId) && (
                        <span className="cart__row-max">Stock max atteint</span>
                      )}
                    </div>

                    <span className="cart__row-total">
                      {finalTotal.toFixed(2)} $
                      {itemSavings > 0 && (
                        <span className="cart__row-savings">
                          {" "}
                          (-{itemSavings.toFixed(2)} $)
                        </span>
                      )}
                    </span>

                    <button
                      className="cart__row-delete"
                      onClick={() => removeItem(item.productId)}
                    >
                      Retirer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="cart__panel">
            {/* Afficher le résumé des promotions */}
            {cartData && cartData.items && cartData.items.length > 0 && (
              <PromotionSummary cartData={cartData} />
            )}

            {/* Option livraison / ramassage */}
            <label htmlFor="delivery-toggle" className="cart__delivery-switch">
              <input
                type="checkbox"
                id="delivery-toggle"
                checked={mode === "ramassage"}
                onChange={(e) =>
                  setMode(e.target.checked ? "ramassage" : "livraison")
                }
              />
              <span>Livraison</span>
              <span>Ramassage</span>
            </label>

            {/* Totaux */}
            <div className="cart__panel-line">
              <span>Prix avant promo</span>
              <span>
                {cartData?.items
                  ?.reduce((acc, item) => acc + item.originalTotal, 0)
                  ?.toFixed(2) ?? "0.00"}{" "}
                $
              </span>
            </div>
            {totalSavings > 0 && (
              <div className="cart__panel-line cart__panel-line--savings">
                <span>Économies</span>
                <span style={{ color: "#10b981" }}>
                  -{totalSavings.toFixed(2)} $
                </span>
              </div>
            )}
            <div className="cart__panel-line">
              <span>Sous-total</span>
              <span>{subtotal.toFixed(2)} $</span>
            </div>
            <div className="cart__panel-line">
              <span>Livraison</span>
              <span>{mode === "livraison" ? "5.00 $" : "Gratuit"}</span>
            </div>

            <div className="cart__panel-total">
              <span>Total</span>
              <span>
                {(subtotal + (mode === "livraison" ? 5 : 0)).toFixed(2)} $
              </span>
            </div>

            <button className="cart__panel-cta">Valider la commande</button>
          </div>
        </div>
      )}
    </div>
  );
}
