import { etatLabels } from "../components/orderModal/orderModal";
import { API_URL } from "../config";
import {
  CommandeEtat,
  CommandeType,
  type Commande,
  type CommandeHistoryDTO,
  type DateRange,
} from "../models";
import {
  preparateurService,
  type PreparationOrder,
  type PreparationOrderState,
  type PreparationOrderType,
} from "./preparateurService";

/**
 * Type pour les filtres de suivi des commandes
 */
export type TrackingFilter = "ALL" | PreparationOrderType;
export type TrackingDeliveryStateFilter =
  | "ALL_DELIVERY_STATES"
  | Extract<
      PreparationOrderState,
      "EN_PREPARATION" | "READY_FOR_DELIVERY" | "IN_DELIVERY"
    >;

export type OrderExpiredEvent = {
  orderId: number;
  message?: string;
};

/**
 * formatCurrency
 *
 * Formate un montant numérique en devise (dollars canadiens)
 *
 * Fonctionnalité:
 * - Formate le nombre avec 2 décimales
 * - Ajoute le symbole $ (dollar)
 *
 * @param {number} value - Le montant à formater
 * @returns {string} Montant formaté (ex: "19.99 $")
 * @note Utilisé pour afficher les prix et totaux
 */
export function formatCurrency(value: number): string {
  return `${value.toFixed(2)} $`;
}

/**
 * formatTime
 *
 * Formate une chaîne de date ISO en format lisible français
 *
 * Fonctionnalité:
 * - Formate en format français canadien (fr-CA)
 * - Affiche jour, mois abrégé, heure et minute
 * - Format : "01 jan 14:30"
 *
 * @param {string} value - Date ISO (ex: "2026-05-04T14:30:00Z")
 * @returns {string} Date formatée lisible
 * @note Utilisé pour afficher les dates de création et de disponibilité
 */
export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * getCustomerName
 *
 * Extrait et formate le nom du client à partir d'une commande
 *
 * Fonctionnalité:
 * - Préfère le nom complet (firstName + lastName)
 * - En fallback, utilise l'email
 * - Retourne "Client" par défaut si aucune info disponible
 *
 * @param {PreparationOrder} order - La commande contenant les infos utilisateur
 * @returns {string} Nom du client ou email ou "Client"
 * @note Utilisé pour afficher le client responsable de la commande
 */
export function getCustomerName(order: PreparationOrder): string {
  const user = order.transaction.user;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return fullName || user?.email || "Client";
}

/**
 * getProductImage
 *
 * Construit l'URL complète d'une image produit
 *
 * Fonctionnalité:
 * - Si l'URL est complète (http/https), la retourne telle quelle
 * - Sinon, préfixe avec l'URL de base de l'API
 * - Retourne null si aucune image disponible
 *
 * @param {string | null | undefined} imageUrl - L'URL relative ou absolue de l'image
 * @returns {string | null} URL complète ou null
 * @note Important pour les images servies depuis le backend
 */
export function getProductImage(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `${API_URL}${imageUrl}`;
}

/**
 * getReadyLabel
 *
 * Retourne le libellé approprié en fonction du type de livraison
 *
 * Fonctionnalité:
 * - "Ready for delivery" pour les livraisons à domicile
 * - "Ready for pickup" pour les retraits sur place
 *
 * @param {string} type - Le type de a commande (CommandeType ou PreparationOrderType)
 * @param {string} etat - L'état de a commande (CommandeEtat ou PreparationOrderState)
 * @returns {string} Label "Ready for delivery" ou "Ready for pickup"
 * @note Utilisé pour afficher l'état de disponibilité
 */
export function getReadyLabel(type: string, etat: string): string {
  if (type === "LIVRAISON" && etat === "IN_DELIVERY") {
    return "En cours de livraison";
  }

  if (type === "LIVRAISON" && etat === "COMPLETEE") {
    return "Livrée";
  }

  if (type === "PICKUP" && etat === "COMPLETEE") {
    return "Ramassée";
  }

  switch (etat) {
    case "READY_FOR_DELIVERY":
      return "Prête pour livraison";
    case "READY_FOR_PICKUP":
      return "Prête pour ramassage";
    case "COMPLETEE":
      return "Complétée";
    case "ANNULEE":
      return "Annulée";
    case "EN_PREPARATION":
    default:
      return "En préparation";
  }
}

