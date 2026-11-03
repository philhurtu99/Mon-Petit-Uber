import "./PromotionBadge.css";
import { useState, useEffect } from "react";

interface PromotionBadgeProps {
  type: "BUY_X_GET_Y" | "FREE_ITEM";
  name: string;
  description?: string;
  quantity?: number;
  bonusQuantity?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  bonusProductName?: string;
}

export function PromotionBadge({
  type,
  name,
  description,
  quantity,
  bonusQuantity,
  endDate,
  bonusProductName,
}: PromotionBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [, setUpdateTrigger] = useState(0);
  
  const variantClass =
    type === "BUY_X_GET_Y" ? "promotion-badge--orange" : "promotion-badge--green";

  // Mettre à jour le compteur chaque seconde
  useEffect(() => {
    if (!showDetails || !endDate) return;

    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showDetails, endDate]);

  // Formater les dates
  const formatDate = (date?: string | Date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // Vérifier si la promotion est active
  const isActive = () => {
    if (!endDate) return true;
    return new Date(endDate) > new Date();
  };

  const daysRemaining = () => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    // Fixer l'heure de fin à minuit
    end.setHours(23, 59, 59, 999);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getTimeRemaining = () => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    // Fixer l'heure de fin à minuit
    end.setHours(23, 59, 59, 999);
    const diffTime = end.getTime() - now.getTime();
    
    if (diffTime <= 0) return null;

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="promotion-badge__container">
      <div
        className={`promotion-badge ${variantClass}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <span className="promotion-badge__text">{name}</span>
      </div>

      {showDetails && (
        <div className="promotion-details__modal">
          <button 
            className="promotion-details__close"
            onClick={() => setShowDetails(false)}
          >
            ✕
          </button>
          
          <div className="promotion-details__header">
            <span className={`promotion-details__badge ${variantClass}`}>
              {type === "BUY_X_GET_Y" ? "🏷️" : "🎁"}
            </span>
            <h2 className="promotion-details__title">{name}</h2>
          </div>

          {description && (
            <p className="promotion-details__description">{description}</p>
          )}

          <div className="promotion-details__content">
            {type === "BUY_X_GET_Y" && quantity && bonusQuantity && (
              <div className="promotion-details__section">
                <h3>Conditions</h3>
                <p>
                  <strong>Achetez {quantity}</strong> article(s) → <strong>obtenez {bonusQuantity}</strong> gratuit(s)
                </p>
                {endDate && getTimeRemaining() && (
                  <p className="promotion-details__urgency promotion-details__urgency--inline">
                    ⏳ Plus que <strong>{getTimeRemaining()}</strong> 
                  </p>
                )}
              </div>
            )}
            
            {type === "FREE_ITEM" && bonusQuantity && (
              <div className="promotion-details__section">
                <h3>Avantage</h3>
                <p>
                  Recevez <strong>{bonusQuantity}</strong> article(s) gratuit(s) avec votre achat
                </p>
                {endDate && getTimeRemaining() && (
                  <p className="promotion-details__urgency promotion-details__urgency--inline">
                    ⏳ Plus que <strong>{getTimeRemaining()}</strong>
                  </p>
                )}
              </div>
            )}

            {bonusProductName && (
              <div className="promotion-details__section">
                <h3>Article bonus</h3>
                <p>{bonusProductName}</p>
              </div>
            )}

            {!isActive() && (
              <div className="promotion-details__section promotion-details__section--expired">
                <p>❌ Cette promotion a expiré</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
