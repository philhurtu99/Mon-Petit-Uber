import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  formatCurrency,
  formatTime,
  getCustomerName,
  getProductImage,
  getReadyLabel,
  getReadyBadgeClass,
  sortReadyOrders,
  filterOrdersByType,
  filterOrdersByProgress,
  filterOrdersByDeliveryState,
  getEmptyStateMessage,
  getDeliveryStateEmptyMessage,
  ordersService,
  type TrackingDeliveryStateFilter,
  type TrackingFilter,
} from "../../services/ordersService";
import { type PreparationOrder } from "../../services/preparateurService";
import { formatElapsedTime } from "../orders-time";
import "../preparation-orders/preparation-orders.css";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

export default function OrderTracking() {
  const [readyOrders, setReadyOrders] = useState<PreparationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TrackingFilter>("ALL");
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deliveryStateFilter, setDeliveryStateFilter] =
    useState<TrackingDeliveryStateFilter>("ALL_DELIVERY_STATES");

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol 
  const { helpProps } = useHelpSystem();

  const sortedReadyOrders = useMemo(
    () => sortReadyOrders(readyOrders),
    [readyOrders],
  );

  const filteredReadyOrders = useMemo(
    () =>
      filterOrdersByDeliveryState(
        filterOrdersByProgress(
          filterOrdersByType(sortedReadyOrders, filter),
        ),
        deliveryStateFilter,
      ),
    [deliveryStateFilter, filter, sortedReadyOrders],
  );

  const emptyMessage =
    getDeliveryStateEmptyMessage(deliveryStateFilter) ??
    getEmptyStateMessage(filter);

  const loadReadyOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError("");
      const orders = await ordersService.getTrackingOrders();
      setReadyOrders(orders);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les commandes prêtes.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadReadyOrders();
  }, [loadReadyOrders]);

  useEffect(() => {
    return ordersService.subscribeToTrackingOrdersUpdates(setReadyOrders);
  }, []);

  const handleConfirmCode = async (orderId: number) => {
    if (confirmCode.length < 4) {
      setConfirmError("4 chiffres requis");
      return;
    }
    try {
      setConfirmLoading(true);
      await ordersService.confirmCode(orderId, confirmCode);
      setConfirmingOrderId(null);
      setConfirmCode("");
      setConfirmError("");
      void loadReadyOrders();
    } catch (err: any) {
      setConfirmError(err.message || "Code incorrect");
      setConfirmCode("");
    } finally {
      setConfirmLoading(false);
    }
  };
  const selectTypeFilter = (nextFilter: TrackingFilter) => {
    setFilter(nextFilter);

    if (nextFilter !== "LIVRAISON") {
      setDeliveryStateFilter("ALL_DELIVERY_STATES");
    }
  };

  const selectDeliveryStateFilter = (nextFilter: TrackingDeliveryStateFilter) => {
    setDeliveryStateFilter(nextFilter);
  };

  return (
    <div className="preparation-page">
      <header className="preparation-header">
        <div>
          <p className="preparation-kicker">Espace employé</p>
          <h1 className="preparation-title">Suivi des commandes</h1>
          <p className="preparation-subtitle">
            Liste complète des commandes.
          </p>
        </div>

        <button
          className="preparation-refresh"
          type="button"
          onClick={() => void loadReadyOrders()}
          disabled={loading}
          {...helpProps("refresh")}
        >
          <RefreshCw size={18} />
          Actualiser
        </button>
      </header>

      <div className="preparation-filter" aria-label="Filtrer les commandes" {...helpProps("filters")}>
        <button
          className={filter === "ALL" ? "is-active" : ""}
          type="button"
          onClick={() => selectTypeFilter("ALL")}
        >
          Tout
        </button>
        <button
          className={filter === "LIVRAISON" ? "is-active" : ""}
          type="button"
          onClick={() => selectTypeFilter("LIVRAISON")}
        >
          Livraisons
        </button>
        <button
          className={filter === "PICKUP" ? "is-active" : ""}
          type="button"
          onClick={() => selectTypeFilter("PICKUP")}
        >
          Ramassages
        </button>
      </div>

      {filter === "LIVRAISON" && (
        <div
          className="preparation-filter preparation-filter--delivery-state"
          aria-label="Filtrer les livraisons par état"
          {...helpProps("informations")}
        >
          <button
            className={
              deliveryStateFilter === "ALL_DELIVERY_STATES" ? "is-active" : ""
            }
            type="button"
            onClick={() => selectDeliveryStateFilter("ALL_DELIVERY_STATES")}
          >
            Tous états
          </button>
          <button
            className={
              deliveryStateFilter === "EN_PREPARATION" ? "is-active" : ""
            }
            type="button"
            onClick={() => selectDeliveryStateFilter("EN_PREPARATION")}
          >
            En préparation
          </button>
          <button
            className={
              deliveryStateFilter === "READY_FOR_DELIVERY" ? "is-active" : ""
            }
            type="button"
            onClick={() => selectDeliveryStateFilter("READY_FOR_DELIVERY")}
          >
            Prêtes
          </button>
          <button
            className={deliveryStateFilter === "IN_DELIVERY" ? "is-active" : ""}
            type="button"
            onClick={() => selectDeliveryStateFilter("IN_DELIVERY")}
          >
            En livraison
          </button>
        </div>
      )}

      {filter === "PICKUP" && (
        <div
          className="preparation-filter preparation-filter--delivery-state"
          aria-label="Filtrer les ramassages par état"
          {...helpProps("status")}
        >
          <button
            className={
              deliveryStateFilter === "ALL_DELIVERY_STATES" ? "is-active" : ""
            }
            type="button"
            onClick={() => selectDeliveryStateFilter("ALL_DELIVERY_STATES")}
          >
            Tous états
          </button>
          <button
            className={
              deliveryStateFilter === "EN_PREPARATION" ? "is-active" : ""
            }
            type="button"
            onClick={() => selectDeliveryStateFilter("EN_PREPARATION")}
          >
            En préparation
          </button>
          <button
            className={
              deliveryStateFilter === "READY_FOR_DELIVERY" ? "is-active" : ""
            }
            type="button"
            onClick={() => selectDeliveryStateFilter("READY_FOR_DELIVERY")}
          >
            Prêts
          </button>
        </div>
      )}

      {error && (
        <div className="preparation-alert preparation-alert--error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="preparation-state">
          <RefreshCw size={22} className="preparation-spin" />
          Chargement des commandes...
        </div>
      ) : (
        <section className="preparation-section" {...helpProps("orders")}>
          <div className="preparation-section-header">
            <h2>Commandes suivies</h2>
            <span>{filteredReadyOrders.length}</span>
          </div>

          {filteredReadyOrders.length === 0 ? (
            <div className="preparation-state">
              <PackageCheck size={28} />
              {emptyMessage}
            </div>
          ) : (
            <div className="preparation-list">
              {filteredReadyOrders.map((order) => {
                return (
                  <article className="preparation-order" key={order.id}>
                    <div className="preparation-order-main">
                      <div className="preparation-order-topline">
                        <span className="preparation-order-number">
                          Commande #{order.id}
                        </span>
                        <span
                          className={`preparation-badge ${order.type === "LIVRAISON"
                            ? "preparation-badge--delivery"
                            : "preparation-badge--pickup"
                            }`}
                        >
                          {order.type === "LIVRAISON" ? (
                            <Truck size={15} />
                          ) : (
                            <ShoppingBag size={15} />
                          )}
                          {order.type === "LIVRAISON"
                            ? "Livraison"
                            : "Ramassage"}
                        </span>
                        <span
                          className={`preparation-badge ${getReadyBadgeClass(
                            order,
                          )}`}
                        >
                          <CheckCircle2 size={15} />
                          {getReadyLabel(order.type, order.etat)}
                        </span>

                        {order.type === "PICKUP" && (
                          confirmingOrderId === order.id ? (
                            <div className="preparation-code-form">
                              <div className="preparation-code-row">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={4}
                                  placeholder="0000"
                                  value={confirmCode}
                                  autoFocus
                                  onChange={(e) => {
                                    if (/^\d*$/.test(e.target.value)) {
                                      setConfirmCode(e.target.value);
                                      setConfirmError("");
                                    }
                                  }}
                                  className={`preparation-code-field ${confirmError ? "preparation-code-field--error" : ""}`}
                                />
                                <button
                                  className="preparation-code-submit"
                                  onClick={() => handleConfirmCode(order.id)}
                                  disabled={confirmLoading || confirmCode.length < 4}
                                >
                                  {confirmLoading ? "..." : <CheckCircle2 size={18} />}
                                </button>
                              </div>
                              {confirmError && (
                                <p className="preparation-code-error">{confirmError}</p>
                              )}
                            </div>
                          ) : (
                            <button
                              className="preparation-confirm-code"
                              type="button"
                              onClick={() => {
                                setConfirmingOrderId(order.id);
                                setConfirmCode("");
                                setConfirmError("");
                              }}
                            >
                              Confirmer le code
                            </button>
                          )
                        )}

                      </div>

                      <div className="preparation-order-meta">
                        <span>{getCustomerName(order)}</span>
                        <span>
                          <Clock3 size={15} />
                          {formatTime(order.createdAt)}
                        </span>
                        <span>
                          <Clock3 size={15} />
                          {order.etat === "EN_PREPARATION"
                            ? "Créée il y a "
                            : order.etat === "IN_DELIVERY"
                              ? "En livraison depuis "
                              : "Prête depuis "}
                          {formatElapsedTime(
                            order.etat === "EN_PREPARATION"
                              ? order.createdAt
                              : order.etat === "IN_DELIVERY"
                                ? order.deliveryPickedUpAt ??
                                order.readyForPickupAt ??
                                order.createdAt
                                : order.readyForPickupAt ?? order.createdAt,
                          )}
                        </span>
                        <span>{formatCurrency(order.transaction.total)}</span>
                      </div>

                      <ul className="preparation-items">
                        {order.transaction.items.map((item) => {
                          const imgSrc = getProductImage(item.product?.imageUrl);

                          return (
                            <li className="preparation-item" key={item.id}>
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={item.product?.name ?? "Produit"}
                                />
                              ) : (
                                <div className="preparation-item-placeholder" />
                              )}
                              <div>
                                <strong>
                                  {item.product?.name ?? "Produit"}
                                </strong>
                                <span>
                                  Qté {item.quantity} ·{" "}
                                  {formatCurrency(item.price)}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