export function getReadyBadgeClass(order: PreparationOrder): string {
  switch (order.etat) {
    case "EN_PREPARATION":
      return "preparation-badge--in-preparation";
    case "IN_DELIVERY":
      return "preparation-badge--in-delivery";
    case "COMPLETEE":
      return "preparation-badge--completed";
    case "ANNULEE":
      return "preparation-badge--cancelled";
    case "READY_FOR_DELIVERY":
    case "READY_FOR_PICKUP":
    default:
      return "preparation-badge--ready";
  }
}

/**
 * sortReadyOrders
 *
 * Trie les commandes prêtes par date de disponibilité (ordre FIFO)
 *
 * Fonctionnalité:
 * - Crée une copie du tableau (ne modifie pas l'original)
 * - Trie par readyForPickupAt, ou createdAt en fallback
 * - Les plus anciennes apparaissent en premier
 *
 * @param {PreparationOrder[]} orders - Les commandes à trier
 * @returns {PreparationOrder[]} Commandes triées
 * @note Utilisé pour respecter l'ordre FIFO des commandes prêtes
 */
export function sortReadyOrders(
  orders: PreparationOrder[],
): PreparationOrder[] {
  return [...orders].sort(
    (a, b) =>
      new Date(a.readyForPickupAt ?? a.createdAt).getTime() -
      new Date(b.readyForPickupAt ?? b.createdAt).getTime(),
  );
}

export function mergeTrackingOrders(
  orders: PreparationOrder[],
): PreparationOrder[] {
  const byId = new Map<number, PreparationOrder>();

  for (const order of orders) {
    byId.set(order.id, order);
  }

  return sortReadyOrders(Array.from(byId.values()));
}

/**
 * filterOrdersByType
 *
 * Filtre les commandes par type (LIVRAISON, PICKUP, ou TOUTES)
 *
 * Fonctionnalité:
 * - Si filter === "ALL", retourne toutes les commandes
 * - Sinon, filtre par type de livraison
 *
 * @param {PreparationOrder[]} orders - Les commandes à filtrer
 * @param {TrackingFilter} filter - Le type de filtre ("ALL", "LIVRAISON", "PICKUP")
 * @returns {PreparationOrder[]} Commandes filtrées
 * @note Utilisé pour les boutons de filtrage de l'interface
 */
export function filterOrdersByType(
  orders: PreparationOrder[],
  filter: TrackingFilter,
): PreparationOrder[] {
  return filter === "ALL"
    ? orders
    : orders.filter((order) => order.type === filter);
}

export function filterOrdersByProgress(
  orders: PreparationOrder[],
): PreparationOrder[] {
  return orders.filter(
    (order) => order.etat !== "COMPLETEE" && order.etat !== "ANNULEE",
  );
}

export function filterOrdersByDeliveryState(
  orders: PreparationOrder[],
  filter: TrackingDeliveryStateFilter,
): PreparationOrder[] {
  if (filter === "ALL_DELIVERY_STATES") {
    return orders;
  }

  return orders.filter(
    (order) => order.type === "LIVRAISON" && order.etat === filter,
  );
}

/**
 * getEmptyStateMessage
 *
 * Retourne le message approprié quand aucune commande n'est disponible
 *
 * Fonctionnalité:
 * - Message spécifique par type de filtre
 * - Améliore l'UX en expliquant pourquoi la liste est vide
 *
 * @param {TrackingFilter} filter - Le type de filtre appliqué
 * @returns {string} Message vide approprié
 * @note Utilisé pour l'état vide de la liste des commandes
 */
export function getEmptyStateMessage(filter: TrackingFilter): string {
  switch (filter) {
    case "LIVRAISON":
      return "Aucune livraison à suivre.";
    case "PICKUP":
      return "Aucun ramassage à suivre.";
    case "ALL":
    default:
      return "Aucune commande à suivre.";
  }
}

export function getDeliveryStateEmptyMessage(
  filter: TrackingDeliveryStateFilter,
): string | null {
  switch (filter) {
    case "EN_PREPARATION":
      return "Aucune livraison en préparation.";
    case "READY_FOR_DELIVERY":
      return "Aucune livraison prête.";
    case "IN_DELIVERY":
      return "Aucune livraison en cours.";
    case "ALL_DELIVERY_STATES":
    default:
      return null;
  }
}

