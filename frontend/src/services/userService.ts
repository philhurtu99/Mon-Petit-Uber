import { API_URL } from "../config";


export const userService = {

  async getCreditBalance() {
    const response = await fetch(`${API_URL}/api/user/credit`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la récupération du crédit");
    }

    return response.json() as Promise<{ creditBalance: number }>;
  },

  /*
   * Récupère les points de fidélité de l'utilisateur.
   */
  async getLoyaltyPoints() {
    const response = await fetch(`${API_URL}/api/user/loyalty-points`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la récupération des points");
    }

    return response.json() as Promise<{ loyaltyPoints: number }>;
  },

  subscribeToLoyaltyPoints(onUpdate: (loyaltyPoints: number) => void) {
    if (typeof EventSource === "undefined") {
      return null;
    }

    const eventSource = new EventSource(`${API_URL}/api/user/loyalty-points/stream`, {
      withCredentials: true,
    });

    eventSource.addEventListener("loyalty-points", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        onUpdate(Math.max(Number(data.loyaltyPoints ?? 0), 0));
      } catch {
        // Ignore les messages SSE invalides.
      }
    });

    return () => eventSource.close();
  },

  subscribeToCreditBalance(onUpdate: (creditBalance: number) => void) {
    if (typeof EventSource === "undefined") {
      return null;
    }

    const eventSource = new EventSource(`${API_URL}/api/user/credit/stream`, {
      withCredentials: true,
    });

    eventSource.addEventListener("credit", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        onUpdate(Math.max(Number(data.creditBalance ?? 0), 0));
      } catch {
        // Ignore les messages SSE invalides.
      }
    });

    return () => eventSource.close();
  },

  async updateProfile(formData: FormData) {
    const response = await fetch(`${API_URL}/api/user/updateProfile`, {
      method: "PATCH",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la mise à jour du profil");
    }

    return response.json();
  },

  async toggleProfanityFilter(enabled: boolean) {
    const response = await fetch(`${API_URL}/api/user/profanity-filter`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la mise à jour du filtre");
    }

    return response.json() as Promise<{
      message: string;
      profanityFilterEnabled: boolean;
    }>;
  },

  // Récupère l'état actuel de la 2FA de l'utilisateur connecté
  async getTwoFactor() {
    const response = await fetch(`${API_URL}/api/user/two-factor`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la récupération de la 2FA");
    }

    return response.json() as Promise<{
      twoFactorEnabled: boolean;
      twoFactorMethod: "EMAIL" | "SMS" | null;
      phone: string | null;
    }>;
  },

  // Active/désactive la 2FA + choix méthode et numéro
  async toggleTwoFactor(body: {
    enabled: boolean;
    method?: "EMAIL" | "SMS";
    phone?: string;
  }) {
    const response = await fetch(`${API_URL}/api/user/two-factor`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la mise à jour de la 2FA");
    }

    return response.json();
  },

     // Récupère les préférences marketing de l'utilisateur connecté
  async getMarketing() {
    const response = await fetch(`${API_URL}/api/user/marketing`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la récupération des préférences marketing");
    }

    return response.json() as Promise<{
      marketingConsent: boolean;
      marketingMethod: "EMAIL" | "SMS" | null;
      marketingConsentDate: string | null;
      phone: string | null;
    }>;
  },

  // Met à jour les préférences marketing
  async updateMarketing(body: {
    marketingConsent: boolean;
    marketingMethod?: "EMAIL" | "SMS" | null;
  }) {
    const response = await fetch(`${API_URL}/api/user/marketing`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la mise à jour des préférences marketing");
    }

    return response.json();
  },
};
