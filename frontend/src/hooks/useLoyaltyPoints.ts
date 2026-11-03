import { useEffect, useState } from "react";
import { userService } from "../services/userService";
import {
  capLoyaltyPoints,
  type LoyaltyConfig,
} from "./useLoyaltyConfig";

/*
 * Hook personnalisé pour gérer les points de fidélité d'un utilisateur.
 * Utilise un état local pour stocker les points et se synchronise avec le service utilisateur.
 */
export function useLoyaltyPoints(
  isLoggedIn: boolean,
  loyaltyConfig: LoyaltyConfig | null = null,
) {
  const [points, setPoints] = useState(0);

  // Effectue le chargement des points de fidélité lorsque l'utilisateur se connecte.
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let isMounted = true;

    // Fonction pour charger les points de fidélité depuis le service utilisateur.
    // Elle est appelée lors de la connexion de l'utilisateur et lors de la mise à jour du flux de fidélité.
    const loadLoyaltyPoints = () => {
      userService
        .getLoyaltyPoints()
        .then(({ loyaltyPoints }) => {
          if (isMounted) {
            setPoints(capLoyaltyPoints(Number(loyaltyPoints ?? 0), loyaltyConfig));
          }
        })
        .catch((err) => {
          console.error("Erreur lors du fetch des points client:", err);
          if (isMounted) {
            setPoints(0);
          }
        });
    };

    // Écoute les événements de focus et de rafraîchissement de fidélité pour charger les points.
    // Ces événements sont utilisés pour s'assurer que les points sont toujours à jour.
    // Le flux de fidélité est également abonné pour recevoir des mises à jour en temps réel.
    loadLoyaltyPoints();
    window.addEventListener("focus", loadLoyaltyPoints);
    window.addEventListener("loyalty:refresh", loadLoyaltyPoints);
    const unsubscribeLoyaltyStream = userService.subscribeToLoyaltyPoints(
      (points) => {
        if (isMounted) {
          setPoints(capLoyaltyPoints(points, loyaltyConfig));
        }
      },
    );

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadLoyaltyPoints();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", loadLoyaltyPoints);
      window.removeEventListener("loyalty:refresh", loadLoyaltyPoints);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeLoyaltyStream?.();
    };
  }, [isLoggedIn, loyaltyConfig]);

  return isLoggedIn ? points : 0;
}
