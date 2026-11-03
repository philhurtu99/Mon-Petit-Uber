import { useState, useEffect, useRef } from "react";
import styles from "./orderModal.module.css";
import type { Commande, CommandeEtat } from "../../models";
import { API_URL } from "../../config";
import defaultAvatar from "../../assets/default-avatar.png";
import { ordersService } from "../../services/ordersService";
import { configService } from "../../services/configService";

interface CommandeModalProps {
  isOpen: boolean;
  onClose: () => void;
  commande: Commande | null;
}

export const etatLabels: Record<CommandeEtat, string> = {
  EN_PREPARATION: "En préparation",
  READY_FOR_PICKUP: "Prêt pour ramassage",
  READY_FOR_DELIVERY: "Prêt pour livraison",
  IN_DELIVERY: "En chemin",
  COMPLETEE: "Complétée",
  ANNULEE: "Annulée",
};

const etatColors: Record<CommandeEtat, string> = {
  EN_PREPARATION: "#f5a623",
  READY_FOR_PICKUP: "#88c057",
  READY_FOR_DELIVERY: "#88c057",
  IN_DELIVERY: "#4a9eff",
  COMPLETEE: "#9ca3af",
  ANNULEE: "#ff4d4d",
};

function getDateMs(value?: string | Date | null) {
  if (!value) return null;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function getPreparationLimitMs(commande: Commande) {
  if (
    typeof commande.preparationTimerLimitMs === "number" &&
    commande.preparationTimerLimitMs > 0
  ) {
    return commande.preparationTimerLimitMs;
  }

  const createdAt = getDateMs(commande.createdAt);
  const expiresAt = getDateMs(commande.expiresAt);

  if (createdAt === null || expiresAt === null) return 0;

  return Math.max(expiresAt - createdAt, 0);
}

function getPreparationElapsedMs(commande: Commande) {
  const limitMs = getPreparationLimitMs(commande);
  const expiresAt = getDateMs(commande.expiresAt);

  if (expiresAt === null) return 0;

  const elapsedMs = limitMs - (expiresAt - Date.now());

  return Math.min(Math.max(elapsedMs, 0), limitMs);
}

function formatTimer(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export default function CommandeModal({
  isOpen,
  onClose,
  commande,
}: CommandeModalProps) {
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [preparationTimer, setPreparationTimer] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showStalledCancelConfirm, setShowStalledCancelConfirm] =
    useState(false);
  const [isStalled, setIsStalled] = useState(false);
  const [stalledTimeoutMs, setStalledTimeoutMs] = useState(15 * 60 * 1000);
  const refreshRequestedForOrder = useRef<number | null>(null);

  useEffect(() => {
    configService
      .getLoyaltyConfig()
      .then((config) => setStalledTimeoutMs(config.stalledOrderTimeoutMs))
      .catch((err) =>
        console.error("Erreur chargement config stalled timeout:", err),
      );
  }, []);

  useEffect(() => {
    if (!isOpen || !commande) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, commande]);

  useEffect(() => {
    if (!isOpen || !commande) return;

    const checkStatus = () => {
      // Logic pour le timer de préparation (existant)
      if (commande.etat === "EN_PREPARATION") {
        const elapsedMs = getPreparationElapsedMs(commande);
        const limitMs = getPreparationLimitMs(commande);
        setPreparationTimer(formatTimer(elapsedMs));

        if (
          limitMs > 0 &&
          elapsedMs >= limitMs &&
          refreshRequestedForOrder.current !== commande.id
        ) {
          refreshRequestedForOrder.current = commande.id;
          window.dispatchEvent(new Event("commande:refresh"));
          window.dispatchEvent(new Event("credit:refresh"));
        }
      } else {
        setPreparationTimer(null);
      }

      // Logic pour le "stalled state" (15 min sans livreur)
      if (commande.etat === "READY_FOR_DELIVERY" && commande.readyForPickupAt) {
        const readyAt = new Date(commande.readyForPickupAt).getTime();
        const stalled = Date.now() - readyAt > stalledTimeoutMs;
        setIsStalled(stalled);
      } else {
        setIsStalled(false);
      }
    };

    checkStatus();
    const interval = window.setInterval(checkStatus, 1000);

    return () => window.clearInterval(interval);
  }, [isOpen, commande, stalledTimeoutMs]);

  const livreurAvatar = commande?.livreur?.profilePicture
    ? commande.livreur.profilePicture.startsWith("http")
      ? commande.livreur.profilePicture
      : `${API_URL}${commande.livreur.profilePicture}`
    : defaultAvatar;

  if (!isOpen) return null;

  if (!commande) {
    return (
      <div className={styles["modal-popup"]}>
        <p className={styles["modal-no-commande"]}>Aucune commande en cours.</p>
        <button className={styles["modal-popup-btn"]} onClick={onClose}>
          Fermer
        </button>
      </div>
    );
  }

  const canCancelOrder =
    commande.etat === "EN_PREPARATION" &&
    !commande.preparateurId &&
    !commande.readyForPickupAt;

  const handleCancelOrder = () => {
    if (!commande || isCancelling) return;
    setShowCancelConfirm(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!commande || isCancelling) return;

    setIsCancelling(true);

    try {
      await ordersService.cancelOrder(commande.id);
      window.dispatchEvent(new Event("commande:refresh"));
      window.dispatchEvent(new Event("credit:refresh"));
      onClose();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erreur lors de l'annulation",
      );
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  const handleSwitchToTakeout = async () => {
    if (!commande || isCancelling) return;
    setIsCancelling(true);
    try {
      await ordersService.switchToTakeout(commande.id);
      window.dispatchEvent(new Event("commande:refresh"));
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erreur lors du changement",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelStalled = () => {
    if (!commande || isCancelling) return;
    setShowStalledCancelConfirm(true);
  };

  const handleConfirmCancelStalled = async () => {
    if (!commande || isCancelling) return;

    setIsCancelling(true);

    try {
      await ordersService.cancelStalledOrder(commande.id);
      window.dispatchEvent(new Event("commande:refresh"));
      window.dispatchEvent(new Event("credit:refresh"));
      onClose();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erreur lors de l'annulation",
      );
    } finally {
      setIsCancelling(false);
      setShowStalledCancelConfirm(false);
    }
  };

  const hasCookedItems = commande.transaction?.items.some(
    (item) => item.isCooked,
  );

  return (
    <div className={styles["modal-overlay"]} onMouseDown={onClose}>
      <div
        className={styles["modal-content"]}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className={styles["modal-close-btn"]}
          onClick={onClose}
          aria-label="Fermer"
        >
          &times;
        </button>
        <div className={styles["modal-body"]}>
          <h2 className={styles["modal-title"]}>Ma commande</h2>
          <>
            {/* Badge état */}
            <div className={styles["modal-etat"]}>
              <span
                className={styles["modal-etat-badge"]}
                style={{
                  backgroundColor: etatColors[commande.etat] + "22",
                  color: etatColors[commande.etat],
                }}
              >
                {etatLabels[commande.etat]}
              </span>
              {commande.etat === "EN_PREPARATION" && (
                <span className={styles["modal-preparation-timer"]}>
                  {preparationTimer}
                </span>
              )}
            </div>

            {/* Warning Stalled Order */}
            {isStalled && (
              <div className={styles["stalled-warning"]}>
                <p className={styles["stalled-text"]}>
                  Aucun livreur n'a pu être trouvé pour le moment.
                </p>
                <div className={styles["stalled-actions"]}>
                  <button
                    className={styles["takeout-btn"]}
                    onClick={handleSwitchToTakeout}
                    disabled={isCancelling}
                  >
                    Aller chercher ma commande
                  </button>
                  <button
                    className={styles["cancel-stalled-btn"]}
                    onClick={handleCancelStalled}
                    disabled={isCancelling || hasCookedItems}
                  >
                    Annuler la commande
                  </button>
                  {hasCookedItems && (
                    <p className={styles["cooked-info"]}>
                      Impossible d'annuler : contient des plats cuisinés.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Carte livreur */}
            {commande.livreur && (
              <div className={styles["modal-livreur"]}>
                <img
                  src={livreurAvatar}
                  alt={commande.livreur.firstName}
                  className={styles["modal-livreur-avatar"]}
                />
                <div className={styles["modal-livreur-info"]}>
                  <span className={styles["modal-livreur-name"]}>
                    {commande.livreur.firstName} {commande.livreur.lastName}
                  </span>
                  <span className={styles["modal-livreur-role"]}>
                    Votre livreur
                  </span>
                </div>
              </div>
            )}

            {/* Infos commande */}
            <div className={styles["modal-info"]}>
              <span className={styles["modal-info-label"]}>Commande</span>
              <span className={styles["modal-info-value"]}>#{commande.id}</span>
            </div>

            {commande.deliveryPickedUpAt && (
              <div className={styles["modal-info"]}>
                <span className={styles["modal-info-label"]}>
                  Pris en charge à
                </span>
                <span className={styles["modal-info-value"]}>
                  {new Date(commande.deliveryPickedUpAt!).toLocaleTimeString(
                    "fr-CA",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </div>
            )}

            {/* Articles */}
            {commande.transaction && (
              <>
                <h3 className={styles["modal-section-title"]}>Articles</h3>
                {(itemsExpanded
                  ? commande.transaction.items
                  : commande.transaction.items.slice(0, 3)
                ).map((item) => (
                  <div key={item.id} className={styles["modal-item"]}>
                    <img
                      src={
                        item.imageUrl?.startsWith("http")
                          ? item.imageUrl
                          : `${API_URL}${item.imageUrl}?t=${Date.now()}`
                      }
                      alt={item.name}
                      className={styles["modal-item-img"]}
                    />
                    <div className={styles["modal-item-info"]}>
                      <span className={styles["modal-item-name"]}>
                        {item.name}
                      </span>
                      <span className={styles["modal-item-qty"]}>
                        x{item.quantity}
                      </span>
                    </div>
                    <span className={styles["modal-item-price"]}>
                      {item.lineTotal.toFixed(2)} $
                    </span>
                  </div>
                ))}

                {commande.transaction.items.length > 3 && (
                  <button
                    className={styles["modal-accordion-btn"]}
                    onClick={() => setItemsExpanded((prev) => !prev)}
                  >
                    {itemsExpanded
                      ? "Voir moins"
                      : `+ ${commande.transaction.items.length - 3} autre(s) article(s)`}
                  </button>
                )}

                <div className={styles["modal-total"]}>
                  <span>Total</span>
                  <span>{commande.transaction.total.toFixed(2)} $</span>
                </div>
              </>
            )}

            {/* Code confirmation */}
            {(commande.etat === "IN_DELIVERY" ||
              commande.etat === "READY_FOR_PICKUP") &&
              commande.codeConfirmation && (
                <div className={styles["modal-code-section"]}>
                  <p className={styles["modal-code-label"]}>
                    Code à donner au livreur
                  </p>
                  <div className={styles["modal-code"]}>
                    {commande.codeConfirmation}
                  </div>
                </div>
              )}
          </>

          {canCancelOrder && (
            <button
              className={styles["modal-cancel-btn"]}
              onClick={handleCancelOrder}
              disabled={isCancelling}
            >
              {isCancelling ? "Annulation..." : "Annuler"}
            </button>
          )}

          <button className={styles["modal-cta-btn"]} onClick={onClose}>
            Fermer
          </button>
        </div>

        {(showCancelConfirm || showStalledCancelConfirm) && (
          <div className={styles["modal-confirm-overlay"]}>
            <div className={styles["modal-confirm-box"]}>
              <p className={styles["modal-confirm-text"]}>
                Êtes-vous certain de vouloir annuler la commande ?
              </p>
              <div className={styles["modal-confirm-actions"]}>
                <button
                  className={styles["modal-confirm-no"]}
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setShowStalledCancelConfirm(false);
                  }}
                  disabled={isCancelling}
                >
                  Non
                </button>
                <button
                  className={styles["modal-confirm-yes"]}
                  onClick={
                    showCancelConfirm
                      ? handleConfirmCancelOrder
                      : handleConfirmCancelStalled
                  }
                  disabled={isCancelling}
                >
                  Oui
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
