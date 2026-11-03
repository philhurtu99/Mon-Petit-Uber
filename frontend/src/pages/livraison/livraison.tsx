import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { API_URL } from "../../config";
import { livraisonService } from "../../services/livraisonService";
import { mobileNotificationsService } from "../../services/mobileNotificationsService";
import type { PreparationOrder } from "../../services/preparateurService";
import "./livraison.css";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";


// ============================================================================
// Utilitaires formatage
// ============================================================================

/**
 * Formate un montant en devise (USD)
 */
function formatCurrency(value: number) {
  return `${value.toFixed(2)} $`;
}

/**
 * Extrait le nom complet du client, avec fallback sur email
 */
function getCustomerName(order: PreparationOrder) {
  const user = order.transaction.user;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return fullName || user?.email || "Client";
}

/**
 * Retourne l'URL complète d'une image de produit
 * Gère les URLs relatives et absolues
 */
function getProductImage(imageUrl?: string | null) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `${API_URL}${imageUrl}`;
}

/**
 * Calcule et formate le temps écoulé depuis le début de la livraison
 * Format: H:MM:SS ou M:SS
 */
function formatDeliveryElapsedTime(value?: string | null) {
  if (!value) return "0:00";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

// ============================================================================
// Composant Principal
// ============================================================================

export default function LivraisonPage() {
  // États du workflow livraison
  const [status, setStatus] = useState<
    "checking" | "idle" | "loading" | "assigned"
  >("checking");
  const [order, setOrder] = useState<PreparationOrder | null>(null);
  const [availability, setAvailability] = useState<{
    available: boolean;
    count: number;
  } | null>(null);

  // États UI et notifications
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol 
  const { helpProps } = useHelpSystem();
  
  // État pour le timer d'affichage du temps écoulé
  const [timerTick, setTimerTick] = useState(0);

  // Memos: Calculs basés sur la commande actuelle
  const itemCount = useMemo(
    () =>
      order?.transaction.items.reduce((sum, item) => sum + item.quantity, 0) ??
      0,
    [order],
  );

  const itemsSubtotal = useMemo(
    () =>
      order?.transaction.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ) ?? 0,
    [order],
  );

  const deliveryStartedAt =
    order?.deliveryPickedUpAt ?? order?.readyForPickupAt ?? order?.createdAt;

  const elapsedDeliveryTime = useMemo(
    () => formatDeliveryElapsedTime(deliveryStartedAt),
    [deliveryStartedAt, timerTick],
  );

  // =========================================================================
  // Effets: Timer pour le temps écoulé
  // =========================================================================

  /**
   * Maintient un timer à jour pour afficher le temps écoulé
   * Le timer se met à jour chaque seconde quand une livraison est en cours
   */
  useEffect(() => {
    if (!order) return;

    const intervalId = window.setInterval(() => {
      setTimerTick((currentTick) => currentTick + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [order]);

  // =========================================================================
  // Effets: Disponibilité des livraisons
  // =========================================================================

  /**
   * Rafraîchit l'état de disponibilité des livraisons
   */
  const refreshAvailability = useCallback(async () => {
    try {
      const result = await livraisonService.getAvailability();
      setAvailability(result);
    } catch {
      setAvailability(null);
    }
  }, []);

  /**
   * S'abonne aux mises à jour de disponibilité quand aucune livraison n'est en cours
   * Permet au livreur de voir en temps réel les nouvelles commandes disponibles
   */
  useEffect(() => {
    if (status !== "idle" || order) return;

    void refreshAvailability();

    return livraisonService.subscribeToAvailability((nextAvailability) => {
      setAvailability(nextAvailability);
    });
  }, [order, refreshAvailability, status]);

  // =========================================================================
  // Effets: Initialisation et souscription à la livraison actuelle
  // =========================================================================

  /**
   * À l'ouverture de la page:
   * 1. Vérifie s'il y a une livraison assignée au livreur
   * 2. S'abonne aux mises à jour en temps réel de sa livraison
   * 3. Rafraîchit la disponibilité des commandes si aucune en cours
   */
  useEffect(() => {
    const initializeLivraison = async () => {
      try {
        const result = await livraisonService.getCurrentLivraison();
        if (result.order) {
          setOrder(result.order);
          setAvailability(null);
          setStatus("assigned");
          setError("");
        } else {
          setStatus("idle");
          void refreshAvailability();
        }
      } catch (error) {
        console.error("Erreur lors de la vérification initiale:", error);
        setStatus("idle");
        void refreshAvailability();
      }
    };

    void initializeLivraison();

    return livraisonService.subscribeToCurrentLivraison((currentOrder) => {
      setOrder(currentOrder);

      if (currentOrder) {
        setAvailability(null);
        setStatus("assigned");
        setError("");
        return;
      }

      setStatus((currentStatus) =>
        currentStatus === "loading" ? currentStatus : "idle",
      );
    });
  }, [refreshAvailability]);

  // =========================================================================
  // Gestionnaires d'événements
  // =========================================================================

  /**
   * Demande l'assignation d'une livraison
   * Gère les cas de race condition où une livraison aurait pu être assignée
   */
  const handleRequestLivraison = async () => {
    try {
      setStatus("loading");
      setError("");
      setMessage("");
      const result = await livraisonService.requestLivraison();
      setOrder(result.order);
      setMessage(result.message);
      setStatus("assigned");
      void refreshAvailability();
    } catch (err: any) {
      // Vérif: Une livraison aurait pu être assignée entre temps
      const currentResult = await livraisonService
        .getCurrentLivraison()
        .catch(() => null);

      if (currentResult?.order) {
        setOrder(currentResult.order);
        setAvailability(null);
        setMessage("");
        setError("");
        setStatus("assigned");
        return;
      }

      setStatus("idle");
      setError(err.message || "Impossible de demander une livraison.");
      void refreshAvailability();
    }
  };

  /**
   * Termine la livraison actuelle
   * Marque la commande comme complétée dans le backend
   */
  const handleFinalizeLivraison = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setError("");
  if (!order) return;

  try {
    setIsCompleting(true);
    const result = await livraisonService.completeLivraison(confirmationCode);
    setOrder(null);
    setMessage(result.message);
    setStatus("idle");
    setConfirmationCode("");
    void refreshAvailability();
  } catch (err: any) {
    setError(err.message || "Code de confirmation invalide.");
  } finally {
    setIsCompleting(false);
  }
};

  /**
   * Permet au livreur de s'abonner aux notifications email
   * quand une commande sera prête pour livraison
   */
  const handleSubscribeToReadyNotification = async () => {
    try {
      setIsSubscribing(true);
      setError("");
      setMessage("");
      await mobileNotificationsService.enableDeliveryReadyNotifications();
      const result = await livraisonService.subscribeToReadyNotification();
      setMessage(result.message);
    } catch (err: any) {
      setError(
        err.message ||
          "Impossible d'activer la notification pour les commandes prêtes.",
      );
    } finally {
      setIsSubscribing(false);
    }
  };

  // =========================================================================
  // Rendu
  // =========================================================================

  return (
    <div className="livraison-page">
      {/* État: Vérification initiale */}
      {status === "checking" && (
        <section className="livraison-loading" aria-live="polite">
          <RefreshCw size={36} className="livraison-spin" />
          <h1>Vérification</h1>
          <p>On regarde si une livraison est déjà assignée à ton compte.</p>
        </section>
      )}

      {/* État: Aucune livraison assignée - Attente/Recherche */}
      {status === "idle" && (
        <section className="livraison-start">
          <div className="livraison-start__icon">
            <Package size={44} />
          </div>
          <p className="livraison-kicker">Espace livreur</p>
          <h1>Demander une livraison</h1>
          <p>
            La page se mettra à jour automatiquement dès qu'une commande sera
            prête pour livraison.
          </p>

          {/* Affiche l'état de disponibilité */}
          <div className="livraison-options" {...helpProps("disponibility")}>
            {availability === null ? (
              <article className="livraison-option livraison-option--checking">
                <RefreshCw size={22} className="livraison-spin" />
                <div>
                  <strong>Recherche de commandes disponibles</strong>
                  <span>
                    On surveille les commandes prêtes pour livraison.
                  </span>
                </div>
              </article>
            ) : availability.available ? (
              <article className="livraison-option livraison-option--available">
                <CheckCircle2 size={22} />
                <div>
                  <strong>Commandes disponibles</strong>
                  <span>
                    {availability.count} livraison
                    {availability.count > 1 ? "s" : ""} prête
                    {availability.count > 1 ? "s" : ""} en ce moment
                  </span>
                </div>
              </article>
            ) : (
              <article className="livraison-option livraison-option--empty">
                <AlertCircle size={22} />
                <div>
                  <strong>Aucune commande disponible</strong>
                  <span className="livraison-notify-help">
                    Cliquez ici pour activer les notifications durant la
                    prochaine heure et savoir quand la prochaine commande sera
                    prête!
                  </span>
                  <button
                    className="livraison-notify-button"
                    type="button"
                    onClick={handleSubscribeToReadyNotification}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? (
                      <RefreshCw size={17} className="livraison-spin" />
                    ) : (
                      <Bell size={17} />
                    )}
                    {isSubscribing
                      ? "Activation..."
                      : "Activer notifications"}
                  </button>
                </div>
              </article>
            )}
          </div>

          {/* Affichage des messages d'erreur/succès */}
          {error && (
            <div className="livraison-alert livraison-alert--error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {message && (
            <div className="livraison-alert livraison-alert--success">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}

          {/* Bouton pour demander une livraison */}
          <button
            className="livraison-primary-button"
            type="button"
            onClick={handleRequestLivraison}
            disabled={!availability?.available}
            {...helpProps("delivery")}
          >
            <Package size={20} />
            {availability === null
              ? "Vérification..."
              : availability.available
                ? "Demander une livraison"
                : "Aucune livraison prête"}
          </button>
        </section>
      )}

      {/* État: Recherche d'une livraison */}
      {status === "loading" && (
        <section className="livraison-loading" aria-live="polite">
          <RefreshCw size={36} className="livraison-spin" />
          <h1>Recherche d'une livraison</h1>
          <p>On vérifie la prochaine commande prête à partir.</p>
        </section>
      )}

      {/* État: Livraison assignée et en cours */}
      {status === "assigned" && order && (
        <section className="livraison-summary">
          {/* En-tête avec ID de la commande et statut */}
          <header className="livraison-summary__header">
            <div>
              <p className="livraison-kicker">Livraison en cours</p>
              <h1>Commande #{order.id}</h1>
            </div>
            <span className="livraison-status">
              <CheckCircle2 size={18} />
              En livraison
            </span>
          </header>

          {message && (
            <div className="livraison-alert livraison-alert--success">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}

          {/* Détails de la commande (client, téléphone, temps écoulé) */}
          <details className="livraison-order-details" open {...helpProps("informations")}>
            <summary>
              <span>Informations sur la commande</span>
            </summary>

            <div className="livraison-summary-grid">
              <article className="livraison-info">
                <UserRound size={20} />
                <div>
                  <span>Client</span>
                  <strong>{getCustomerName(order)}</strong>
                  {order.transaction.user?.email && (
                    <p>{order.transaction.user.email}</p>
                  )}
                </div>
              </article>

              <article className="livraison-info">
                <Phone size={20} />
                <div>
                  <span>Téléphone</span>
                  <strong>
                    {order.transaction.user?.phone || "Téléphone non fourni"}
                  </strong>
                </div>
              </article>

              <article className="livraison-info">
                <Clock3 size={20} />
                <div>
                  <span>En livraison depuis</span>
                  <strong>{elapsedDeliveryTime}</strong>
                </div>
              </article>

              <article className="livraison-info">
                <MapPin size={20} />
                <div>
                  <span>Local</span>
                  <strong>{order.local || "Local non fourni"}</strong>
                </div>
              </article>
            </div>

            <div className="livraison-total-row">
              <div>
                <span>Total</span>
                <strong>{formatCurrency(order.transaction.total)}</strong>
              </div>
              <div>
                <span>Articles</span>
                <strong>{itemCount}</strong>
              </div>
            </div>
          </details>

          {/* Section finalisation: Code de confirmation */}
          <details className="livraison-order-details livraison-finalization" {...helpProps("code")}>
            <summary>
              <span>Finalisation de la commande</span>
            </summary>

            <form
              className="livraison-finalization-form"
              onSubmit={handleFinalizeLivraison}
            >
              <label htmlFor="livraison-confirmation-code">
                Code de confirmation
              </label>
              <div className="livraison-code-row">
                <input
                  id="livraison-confirmation-code"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="_ _ _ _"
                  type="text"
                  value={confirmationCode}
                  onChange={(event) =>
                    setConfirmationCode(
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                />
                <button
                  className="livraison-complete-button"
                  type="submit"
                  disabled={isCompleting || confirmationCode.length !== 4}
                >
                  <CheckCircle2 size={20} />
                  {isCompleting ? "Fin en cours..." : "Finaliser"}
                </button>
              </div>
            </form>
          </details>

          {/* Résumé des articles à livrer */}
          <section className="livraison-items-section" {...helpProps("items")}>
            <div className="livraison-section-title">
              <PackageCheck size={20} />
              Résumé des articles
            </div>

            <ul className="livraison-items">
              {order.transaction.items.map((item) => {
                const imgSrc = getProductImage(item.product?.imageUrl);

                return (
                  <li className="livraison-item" key={item.id}>
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={item.product?.name ?? "Produit"}
                      />
                    ) : (
                      <div className="livraison-item__placeholder" />
                    )}
                    <div>
                      <strong>{item.product?.name ?? "Produit"}</strong>
                      <span>
                        Qté {item.quantity} · {formatCurrency(item.price)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="livraison-items-subtotal">
              <span>Sous-total</span>
              <strong>{formatCurrency(itemsSubtotal)}</strong>
            </div>
          </section>

          {/* Affichage des erreurs */}
          {error && (
            <div className="livraison-alert livraison-alert--error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
