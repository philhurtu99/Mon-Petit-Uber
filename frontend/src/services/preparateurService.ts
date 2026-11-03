import { API_URL } from "../config";

export type PreparationOrderType = "LIVRAISON" | "PICKUP";
export type PreparationOrderState =
  | "EN_PREPARATION"
  | "READY_FOR_PICKUP"
  | "READY_FOR_DELIVERY"
  | "IN_DELIVERY"
  | "COMPLETEE"
  | "ANNULEE";

export type PreparationOrder = {
  id: number;
  type: PreparationOrderType;
  etat: PreparationOrderState;
  local?: string | null;
  createdAt: string;
  readyForPickupAt?: string | null;
  deliveryPickedUpAt?: string | null;
  transaction: {
    id: number;
    total: number;
    purchaseDate: string;
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      address?: string | null;
      phone?: string | null;
    } | null;
    items: {
      id: number;
      quantity: number;
      price: number;
      product?: {
        id: number;
        name: string;
        imageUrl?: string | null;
      } | null;
    }[];
  };
};

export type PreparationBoard = {
  toPrepare: PreparationOrder[];
  ready: PreparationOrder[];
};

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

/**
 * onlyOrdersInPreparation
 * 
 * Filtre et trie les commandes en état de préparation
 * 
 * Fonctionnalité:
 * - Filtre uniquement les commandes avec l'état "EN_PREPARATION"
 * - Trie par date de création (plus anciennes d'abord) pour respecter l'ordre FIFO
 * 
 * @param {PreparationOrder[]} orders - Liste complète des commandes
 * @returns {PreparationOrder[]} Commandes en préparation, triées FIFO
 * @note Utile pour afficher la file d'attente des préparateurs
 */
