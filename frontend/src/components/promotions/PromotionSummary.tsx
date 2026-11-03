import type { CartWithPromotions } from "../../services/cartService";
import { API_URL } from "../../config";
import defaultImg from "../../assets/default-avatar.png";
import "./PromotionSummary.css";
import { useState, useEffect } from "react";

interface PromotionSummaryProps {
  cartData: CartWithPromotions;
}

export function PromotionSummary({ cartData }: PromotionSummaryProps) {
  const [bonusProductImages, setBonusProductImages] = useState<
    Record<number, string>
  >({});
  const [isOpen, setIsOpen] = useState(false);

  // Récupérer les images des produits bonus
  useEffect(() => {
    if (cartData?.bonuses && cartData.bonuses.length > 0) {
      cartData.bonuses.forEach(async (bonus) => {
        if (!bonusProductImages[bonus.bonusProductId]) {
          try {
            const res = await fetch(
              `${API_URL}/api/products/getById/${bonus.bonusProductId}`,
              {
                credentials: "include",
              },
            );
            if (res.ok) {
              const product = await res.json();
              setBonusProductImages((prev) => ({
                ...prev,
                [bonus.bonusProductId]: product.imageUrl,
              }));
            } else {
              console.warn(
                `Produit bonus ${bonus.bonusProductId} non trouvé (${res.status})`,
              );
            }
          } catch (err) {
            console.error(
              `Erreur lors du fetch de l'image du produit ${bonus.bonusProductId}:`,
              err,
            );
          }
        }
      });
    }
  }, [cartData?.bonuses]);
  if (!cartData || !cartData.bonuses?.length) {
    return null;
  }

  // Retourne l'URL d'image pour un bonus
  const getBonusImage = (bonus: any) => {
    const cachedImageUrl = bonusProductImages[bonus.bonusProductId];
    if (cachedImageUrl) {
      return cachedImageUrl.startsWith("http")
        ? cachedImageUrl
        : `${API_URL}${cachedImageUrl}`;
    }
    return defaultImg;
  };

  return (
    <div className="promotion-summary">
      {/* Articles bonus gratuits */}
      {cartData.bonuses && cartData.bonuses.length > 0 && (
        <div className="promotion-summary__section">
          <div className="promotion-summary__section-header">
            <h3 className="promotion-summary__title">
              <span className="promotion-summary__icon">🎁</span>
              Articles gratuits
            </h3>
            <span className="promotion-summary__count">{cartData.bonuses.length}</span>
          </div>
          <div className="promotion-summary__bonuses">
            {cartData.bonuses.map((bonus, idx) => (
              <div key={idx} className="promotion-summary__bonus">
                <div className="promotion-summary__bonus-content">
                  <img
                    src={getBonusImage(bonus)}
                    alt={bonus.bonusProductName}
                    className="promotion-summary__bonus-img"
                  />
                  <div className="promotion-summary__bonus-text">
                    <p className="promotion-summary__bonus-name">
                      {bonus.bonusQuantity}× {bonus.bonusProductName}
                    </p>
                    <p className="promotion-summary__bonus-trigger">
                      Offert avec {bonus.triggerProductName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
