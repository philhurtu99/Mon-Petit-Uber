import { API_URL } from "../config";

export type LoyaltyConfig = {
  loyaltyPointsPerDollar: number;
  loyaltyRedemptionStepPoints: number;
  loyaltyRedemptionStepValue: number;
  loyaltyMaxPoints: number;
  loyaltyAdminAdjustmentStepPoints: number;
  stalledOrderTimeoutMs: number;
};

let loyaltyConfigPromise: Promise<LoyaltyConfig> | null = null;
let locauxPromise: Promise<string[]> | null = null;

/**
 * Récupère la configuration de fidélité depuis l'API.
 * @param {string} [url] - L'URL de l'API (par défaut API_URL).
 * @returns {Promise<LoyaltyConfig>} - La configuration de fidélité.
 */
export const configService = {
  getLoyaltyConfig(): Promise<LoyaltyConfig> {
    if (!loyaltyConfigPromise) {
      loyaltyConfigPromise = fetch(`${API_URL}/api/config/loyalty`, {
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
              err.message || "Erreur lors du chargement de la config fidélité",
            );
          }

          return res.json();
        })
        .catch((error) => {
          loyaltyConfigPromise = null;
          throw error;
        });
    }

    return loyaltyConfigPromise;
  },

  // récupère la liste des locaux depuis l'API
  // si la liste n'est pas encore chargée, effectue une requête et stocke le résultat dans la variable cache
  getLocaux(): Promise<string[]> {
    if (!locauxPromise) {
      locauxPromise = fetch(`${API_URL}/api/config/locaux`, {
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
              err.message || "Erreur lors du chargement des locaux",
            );
          }

          const data = await res.json();
          return Array.isArray(data?.locaux) ? data.locaux : [];
        })
        .catch((error) => {
          locauxPromise = null;
          throw error;
        });
    }

    return locauxPromise;
  },
};
