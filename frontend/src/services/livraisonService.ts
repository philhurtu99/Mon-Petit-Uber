import { API_URL } from "../config";
import type { PreparationOrder } from "./preparateurService";

// ============================================================================
// Types
// ============================================================================

/** Réponse lors d'une demande de livraison */
type RequestLivraisonResponse = {
  message: string;
  order: PreparationOrder;
};

/** Réponse lors de la finalisation d'une livraison */
type CompleteLivraisonResponse = {
  message: string;
  order: PreparationOrder;
};

/** Réponse pour la notification email de livraison prête */
type LivraisonReadyNotificationResponse = {
  message: string;
  subscribed: boolean;
};

/** État de disponibilité des livraisons */
export type LivraisonAvailability = {
  available: boolean;
  count: number;
};

/** Réponse avec la livraison actuelle du livreur */
export type CurrentLivraisonResponse = {
  order: PreparationOrder | null;
};

// ============================================================================
// Utilitaires
// ============================================================================

/**
 * Parse la réponse JSON et gère les erreurs
 * @param response - Réponse HTTP
 * @returns Les données parsées ou une erreur
 */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : "Erreur lors de la communication avec le serveur";
    throw new Error(message);
  }

  return data as T;
}

// ============================================================================
// Service API
// ============================================================================

export const livraisonService = {
  /**
   * Récupère l'état de disponibilité des livraisons
   */
  async getAvailability(): Promise<LivraisonAvailability> {
    const response = await fetch(`${API_URL}/api/livraison/status`, {
      credentials: "include",
    });

    return parseJsonResponse<LivraisonAvailability>(response);
  },

  /**
   * Récupère la livraison actuellement assignée au livreur
   */
  async getCurrentLivraison(): Promise<CurrentLivraisonResponse> {
    const response = await fetch(`${API_URL}/api/livraison/current`, {
      credentials: "include",
    });

    return parseJsonResponse<CurrentLivraisonResponse>(response);
  },

  /**
   * Demande l'assignation d'une nouvelle livraison
   */
  async requestLivraison(): Promise<RequestLivraisonResponse> {
    const response = await fetch(`${API_URL}/api/livraison/request`, {
      method: "POST",
      credentials: "include",
    });

    return parseJsonResponse<RequestLivraisonResponse>(response);
  },

  /**
   * Termine la livraison actuelle
   */
  async completeLivraison(code: string): Promise<CompleteLivraisonResponse> {
    const response = await fetch(`${API_URL}/api/livraison/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });

    return parseJsonResponse<CompleteLivraisonResponse>(response);
  },

  /**
   * S'abonne à une notification email pour les livraisons prêtes
   */
  async subscribeToReadyNotification(): Promise<LivraisonReadyNotificationResponse> {
    const response = await fetch(`${API_URL}/api/livraison/notifications/ready`, {
      method: "POST",
      credentials: "include",
    });

    return parseJsonResponse<LivraisonReadyNotificationResponse>(response);
  },

  /**
   * S'abonne aux mises à jour de disponibilité des livraisons
   * Utilise Server-Sent Events si disponible, sinon polling
   * 
   * @param onUpdate - Callback appelé à chaque mise à jour
   * @returns Fonction pour arrêter la souscription
   */
  subscribeToAvailability(
    onUpdate: (availability: LivraisonAvailability) => void,
  ): () => void {
    let stopped = false;
    let intervalId: number | undefined;
    let eventSource: EventSource | undefined;

    const poll = async () => {
      if (stopped) return;

      try {
        const availability = await livraisonService.getAvailability();
        onUpdate(availability);
      } catch {
        // Ignore les erreurs transitoires lors du polling
      }
    };

    const startPolling = () => {
      if (intervalId !== undefined) return;

      void poll();
      intervalId = window.setInterval(poll, 5000);
    };

    // Fallback sur le polling si EventSource n'est pas disponible
    if (typeof EventSource === "undefined") {
      startPolling();
      return () => {
        stopped = true;
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      };
    }

    // Utilise Server-Sent Events pour les mises à jour temps réel
    eventSource = new EventSource(
      `${API_URL}/api/livraison/status/stream`,
      {
        withCredentials: true,
      },
    );

    eventSource.addEventListener("availability", (event) => {
      if (stopped) return;

      try {
        onUpdate(JSON.parse((event as MessageEvent).data));
      } catch {
        // Ignore les messages SSE malformés
      }
    });

    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = undefined;
      // Bascule sur le polling en cas d'erreur SSE
      startPolling();
    };

    return () => {
      stopped = true;
      eventSource?.close();
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  },

  /**
   * S'abonne aux mises à jour de la livraison actuelle du livreur
   * Utilise Server-Sent Events si disponible, sinon polling
   * 
   * @param onUpdate - Callback appelé à chaque mise à jour
   * @returns Fonction pour arrêter la souscription
   */
  subscribeToCurrentLivraison(
    onUpdate: (order: PreparationOrder | null) => void,
  ): () => void {
    let stopped = false;
    let intervalId: number | undefined;
    let eventSource: EventSource | undefined;

    const poll = async () => {
      if (stopped) return;

      try {
        const result = await livraisonService.getCurrentLivraison();
        onUpdate(result.order);
      } catch {
        // Ignore les erreurs transitoires lors du polling
      }
    };

    const startPolling = () => {
      if (intervalId !== undefined) return;

      void poll();
      intervalId = window.setInterval(poll, 5000);
    };

    // Fallback sur le polling si EventSource n'est pas disponible
    if (typeof EventSource === "undefined") {
      startPolling();
      return () => {
        stopped = true;
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      };
    }

    // Utilise Server-Sent Events pour les mises à jour temps réel
    eventSource = new EventSource(
      `${API_URL}/api/livraison/current/stream`,
      {
        withCredentials: true,
      },
    );

    eventSource.addEventListener("current", (event) => {
      if (stopped) return;

      try {
        const data = JSON.parse(
          (event as MessageEvent).data,
        ) as CurrentLivraisonResponse;
        onUpdate(data.order);
      } catch {
        // Ignore les messages SSE malformés
      }
    });

    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = undefined;
      // Bascule sur le polling en cas d'erreur SSE
      startPolling();
    };

    return () => {
      stopped = true;
      eventSource?.close();
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  },
};
