import React from "react";
import "./PriceDisplay.css";

interface PriceDisplayProps {
  price: number;
  finalPrice: number;
  showBadge?: boolean;
  className?: string;
  sale?: number;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  finalPrice,
  showBadge = true,
  className = "",
  sale,
}) => {
  const hasDiscount = finalPrice < price;

  return (
    <div className={`price-display ${className}`}>
      <div className="price-display-amounts">
        <span className="price-display-final">{finalPrice.toFixed(2)} $</span>
        {hasDiscount && (
          <span className="price-display-original">{price.toFixed(2)} $</span>
        )}
      </div>
      {hasDiscount && showBadge && (
        <span className="price-display-badge">-{sale}%</span>
      )}
    </div>
  );
};
