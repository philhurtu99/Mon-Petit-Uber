import { useEffect, useState } from "react";
import { configService, type LoyaltyConfig } from "../services/configService";

export type { LoyaltyConfig };

export const capLoyaltyPoints = (
  points: number,
  loyaltyConfig: LoyaltyConfig | null,
) => {
  const safePoints = Math.max(Math.trunc(points), 0);
  return loyaltyConfig
    ? Math.min(safePoints, loyaltyConfig.loyaltyMaxPoints)
    : safePoints;
};

export const getLoyaltyDollarValue = (
  points: number,
  loyaltyConfig: LoyaltyConfig | null,
) => {
  if (!loyaltyConfig) return 0;

  return (
    Math.floor(
      capLoyaltyPoints(points, loyaltyConfig) /
        loyaltyConfig.loyaltyRedemptionStepPoints,
    ) * loyaltyConfig.loyaltyRedemptionStepValue
  );
};

/**
 * Hook personnalisé pour récupérer et gérer la configuration de fidélité
 * @param loyaltyConfig - La configuration de fidélité à utiliser
 * @returns La configuration de fidélité actuelle
 */
export function useLoyaltyConfig() {
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    // Récupère la configuration de fidélité depuis le service et la stocke dans le state
    configService
      .getLoyaltyConfig()
      .then((config) => {
        // Si le composant est toujours monté, met à jour la configuration
        if (isMounted) {
          setLoyaltyConfig(config);
        }
      })
      .catch((error) => {
        console.error("Erreur lors du fetch de la config fidélité:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return loyaltyConfig;
}
