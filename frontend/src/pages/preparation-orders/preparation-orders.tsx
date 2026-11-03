import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  BellRing,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { API_URL } from "../../config";
import {
  preparateurService,
  type PreparationOrderType,
  type PreparationOrder,
} from "../../services/preparateurService";
import { mobileNotificationsService } from "../../services/mobileNotificationsService";
import { formatElapsedTime } from "../orders-time";
import "./preparation-orders.css";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

type PreparationFilter = "ALL" | PreparationOrderType;

function formatCurrency(value: number) {
  return `${value.toFixed(2)} $`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCustomerName(order: PreparationOrder) {
  const user = order.transaction.user;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return fullName || user?.email || "Client";
}

function getItemsCount(order: PreparationOrder) {
  return order.transaction.items.reduce((sum, item) => sum + item.quantity, 0);
}

function getProductImage(imageUrl?: string | null) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `${API_URL}${imageUrl}`;
}

export default function PreparationOrders() {
  const [orders, setOrders] = useState<PreparationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);
  const [filter, setFilter] = useState<PreparationFilter>("ALL");
  const [isPreparationModeEnabled, setIsPreparationModeEnabled] = useState(
    () => localStorage.getItem("preparationModeEnabled") !== "false",
  );
  const knownOrderIds = useRef<Set<number>>(new Set());
  const hasInitializedOrderStream = useRef(false);
  const [checkedItems, setCheckedItems] = useState<
    Record<number, Record<number, boolean>>
  >({});

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol 
  const { helpProps } = useHelpSystem();
  
  const stats = useMemo(
    () => ({
      total: orders.length,
      livraison: orders.filter((order) => order.type === "LIVRAISON").length,
      pickup: orders.filter((order) => order.type === "PICKUP").length,
    }),
    [orders],
  );

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [orders],
  );

  const filteredOrders = useMemo(
    () =>
      filter === "ALL"
        ? sortedOrders
        : sortedOrders.filter((order) => order.type === filter),
    [filter, sortedOrders],
  );

  const emptyMessage =
    filter === "LIVRAISON"
      ? "Aucune livraison à préparer."
      : filter === "PICKUP"
        ? "Aucun ramassage à préparer."
        : "Aucune commande à préparer.";

  const loadOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError("");
      const data = await preparateurService.getOrdersToPrepare();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les commandes.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    return preparateurService.subscribeToOrdersUpdates((board) => {
      setOrders(board.toPrepare);

      const nextOrderIds = new Set(board.toPrepare.map((order) => order.id));

      if (!hasInitializedOrderStream.current) {
        knownOrderIds.current = nextOrderIds;
        hasInitializedOrderStream.current = true;
        return;
      }

      const newOrders = board.toPrepare.filter(
        (order) => !knownOrderIds.current.has(order.id),
      );

      knownOrderIds.current = nextOrderIds;

      if (newOrders.length === 0) return;

      const [order] = newOrders;
      const suffix =
        newOrders.length > 1 ? ` et ${newOrders.length - 1} autre(s)` : "";
      const customerName = getCustomerName(order);
      const itemsCount = getItemsCount(order);

      window.dispatchEvent(
        new CustomEvent("preparation:new-order-notification", {
          detail: {
            orderId: order.id,
            type: order.type,
            variant: "new",
            message: `${
              order.type === "LIVRAISON"
                ? `Nouvelle Livraison #${order.id}`
                : `Nouveau Ramassage #${order.id}`
            }${suffix}`,
            customerName,
            total: order.transaction.total,
            itemsCount,
          },
        }),
      );
    });
  }, []);

  const handleMarkReady = async (orderId: number) => {
    try {
      setMarkingId(orderId);
      setError("");
      setSuccess("");
      const result = await preparateurService.markOrderReady(orderId);
      setOrders((current) => current.filter((order) => order.id !== orderId));
      setSuccess(result.message);
      window.setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      const message = err.message || "Impossible de marquer la commande prête.";
      const failedOrder = orders.find((order) => order.id === orderId);

      setError(message);
      window.dispatchEvent(
        new CustomEvent("preparation:new-order-notification", {
          detail: {
            orderId,
            type: failedOrder?.type ?? "PICKUP",
            variant: "error",
            message,
          },
        }),
      );
    } finally {
      setMarkingId(null);
    }
  };

  const handleItemCheck = (orderId: number, itemId: number, checked: boolean) => {
    setCheckedItems((current) => ({
      ...current,
      [orderId]: {
        ...current[orderId],
        [itemId]: checked,
      },
    }));
  };

  const areAllItemsChecked = (order: PreparationOrder) =>
    order.transaction.items.length > 0 &&
    order.transaction.items.every((item) =>
      Boolean(checkedItems[order.id]?.[item.id]),
    );

  const handlePreparationModeToggle = () => {
    const enabled = !isPreparationModeEnabled;

    setIsPreparationModeEnabled(enabled);
    localStorage.setItem("preparationModeEnabled", enabled ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent("preparation:mode-change", {
        detail: { enabled },
      }),
    );
  };

  const handleEnablePushNotifications = async () => {
    if (enablingPush) return;

    try {
      setEnablingPush(true);
      setError("");
      await mobileNotificationsService.enablePreparationNotifications();
      setSuccess("Notifications locales activées sur cet appareil.");
      window.setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Impossible d'activer les notifications.");
    } finally {
      setEnablingPush(false);
    }
  };

  const renderOrder = (order: PreparationOrder) => {
    const allItemsChecked = areAllItemsChecked(order);

    return (
      <article className="preparation-order" key={order.id}>
        <div className="preparation-order-main">
          <div className="preparation-order-topline">
            <span className="preparation-order-number">
              Commande #{order.id}
            </span>
            <span
              className={`preparation-badge ${
                order.type === "LIVRAISON"
                  ? "preparation-badge--delivery"
                  : "preparation-badge--pickup"
              }`}
            >
              {order.type === "LIVRAISON" ? (
                <Truck size={15} />
              ) : (
                <ShoppingBag size={15} />
              )}
              {order.type === "LIVRAISON" ? "Livraison" : "Ramassage"}
            </span>
          </div>

          <div className="preparation-order-meta">
            <span>{getCustomerName(order)}</span>
            <span>
              <Clock3 size={15} />
              {formatTime(order.createdAt)}
            </span>
            <span>
              <Clock3 size={15} />
              Créée depuis {formatElapsedTime(order.createdAt)}
            </span>
            <span>{formatCurrency(order.transaction.total)}</span>
          </div>

          <ul className="preparation-items">
            {order.transaction.items.map((item) => {
              const imgSrc = getProductImage(item.product?.imageUrl);

              return (
                <li className="preparation-item" key={item.id}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={item.product?.name ?? "Produit"} />
                  ) : (
                    <div className="preparation-item-placeholder" />
                  )}
                  <div>
                    <strong>{item.product?.name ?? "Produit"}</strong>
                    <span>
                      Qté {item.quantity} · {formatCurrency(item.price)}
                    </span>
                  </div>
                  <label className="preparation-item-check">
                    <input
                      type="checkbox"
                      checked={Boolean(checkedItems[order.id]?.[item.id])}
                      onChange={(event) =>
                        handleItemCheck(
                          order.id,
                          item.id,
                          event.target.checked,
                        )
                      }
                      aria-label={`Marquer ${
                        item.product?.name ?? "produit"
                      } comme préparé`}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <button
          className="preparation-ready"
          type="button"
          onClick={() => handleMarkReady(order.id)}
          disabled={markingId === order.id || !allItemsChecked}
        >
          <PackageCheck size={18} />
          {markingId === order.id ? "Confirmation..." : "Marquer prête"}
        </button>
      </article>
    );
  };

  return (
    <div className="preparation-page">
      <header className="preparation-header">
        <div>
          <p className="preparation-kicker">Espace préparateur</p>
          <h1 className="preparation-title">Préparation des commandes</h1>
          <p className="preparation-subtitle">
            Commandes payées en attente de préparation.
          </p>
        </div>

        <div className="preparation-header-actions">
          <button
            className="preparation-refresh"
            type="button"
            disabled={enablingPush}
            onClick={handleEnablePushNotifications}
            title="Recevoir les nouvelles commandes sur cet appareil"
          >
            <BellRing size={18} />
            {enablingPush ? "Activation..." : "Activer notifications"}
          </button>
          <button
            className={`preparation-mode-toggle ${
              isPreparationModeEnabled ? "is-active" : ""
            }`}
            type="button"
            onClick={handlePreparationModeToggle}
            aria-pressed={isPreparationModeEnabled}
            {...helpProps("moderator")}
          >
            <span>Mode préparateur</span>
            <span className="preparation-mode-switch" aria-hidden="true">
              <span />
            </span>
          </button>
        </div>
      </header>

      <section className="preparation-stats" aria-label="Résumé préparation" {...helpProps("indicators")}>
        <div className="preparation-stat">
          <ClipboardList size={22} />
          <span>{stats.total}</span>
          <p>À préparer</p>
        </div>
        <div className="preparation-stat">
          <Truck size={22} />
          <span>{stats.livraison}</span>
          <p>Livraisons</p>
        </div>
        <div className="preparation-stat">
          <ShoppingBag size={22} />
          <span>{stats.pickup}</span>
          <p>Ramassages</p>
        </div>
      </section>

      <div className="preparation-filter" aria-label="Filtrer les commandes" {...helpProps("filters")}>
        <button
          className={filter === "ALL" ? "is-active" : ""}
          type="button"
          onClick={() => setFilter("ALL")}
        >
          Tout
        </button>
        <button
          className={filter === "LIVRAISON" ? "is-active" : ""}
          type="button"
          onClick={() => setFilter("LIVRAISON")}
        >
          Livraisons
        </button>
        <button
          className={filter === "PICKUP" ? "is-active" : ""}
          type="button"
          onClick={() => setFilter("PICKUP")}
        >
          Ramassages
        </button>
      </div>

      {error && (
        <div className="preparation-alert preparation-alert--error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="preparation-alert preparation-alert--success">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {loading ? (
        <div className="preparation-state">
          <RefreshCw size={22} className="preparation-spin" />
          Chargement des commandes...
        </div>
      ) : (
        <section className="preparation-section" {...helpProps("toPrepare")}>
          <div className="preparation-section-header">
            <h2>À préparer</h2>
            <span>{filteredOrders.length}</span>
          </div>
          {filteredOrders.length === 0 ? (
            <div className="preparation-state">
              <PackageCheck size={28} />
              {emptyMessage}
            </div>
          ) : (
            <div className="preparation-list">
              {filteredOrders.map((order) => renderOrder(order))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