function onlyOrdersInPreparation(orders: PreparationOrder[]) {
  return orders
    .filter((order) => order.etat === "EN_PREPARATION")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

/**
 * onlyReadyOrders
 * 
 * Filtre et trie les commandes prêtes (préparation terminée)
 * 
 * Fonctionnalité:
 * - Filtre les commandes qui ne sont plus en préparation
 * - Trie par date de disponibilité (readyForPickupAt) ou date de création en fallback
 * - Affiche les commandes les plus anciennes en premier
 * 
 * @param {PreparationOrder[]} orders - Liste complète des commandes
 * @returns {PreparationOrder[]} Commandes prêtes, triées par date de disponibilité
 * @note Utile pour afficher les commandes complétées et prêtes à être retirées/livrées
 */
function onlyReadyOrders(orders: PreparationOrder[]) {
  return orders
    .filter((order) => order.etat !== "EN_PREPARATION")
    .sort(
      (a, b) =>
        new Date(a.readyForPickupAt ?? a.createdAt).getTime() -
        new Date(b.readyForPickupAt ?? b.createdAt).getTime(),
    );
}

/**
 * getOrdersToPrepareFromLegacyRoutes
 * 
 * Récupère les commandes à préparer via les anciens endpoints (fallback)
 * 
 * Fonctionnalité:
 * - Charge les commandes PICKUP et LIVRAISON en parallèle depuis les anciens routes
 * - Parse les réponses JSON avec gestion d'erreur
 * - Filtre et trie pour afficher uniquement les commandes en préparation
 * 
 * @returns {Promise<PreparationOrder[]>} Commandes en préparation, triées FIFO
 * @note Utilisé en fallback si l'endpoint moderne n'existe pas (erreur 404)
 * @performance Charge deux routes en parallèle avec Promise.all()
 */
async function getOrdersToPrepareFromLegacyRoutes() {
  const [pickupResponse, livraisonResponse] = await Promise.all([
    fetch(`${API_URL}/api/orders/getAllPickup`, {
      credentials: "include",
    }),
    fetch(`${API_URL}/api/orders/getAllLivraison`, {
      credentials: "include",
    }),
  ]);

  const [pickupOrders, livraisonOrders] = await Promise.all([
    parseJsonResponse<PreparationOrder[]>(pickupResponse),
    parseJsonResponse<PreparationOrder[]>(livraisonResponse),
  ]);

  return onlyOrdersInPreparation([...pickupOrders, ...livraisonOrders]);
}

/**
 * getPreparationBoardFromLegacyRoutes
 * 
 * Récupère le tableau de bord complet via les anciens endpoints (fallback)
 * 
 * Fonctionnalité:
 * - Charge les commandes PICKUP et LIVRAISON en parallèle depuis les anciens routes
 * - Combine les résultats et les sépare en commandes à préparer et commandes prêtes
 * - Retourne l'objet PreparationBoard avec les deux listes filtrées et triées
 * 
 * @returns {Promise<PreparationBoard>} Objet avec toPrepare et ready
 * @note Utilisé en fallback si l'endpoint moderne n'existe pas (erreur 404)
 * @performance Charge deux routes en parallèle avec Promise.all()
 */
async function getPreparationBoardFromLegacyRoutes() {
  const [pickupResponse, livraisonResponse] = await Promise.all([
    fetch(`${API_URL}/api/orders/getAllPickup`, {
      credentials: "include",
    }),
    fetch(`${API_URL}/api/orders/getAllLivraison`, {
      credentials: "include",
    }),
  ]);

  const [pickupOrders, livraisonOrders] = await Promise.all([
    parseJsonResponse<PreparationOrder[]>(pickupResponse),
    parseJsonResponse<PreparationOrder[]>(livraisonResponse),
  ]);

  const orders = [...pickupOrders, ...livraisonOrders];

  return {
    toPrepare: onlyOrdersInPreparation(orders),
    ready: onlyReadyOrders(orders),
  };
}

export const preparateurService = {
  /**
   * getOrdersToPrepare
   * 
   * Récupère les commandes en attente de préparation
   * 
   * Fonctionnalité:
   * - Tente d'utiliser l'endpoint moderne /api/preparateur/orders/to-prepare
   * - En cas d'erreur 404, utilise le fallback legacy getOrdersToPrepareFromLegacyRoutes
   * - Retourne une liste de commandes avec l'état "EN_PREPARATION", triée FIFO
   * 
   * @returns {Promise<PreparationOrder[]>} Commandes à préparer, triées par date d'arrivée
   * @note Gère la rétrocompatibilité avec les anciens endpoints
   * @throws Error si la requête échoue après les tentatives de fallback
   */
  async getOrdersToPrepare() {
    const response = await fetch(`${API_URL}/api/preparateur/orders/to-prepare`, {
      credentials: "include",
    });

    if (response.status === 404) {
      return getOrdersToPrepareFromLegacyRoutes();
    }

    return parseJsonResponse<PreparationOrder[]>(response);
  },

  /**
   * getReadyOrders
   * 
   * Récupère les commandes marquées comme prêtes (préparation terminée)
   * 
   * Fonctionnalité:
   * - Tente d'utiliser l'endpoint moderne /api/preparateur/orders/ready
   * - En cas d'erreur 404, utilise le fallback legacy
   * - Retourne les commandes qui ne sont plus en préparation
   * - Triées par date de disponibilité
   * 
   * @returns {Promise<PreparationOrder[]>} Commandes prêtes, triées par date de disponibilité
   * @note Gère la rétrocompatibilité avec les anciens endpoints
   * @throws Error si la requête échoue après les tentatives de fallback
   */
  async getReadyOrders() {
    const response = await fetch(`${API_URL}/api/preparateur/orders/ready`, {
      credentials: "include",
    });

    if (response.status === 404) {
      const board = await getPreparationBoardFromLegacyRoutes();
      return board.ready;
    }

    return parseJsonResponse<PreparationOrder[]>(response);
  },

  /**
   * getPreparationBoard
   * 
   * Récupère le tableau de bord complet du préparateur en une seule requête
   * 
   * Fonctionnalité:
   * - Récupère en parallèle les commandes à préparer et les commandes prêtes
   * - Combine les deux listes dans un objet PreparationBoard
   * - Permet une mise à jour cohérente de l'interface en une seule requête
   * 
   * @returns {Promise<PreparationBoard>} Objet avec deux tableaux:
   *   - toPrepare: commandes en attente (EN_PREPARATION)
   *   - ready: commandes prêtes (READY_FOR_*)
   * @note Endpoint idéal pour le rechargement initial de l'interface du préparateur
   * @performance Utilise Promise.all() pour charger les deux listes en parallèle
   */
  async getPreparationBoard(): Promise<PreparationBoard> {
    const [toPrepare, ready] = await Promise.all([
      preparateurService.getOrdersToPrepare(),
      preparateurService.getReadyOrders(),
    ]);

    return { toPrepare, ready };
  },

  /**
   * markOrderReady
   * 
   * Marque une commande comme prête après préparation
   * 
   * Fonctionnalité:
   * - Envoie une requête POST à l'endpoint /api/preparateur/orders/{id}/ready
   * - En cas d'erreur 404, utilise le fallback /api/orders/{id}/ready (legacy)
   * - Retourne le message de confirmation et la commande mise à jour
   * 
   * @param {number} orderId - ID de la commande à marquer prête
   * @returns {Promise<{message: string; order: PreparationOrder}>} Réponse du serveur avec message et commande
   * @throws Error si la requête échoue après les tentatives de fallback
   * @note Gère la rétrocompatibilité avec les anciens endpoints
   */
  async markOrderReady(orderId: number) {
    const response = await fetch(
      `${API_URL}/api/preparateur/orders/${orderId}/ready`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (response.status === 404) {
      const fallbackResponse = await fetch(`${API_URL}/api/orders/${orderId}/ready`, {
        method: "POST",
        credentials: "include",
      });

      return parseJsonResponse<{ message: string; order: PreparationOrder }>(
        fallbackResponse,
      );
    }

    return parseJsonResponse<{ message: string; order: PreparationOrder }>(
      response,
    );
  },

  /**
   * subscribeToOrdersUpdates
   * 
   * S'abonne aux mises à jour en temps réel des commandes de préparation
   * 
   * Fonctionnalité:
   * - Utilise Server-Sent Events (SSE) pour les mises à jour en temps réel
   * - Fallback vers un polling toutes les 5 secondes si SSE n'est pas disponible
   * - Fallback automatique en polling si la connexion SSE échoue
   * - Gère le filtrage et le tri des données reçues
   * 
   * @param {Function} onUpdate - Callback appelé à chaque mise à jour avec le tableau de bord
   * @returns {Function} Fonction pour se désabonner (arrête SSE et/ou polling)
   * @note Important : appeler la fonction retournée pour nettoyer les ressources
   * @note Le callback peut recevoir soit un PreparationBoard complet, soit un tableau de commandes
   */
  subscribeToOrdersUpdates(onUpdate: (board: PreparationBoard) => void) {
    let stopped = false;
    let intervalId: number | undefined;
    let eventSource: EventSource | undefined;

    const startFallbackPolling = () => {
      if (intervalId !== undefined) return;

      const poll = async () => {
        if (stopped) return;
        try {
          const board = await preparateurService.getPreparationBoard();
          onUpdate(board);
        } catch (err) {
          // ignore polling errors
        }
      };

      void poll();
      intervalId = window.setInterval(poll, 5000);
    };

    if (typeof EventSource === "undefined") {
      startFallbackPolling();
      return () => {
        stopped = true;
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      };
    }

    eventSource = new EventSource(
      `${API_URL}/api/preparateur/orders/to-prepare/stream`,
      {
        withCredentials: true,
      },
    );

    eventSource.addEventListener("orders", (event) => {
      if (stopped) return;
      try {
        const data = JSON.parse((event as MessageEvent).data) as
          | PreparationBoard
          | PreparationOrder[];

        if (Array.isArray(data)) {
          onUpdate({
            toPrepare: onlyOrdersInPreparation(data),
            ready: onlyReadyOrders(data),
          });
          return;
        }

        onUpdate(data);
      } catch (err) {
        // ignore malformed stream messages
      }
    });

    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = undefined;
      startFallbackPolling();
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
   * subscribeToReadyOrdersUpdates
   * 
   * S'abonne aux mises à jour en temps réel des commandes prêtes uniquement
   * 
   * Fonctionnalité:
   * - Wrapper sur subscribeToOrdersUpdates qui filtre uniquement les commandes prêtes
   * - Reçoit les mises à jour complètes du tableau de bord et extrait la partie ready
   * - Utile pour les interfaces affichant uniquement les commandes prêtes à retirer/livrer
   * 
   * @param {Function} onUpdate - Callback appelé avec la liste des commandes prêtes
   * @returns {Function} Fonction pour se désabonner (arrête la souscription parente)
   * @note Important : appeler la fonction retournée pour nettoyer les ressources
   */
  subscribeToReadyOrdersUpdates(onUpdate: (orders: PreparationOrder[]) => void) {
    return preparateurService.subscribeToOrdersUpdates((board) => {
      onUpdate(board.ready);
    });
  },
};
