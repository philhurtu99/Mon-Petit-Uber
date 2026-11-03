import { useNavigate } from "react-router-dom";
import { useCart } from "../../contexts/cartContext";
import "./CartPopup.css";
import { API_URL } from "../../config";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/authContext";
import { readGuestCart } from "../../services/cartLocalService";
import {
  fetchServerCartWithPromotions,
  syncGuestCartToServer,
  type CartWithPromotions,
  type PromotionalBonus,
} from "../../services/cartService";
import defaultImg from "../../assets/default-avatar.png";
import { PriceDisplay } from "../common/PriceDisplay";

export function CartPopup({ onClose }: { onClose: () => void }) {
  const { items } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [bonuses, setBonuses] = useState<PromotionalBonus[]>([]);
  const [cartData, setCartData] = useState<CartWithPromotions | null>(null);

  const subtotal =
    cartData?.total ??
    items.reduce(
      (acc, item) => acc + item.quantity * item.product.finalPrice,
      0,
    );

  useEffect(() => {
    let isMounted = true;

    const loadBonuses = async () => {
      if (items.length === 0) {
        setBonuses([]);
        setCartData(null);
        return;
      }

      if (!isLoggedIn) {
        await syncGuestCartToServer(readGuestCart());
      }

      const data = await fetchServerCartWithPromotions();
      if (!isMounted) return;

      setCartData(data);

      const removedBonuses = new Set<number>(
        JSON.parse(localStorage.getItem("removedBonuses") || "[]"),
      );
      setBonuses(
        (data?.bonuses ?? []).filter(
          (bonus) => !removedBonuses.has(bonus.bonusProductId),
        ),
      );
    };

    void loadBonuses();

    return () => {
      isMounted = false;
    };
  }, [items, isLoggedIn]);

  const handleGoToCart = () => {
    onClose();
    navigate("/cart");
  };

  return (
    <div className="cart-popup">
      {items.length === 0 ? (
        <p className="cart-popup-empty">Votre panier est vide.</p>
      ) : (
        <>
          <ul className="cart-popup-list">
            {items.map((item) => {
              const imgSrc = item.product.imageUrl?.startsWith("http")
                ? item.product.imageUrl
                : `${API_URL}${item.product.imageUrl}`;
              const promoItem = cartData?.items.find(
                (promo) => promo.productId === item.productId,
              );
              const finalTotal =
                promoItem?.finalTotal ??
                item.product.finalPrice * item.quantity;

              return (
                <li key={item.productId} className="cart-popup-item">
                  <img
                    src={imgSrc}
                    alt={item.product.name}
                    className="cart-popup-img"
                  />
                  <div className="cart-popup-info">
                    <span className="cart-popup-name">{item.product.name}</span>
                    <PriceDisplay
                      price={item.product.price}
                      finalPrice={item.product.finalPrice}
                      sale={item.product.sale}
                      showBadge={true}
                    />
                    <span className="cart-popup-qty">Qté: {item.quantity}</span>
                  </div>
                  <span className="cart-popup-line-total">
                    {finalTotal.toFixed(2)} $
                  </span>
                </li>
              );
            })}
            {bonuses.map((bonus) => {
              const imgSrc = bonus.bonusImageUrl
                ? bonus.bonusImageUrl.startsWith("http")
                  ? bonus.bonusImageUrl
                  : `${API_URL}${bonus.bonusImageUrl}`
                : defaultImg;

              return (
                <li
                  key={`bonus-${bonus.bonusProductId}-${bonus.triggerProductId}`}
                  className="cart-popup-item cart-popup-item--bonus"
                >
                  <img
                    src={imgSrc}
                    alt={bonus.bonusProductName}
                    className="cart-popup-img"
                  />
                  <div className="cart-popup-info">
                    <span className="cart-popup-name">
                      {bonus.bonusProductName}
                      <span className="cart-popup-badge">Offert</span>
                    </span>
                    <span className="cart-popup-meta">
                      {bonus.bonusQuantity} × 0.00 $
                    </span>
                    <span className="cart-popup-bonus-trigger">
                      Avec {bonus.triggerProductName}
                    </span>
                  </div>
                  <span className="cart-popup-line-total">0.00 $</span>
                </li>
              );
            })}
          </ul>

          <div className="cart-popup-footer">
            <span className="cart-popup-subtotal-label">Sous-total</span>
            <span className="cart-popup-subtotal-value">
              {subtotal.toFixed(2)} $
            </span>
          </div>
        </>
      )}

      <button className="cart-popup-btn" onClick={handleGoToCart}>
        Voir le panier
      </button>
    </div>
  );
}