/**
 * ordersService
 *
 * Service centralisé pour les opérations liées aux commandes
 */
export const ordersService = {
  /**
   * getReadyOrders
   * Récupère toutes les commandes prêtes pour retrait ou livraison
   * @returns {Promise<PreparationOrder[]>} Commandes prêtes
   * @throws Error si la requête échoue
   */

  async getReadyOrders(): Promise<PreparationOrder[]> {
    return preparateurService.getReadyOrders();
  },

  async getTrackingOrders(): Promise<PreparationOrder[]> {
    const board = await preparateurService.getPreparationBoard();
    return mergeTrackingOrders([...board.toPrepare, ...board.ready]);
  },

  /**
   * subscribeToReadyOrdersUpdates
   * S'abonne aux mises à jour en temps réel des commandes prêtes
   * @param {Function} onUpdate - Callback appelé quand les commandes changent
   * @returns {Function} Fonction pour se désabonner
   */

  subscribeToReadyOrdersUpdates(
    onUpdate: (orders: PreparationOrder[]) => void,
  ): () => void {
    return preparateurService.subscribeToReadyOrdersUpdates(onUpdate);
  },

  subscribeToTrackingOrdersUpdates(
    onUpdate: (orders: PreparationOrder[]) => void,
  ): () => void {
    return preparateurService.subscribeToOrdersUpdates((board) => {
      onUpdate(mergeTrackingOrders([...board.toPrepare, ...board.ready]));
    });
  },

  subscribeToActiveOrderEvents(onExpired: (event: OrderExpiredEvent) => void) {
    if (typeof EventSource === "undefined") {
      return () => undefined;
    }

    const eventSource = new EventSource(`${API_URL}/api/orders/active/stream`, {
      withCredentials: true,
    });

    eventSource.addEventListener("order-expired", (event) => {
      try {
        onExpired(
          JSON.parse((event as MessageEvent).data) as OrderExpiredEvent,
        );
      } catch {
        // Ignore les messages SSE invalides.
      }
    });

    return () => eventSource.close();
  },

  /**
   * Confirme une commande en validant un code de confirmation. Lance une exception si le code est incorrect ou si la requête échoue.
   * @param commandeId number	Identifiant unique de la commande à confirmer
   * @param code string	Code de confirmation à valider
   */

  async confirmCode(commandeId: number, code: string): Promise<void> {
    const response = await fetch(
      `${API_URL}/api/orders/${commandeId}/confirm-code`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Code incorrect");
    }
  },

  /**
   * Annule la commande active la plus récente d'un utilisateur.
   */
  async cancelOrder(commandeId: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/orders/${commandeId}/cancel`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de l'annulation");
    }
  },

  /**
   * Passe une commande de livraison en ramassage (Takeout)
   */
  async switchToTakeout(commandeId: number): Promise<void> {
    const response = await fetch(
      `${API_URL}/api/orders/${commandeId}/switch-to-takeout`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors du passage en takeout");
    }
  },

  /**
   * Annule une commande bloquée (pas de livreur après 15min)
   */
  async cancelStalledOrder(commandeId: number): Promise<void> {
    const response = await fetch(
      `${API_URL}/api/orders/${commandeId}/cancel-stalled`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de l'annulation");
    }
  },

  /**
   * Récupère la commande active de l'utilisateur connecté. Mappe les items Prisma vers des objets TransactionDTO
   */

  async getActiveOrder(): Promise<Commande | null> {
    const response = await fetch(`${API_URL}/api/orders/active`, {
      credentials: "include",
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Erreur lors de la récupération de la commande",
      );
    }

    const data = await response.json();
    // Mapper les items Prisma vers TransactionDTO
    if (data.transaction?.items) {
      data.transaction.items = data.transaction.items.map((item: any) => ({
        id: item.id,
        name: item.product?.name ?? "Produit",
        imageUrl: item.product?.imageUrl ?? null,
        price: item.price,
        quantity: item.quantity,
        lineTotal: item.price * item.quantity,
        stock: item.product?.stock ?? 0,
        isCooked: item.product?.isCooked ?? false,
      }));
    }
    return data as Commande;
  },

  /**
   *
   * @returns
   */
  async fetchAllActiveOrders(): Promise<CommandeHistoryDTO[]> {
    const response = await fetch(`${API_URL}/api/orders/allActives`, {
      credentials: "include",
    });

    if (response.status === 404) return [];

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Erreur lors de la récupération des commandes actives",
      );
    }

    const data = await response.json();
    return data as CommandeHistoryDTO[];
  },

  /**
   *
   * @returns
   */
  async getAllFinishedOrders(): Promise<CommandeHistoryDTO[]> {
    const response = await fetch(`${API_URL}/api/orders/allFinished`, {
      credentials: "include",
    });

    if (response.status === 404) return [];

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message ||
          "Erreur lors de la récupération des commandes terminées",
      );
    }

    const data = await response.json();
    return data as CommandeHistoryDTO[];
  },
};

/**
 * Trie une liste de commandes selon la configuration
 * de tri actuellement sélectionnée (`sortConfig`).
 *
 * Fonctionnement :
 * - Copie la liste originale pour éviter de modifier le state
 * - Trie les commandes selon :
 *    - la colonne sélectionnée (`sortConfig.key`)
 *    - la direction (`asc` ou `desc`)
 *
 * Cas spéciaux gérés :
 * - client      → tri par nom du client
 * - livreur     → tri par nom du livreur
 * - items       → tri par nombre d’items
 *
 * Les autres colonnes utilisent directement la propriété
 * correspondante de la commande.
 *
 * @param orders Liste des commandes à trier
 * @returns Nouvelle liste triée
 */
export function sortHeaderOrders(
  orders: CommandeHistoryDTO[],
  sortConfig: { key: string; direction: "asc" | "desc" },
) {
  const sorted = [...orders];

  sorted.sort((a: any, b: any) => {
    let aValue: any;
    let bValue: any;

    switch (sortConfig.key) {
      case "client":
        aValue = a.client?.name || "";
        bValue = b.client?.name || "";
        break;

      case "livreur":
        aValue = a.livreur?.name || "";
        bValue = b.livreur?.name || "";
        break;

      case "items":
        aValue = a.items?.length || 0;
        bValue = b.items?.length || 0;
        break;

      default:
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
    }

    if (aValue == null) aValue = "";
    if (bValue == null) bValue = "";

    if (typeof aValue === "string") {
      return sortConfig.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === "asc"
      ? aValue > bValue
        ? 1
        : -1
      : aValue < bValue
        ? 1
        : -1;
  });

  return sorted;
}

/** ---------------------------------------------------------------------------
 * Fonction permettant de filtrer les transactions avec le mot clé et la date (range)
 * @param transactions transactions a filtrer
 * @param searchTerm terme a rechercher
 * @param dateRange filtre avec les dates
 * @returns les transactions filtrées
 --------------------------------------------------------------------------- */
export function filtrerOrders(
  orders: CommandeHistoryDTO[],
  searchTerm: string,
  dateRange: DateRange,
) {
  const normalize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[[\u0300-\u036f]]/g, "")
      .toLowerCase();

  return orders.filter((order) => {
    const txDate = new Date(order.createdAt);

    const matchesNamesSearch =
      !searchTerm ||
      order.items.some((item) =>
        normalize(item.productName || "").includes(normalize(searchTerm)),
      ) ||
      normalize(order.client.name || "").includes(normalize(searchTerm)) ||
      normalize(order.client.email || "").includes(normalize(searchTerm)) ||
      normalize(order.livreur?.name || "").includes(normalize(searchTerm)) ||
      normalize(order.type).includes(normalize(searchTerm)) ||
      normalize(order.etat).includes(normalize(searchTerm)) ||
      normalize(etatLabels[order.etat as CommandeEtat]).includes(
        normalize(searchTerm),
      ) ||
      (order.type === CommandeType.PICKUP &&
        normalize("ramassage").includes(normalize(searchTerm))); // ajout des labels FR

    const matchesDatesFilter = (() => {
      if (!dateRange) return true;

      // Début et fin de la plage en UTC
      const from = new Date(dateRange.from);
      from.setUTCHours(0, 0, 0, 0);
      const to = new Date(dateRange.to);
      to.setUTCHours(23, 59, 59, 999);

      return txDate >= from && txDate <= to;
    })();

    return matchesNamesSearch && matchesDatesFilter;
  });
}
