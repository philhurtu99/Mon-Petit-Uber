import {
  getAllPickupOrders,
  getAllLivraisonOrders,
  OrderRequestError,
  triggerReadyForPickup,
} from "./orders.service";

/**
 * getOrdersToPrepare
 * 
 * Récupère toutes les commandes en attente de préparation
 * 
 * Fonctionnalité:
 * - Charge les commandes PICKUP et LIVRAISON en parallèle pour optimiser les performances
 * - Filtre uniquement les commandes avec l'état "EN_PREPARATION"
 * - Trie les résultats par date de création (plus anciennes d'abord) pour respecter l'ordre FIFO
 * 
 * @returns {Promise<Commande[]>} Liste des commandes à préparer, triées par ordre d'arrivée
 * @note Utile pour l'interface de préparation où les préparateurs voient leur file d'attente
 * @performance Charge les deux types de commandes en parallèle avec Promise.all()
 */
export const getOrdersToPrepare = async () => {
  const [pickupOrders, livraisonOrders] = await Promise.all([
    getAllPickupOrders(),
    getAllLivraisonOrders(),
  ]);

  return [...pickupOrders, ...livraisonOrders]
    .filter((order) => order.etat === "EN_PREPARATION")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
};

/**
 * getReadyOrders
 * 
 * Récupère toutes les commandes marquées comme prêtes (préparation terminée)
 * 
 * Fonctionnalité:
 * - Charge les commandes PICKUP et LIVRAISON en parallèle
 * - Filtre les commandes à suivre, sans les commandes complétées ou annulées
 * - Trie par date de disponibilité (readyForPickupAt) ou date de mise à jour si non disponible
 * 
 * @returns {Promise<Commande[]>} Liste des commandes en suivi, triées par date de disponibilité
 * @note Affiche les commandes prêtes ou en cours de suivi
 * @performance Charge les deux types de commandes en parallèle avec Promise.all()
 */
export const getReadyOrders = async () => {
  const [pickupOrders, livraisonOrders] = await Promise.all([
    getAllPickupOrders(),
    getAllLivraisonOrders(),
  ]);

  return [...pickupOrders, ...livraisonOrders]
    .filter(
      (order) =>
        order.etat !== "EN_PREPARATION" &&
        order.etat !== "COMPLETEE" &&
        order.etat !== "ANNULEE",
    )
    .sort(
      (a, b) =>
        (a.readyForPickupAt ?? a.updatedAt).getTime() -
        (b.readyForPickupAt ?? b.updatedAt).getTime(),
    );
};

/**
 * getPreparationBoard
 * 
 * Tableau de bord complet du préparateur regroupant les commandes en cours et terminées
 * 
 * Fonctionnalité:
 * - Récupère en parallèle les commandes à préparer et les commandes prêtes
 * - Combine les deux listes pour une vue d'ensemble de l'état de préparation
 * - Utile pour la progression de la préparation et le suivi de production
 * 
 * @returns {Promise<{toPrepare: Commande[], ready: Commande[]}>} Objet avec deux tableaux
 *   - toPrepare: commandes en attente de préparation (EN_PREPARATION), triées FIFO
 *   - ready: commandes terminées et prêtes (READY_FOR_PICKUP, READY_FOR_DELIVERY), triées par priorité
 * @note Endpoint idéal pour l'interface du tableau de bord de préparation
 * @performance Utilise Promise.all() pour charger les deux listes en parallèle
 */
export const getPreparationBoard = async () => {
  const [toPrepare, ready] = await Promise.all([
    getOrdersToPrepare(),
    getReadyOrders(),
  ]);

  return { toPrepare, ready };
};

/**
 * markOrderReadyByPreparateur
 * 
 * Marque une commande comme prête après sa préparation par un préparateur
 * 
 * Validations:
 * - Vérifie que le préparateur est authentifié (preparateurId présent)
 * - Valide que l'ID commande est un entier positif
 * - Délègue à triggerReadyForPickup pour mettre à jour l'état et enregistrer le préparateur
 * 
 * @param {number} commandeId - ID de la commande à marquer prête
 * @param {string} preparateurId - ID du préparateur effectuant l'action
 * @returns {Promise<Commande>} La commande mise à jour avec son nouvel état et le préparateur assigné
 * @throws OrderRequestError (401) si preparateurId manquant - préparateur non authentifié
 * @throws OrderRequestError (400) si commandeId invalide - doit être un entier positif
 * @throws OrderRequestError (409) si la commande n'est pas prête selon les règles métier
 * @note Enregistre l'ID du préparateur dans la commande pour audit et traçabilité
 * @note Notifie les observateurs lors de la mise à jour
 */
export const markOrderReadyByPreparateur = async (
  commandeId: number,
  preparateurId: string,
) => {
  if (!preparateurId) {
    throw new OrderRequestError(401, "Préparateur non authentifié");
  }

  if (!Number.isInteger(commandeId) || commandeId <= 0) {
    throw new OrderRequestError(400, "ID commande invalide");
  }

  return await triggerReadyForPickup(commandeId, preparateurId);
};
