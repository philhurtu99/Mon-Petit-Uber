import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Package,
  Star,
} from "lucide-react";
import "./AdminClient.css";
import {
  adminClientService,
  type AdminClientSummary,
  type AdminClientDetails,
  type AdminClientHabit,
} from "../../services/adminClientService";
import { API_URL } from "../../config";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";
import PaginationControls from "../../components/pagination/pagination";
import defaultAvatar from "../../assets/default-avatar.png";
import { HelpModal } from "../../components";
import {
  capLoyaltyPoints,
  getLoyaltyDollarValue,
  useLoyaltyConfig,
} from "../../hooks/useLoyaltyConfig";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

 export default function AdminClient() {
  const [clients, setClients] = useState<AdminClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedClient, setSelectedClient] =
    useState<AdminClientDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [habits, setHabits] = useState<AdminClientHabit[]>([]);
  const [habitPeriod, setHabitPeriod] = useState<"day" | "month">("month");
  const [loadingHabits, setLoadingHabits] = useState(false);

  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [pointsDelta, setPointsDelta] = useState("");
  const [updatingPoints, setUpdatingPoints] = useState(false);

  const [clientPage, setClientPage] = useState(0);
  const [clientsRowsPerPage, setClientsRowsPerPage] = useState(15);

  const [orderPage, setOrderPage] = useState(0);
  const [ordersRowsPerPage, setOrdersRowsPerPage] = useState(15);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const loyaltyConfig = useLoyaltyConfig();


 const { helpProps } = useHelpSystem();
  
  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const selectedLoyaltyPoints = selectedClient
    ? capLoyaltyPoints(selectedClient.loyaltyPoints, loyaltyConfig)
    : 0;
  const selectedLoyaltyDollarValue = getLoyaltyDollarValue(
    selectedLoyaltyPoints,
    loyaltyConfig,
  );
  const maxAddablePoints =
    selectedClient && loyaltyConfig
      ? Math.max(loyaltyConfig.loyaltyMaxPoints - selectedLoyaltyPoints, 0)
      : null;
  const adminPointsStep = loyaltyConfig?.loyaltyAdminAdjustmentStepPoints ?? 10;
  const roundAdminPointsDelta = (value: number) => {
    if (!Number.isFinite(value)) return 0;

    const rounded =
      Math.sign(value) *
      Math.round(Math.abs(value) / adminPointsStep) *
      adminPointsStep;

    return Object.is(rounded, -0) ? 0 : rounded;
  };

  const normalizePointsDeltaInput = () => {
    if (!pointsDelta.trim()) return;

    const roundedDelta = roundAdminPointsDelta(Number(pointsDelta));
    setPointsDelta(roundedDelta === 0 ? "" : String(roundedDelta));
  };

  useEffect(() => {
    setLoading(true);
    adminClientService
      .getAll()
      .then(setClients)
      .catch(() => showToast("error", "Erreur lors du chargement des clients"))
      .finally(() => setLoading(false));
  }, []);

  const openClient = async (id: string) => {
    setOrderPage(0);
    setLoadingDetails(true);
    setExpandedOrderId(null);
    try {
      const [details, h] = await Promise.all([
        adminClientService.getById(id),
        adminClientService.getHabits(id, habitPeriod),
      ]);
      setSelectedClient(details);
      setHabits(h);
    } catch {
      showToast("error", "Erreur lors du chargement des détails");
    } finally {
      setLoadingDetails(false);
    }
  };

  const closePanel = () => {
    setSelectedClient(null);
    setHabits([]);
    setExpandedOrderId(null);
    setPointsDelta("");
    setIsHelpOpen(false);
  };

  const switchHabitPeriod = async (period: "day" | "month") => {
    if (!selectedClient || period === habitPeriod) return;
    setHabitPeriod(period);
    setLoadingHabits(true);
    try {
      const h = await adminClientService.getHabits(selectedClient.id, period);
      setHabits(h);
    } catch {
      showToast("error", "Erreur lors du chargement des habitudes");
    } finally {
      setLoadingHabits(false);
    }
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      await adminClientService.exportJson();
      showToast("success", "Export JSON téléchargé");
    } catch {
      showToast("error", "Erreur lors de l'export JSON");
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await adminClientService.exportCsv();
      showToast("success", "Export CSV téléchargé");
    } catch {
      showToast("error", "Erreur lors de l'export CSV");
    } finally {
      setExportingCsv(false);
    }
  };

  /*
   * Met à jour les points de fidélité du client sélectionné.
   *
   * @param delta - Le nombre de points à ajouter ou soustraire.
   */
  const handleAdjustPoints = async () => {
    if (!selectedClient) return;
    const rawDelta = Number(pointsDelta);
    const delta = roundAdminPointsDelta(rawDelta);

    if (!Number.isFinite(rawDelta) || delta === 0) {
      showToast(
        "error",
        `Entrez au moins ${adminPointsStep} ou -${adminPointsStep} points.`,
      );
      return;
    }

    // Vérifie si le delta dépasse le nombre de points maximum ajoutables
    // Si oui, affiche un message d'erreur et arrête la mise à jour
    if (maxAddablePoints !== null && delta > maxAddablePoints) {
      showToast(
        "error",
        maxAddablePoints > 0
          ? `Impossible d'ajouter plus de ${maxAddablePoints.toLocaleString("fr-CA")} points à ce client.`
          : "Ce client a déjà atteint le maximum de points.",
      );
      return;
    }

    setUpdatingPoints(true);
    try {
      const result = await adminClientService.adjustLoyaltyPoints(
        selectedClient.id,
        delta,
      );
      setSelectedClient({
        ...selectedClient,
        loyaltyPoints: result.loyaltyPoints,
      });
      setClients((current) =>
        current.map((client) =>
          client.id === selectedClient.id
            ? { ...client, loyaltyPoints: result.loyaltyPoints }
            : client,
        ),
      );
      setPointsDelta("");
      window.dispatchEvent(new Event("loyalty:refresh"));
      showToast("success", "Points mis à jour");
    } catch (error: unknown) {
      showToast(
        "error",
        getErrorMessage(error, "Erreur lors de la mise à jour"),
      );
    } finally {
      setUpdatingPoints(false);
    }
  };

  const allFiltered = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();

    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      fullName.includes(q)
    );
  });

  const globalStats = useMemo(() => {
    const totalClients = clients.length;
    const totalOrders = clients.reduce((acc, c) => acc + c.ordersCount, 0);
    const totalRevenue = clients.reduce((acc, c) => acc + c.totalSpent, 0);

    return { totalClients, totalOrders, totalRevenue };
  }, [clients]);

  const maxHabitSpent =
    habits.length > 0 ? Math.max(...habits.map((h) => h.totalSpent)) : 1;

  const globalRankOf = (id: string) =>
    clients.findIndex((c) => c.id === id) + 1;

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMoney = (v: number) => `${v.toFixed(2)} $`;

  const pagedClients = allFiltered.slice(
    clientPage * clientsRowsPerPage,
    (clientPage + 1) * clientsRowsPerPage,
  );

  const avatarUrl = (pic: string | null) =>
    pic ? (pic.startsWith("http") ? pic : `${API_URL}${pic}`) : null;

  const topProducts = useMemo(() => {
    if (!selectedClient) return [];
    const counts: Record<
      string,
      { name: string; qty: number; id: string; image: string | null }
    > = {};

    selectedClient.orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!counts[item.productId]) {
          counts[item.productId] = {
            name: item.productName,
            qty: 0,
            id: item.productId,
            image: item.imageUrl,
          };
        }
        counts[item.productId].qty += item.quantity;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4); // Top 4
  }, [selectedClient]);

  const isPanelOpen = !!(selectedClient || loadingDetails);

  return (
    <div className="adc-wrapper">
      {toast && (
        <div className={`adc-toast adc-toast--${toast.type}`}>{toast.text}</div>
      )}

      <div className="adc-main">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="adc-header">
          <div>
            <h1 className="adc-title">Dashboard Clients</h1>
          </div>
          <div className="adc-header-actions" {...helpProps("header")}>
            <button
              className="adc-btn-export"
              onClick={handleExportJson}
              disabled={exportingJson}
              title="Exporter tous les clients en JSON"
            >
              <Download size={15} />
              <span>{exportingJson ? "Export..." : "Exporter JSON"}</span>
            </button>
            <button
              className="adc-btn-export adc-btn-export--csv"
              onClick={handleExportCsv}
              disabled={exportingCsv}
              title="Exporter tous les clients en CSV"
            >
              <Download size={15} />
              <span>{exportingCsv ? "Export..." : "Exporter CSV"}</span>
            </button>
          </div>
        </div>

        {/* ── Global Stats ────────────────────────────────────── */}
        {!loading && (
          <div className="adc-global-stats" {...helpProps("stats")}>
            <div className="adc-global-stat-card">
              <div className="adc-global-stat-icon adc-global-stat-icon--clients">
                <Users size={20} />
              </div>
              <div className="adc-global-stat-info">
                <span className="adc-global-stat-label">Total Clients</span>
                <span className="adc-global-stat-value">
                  {globalStats.totalClients}
                </span>
              </div>
            </div>

            <div className="adc-global-stat-card">
              <div className="adc-global-stat-icon adc-global-stat-icon--orders">
                <ShoppingBag size={20} />
              </div>
              <div className="adc-global-stat-info">
                <span className="adc-global-stat-label">Total Commandes</span>
                <span className="adc-global-stat-value">
                  {globalStats.totalOrders}
                </span>
              </div>
            </div>

            <div className="adc-global-stat-card">
              <div className="adc-global-stat-icon adc-global-stat-icon--revenue">
                <DollarSign size={20} />
              </div>
              <div className="adc-global-stat-info">
                <span className="adc-global-stat-label">Revenu Total</span>
                <span className="adc-global-stat-value">
                  {formatMoney(globalStats.totalRevenue)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Barre de recherche ───────────────────────────────── */}
        <div className="adc-search-bar" {...helpProps("search")}>
          <Search size={15} className="adc-search-icon" />
          <input
            type="text"
            className="adc-search-input"
            placeholder="Rechercher par nom ou courriel..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setClientPage(0);
            }}
          />
        </div>

        {/* ── En-têtes colonnes ────────────────────────────────── */}
        {!loading && allFiltered.length > 0 && (
          <div className="adc-list-header">
            <span className="adc-list-col adc-list-col--rank">#</span>
            <span className="adc-list-col adc-list-col--client">Client</span>
            <span className="adc-list-col adc-list-col--stats">
              Statistiques
            </span>
            <span className="adc-list-col adc-list-col--date">
              Dernier achat
            </span>
          </div>
        )}

        {/* ── Liste des clients ────────────────────────────────── */}
        {loading ? (
          <p className="adc-empty">Chargement...</p>
        ) : allFiltered.length === 0 ? (
          <p className="adc-empty">Aucun client trouvé.</p>
        ) : (
          <div className="adc-list" {...helpProps("list")}>
            {pagedClients.map((client) => (
              <div
                key={client.id}
                className="adc-row"
                onClick={() => openClient(client.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openClient(client.id)}
              >
                <span className="adc-rank">#{globalRankOf(client.id)}</span>

                <div className="adc-row-identity">
                  <img
                    src={avatarUrl(client.profilePicture) ?? defaultAvatar}
                    alt={client.firstName}
                    className="adc-row-avatar"
                    referrerPolicy="no-referrer"
                  />
                  <div className="adc-row-info">
                    <span className="adc-row-name">
                      {client.firstName} {client.lastName}
                    </span>
                    <span className="adc-row-email">{client.email}</span>
                  </div>
                </div>

                <div className="adc-row-stats">
                  <span className="adc-stat-chip adc-stat-chip--orders">
                    <ShoppingBag size={11} />
                    {client.ordersCount} commande
                    {client.ordersCount !== 1 ? "s" : ""}
                  </span>
                  <span className="adc-stat-chip adc-stat-chip--spent">
                    {formatMoney(client.totalSpent)}
                  </span>
                </div>

                <span className="adc-row-date">
                  {client.lastPurchaseDate
                    ? formatDate(client.lastPurchaseDate)
                    : "Jamais"}
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && allFiltered.length > clientsRowsPerPage && (
          <div className="adc-pagination-wrap">
            <PaginationControls
              page={clientPage}
              rowsPerPage={clientsRowsPerPage}
              total={allFiltered.length}
              onPageChange={setClientPage}
              onRowsPerPageChange={setClientsRowsPerPage}
              rowsPerPageOptions={[10, 15, 25, 50]}
            />
          </div>
        )}
      </div>

      {/* ── Overlay ─────────────────────────────────────────────── */}
      {isPanelOpen && <div className="adc-overlay" onClick={closePanel} />}

      {/* ── Panneau de détail ────────────────────────────────────── */}
      <div
        className={`adc-panel ${isPanelOpen ? "adc-panel--open" : ""}`}
      >
        {loadingDetails && !selectedClient ? (
          <div className="adc-panel-loading">Chargement du profil...</div>
        ) : selectedClient ? (
          <>
            {/* Entête panneau */}
            <div className="adc-panel-header">
              <div className="adc-panel-identity">
                <img
                  src={
                    avatarUrl(selectedClient.profilePicture) ?? defaultAvatar
                  }
                  alt={selectedClient.firstName}
                  className="adc-panel-avatar"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h2 className="adc-panel-name">
                    {selectedClient.firstName} {selectedClient.lastName}
                  </h2>
                  <span className="adc-panel-badge">
                    #{globalRankOf(selectedClient.id)} acheteur
                  </span>
                </div>
              </div>
              <button
                className="adc-panel-close"
                onClick={closePanel}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="adc-panel-body">
              {/* ── Informations personnelles ────────────────────── */}
              <section className="adc-section" {...helpProps("client-profile")}>
                <h3 className="adc-section-title">
                  <User size={14} />
                  Informations personnelles
                </h3>
                <div className="adc-info-grid">
                  <div className="adc-info-item">
                    <Mail size={13} />
                    <span>{selectedClient.email}</span>
                  </div>
                  <div className="adc-info-item">
                    <Phone size={13} />
                    <span>{selectedClient.phone ?? "—"}</span>
                  </div>
                  <div className="adc-info-item">
                    <MapPin size={13} />
                    <span>{selectedClient.address ?? "—"}</span>
                  </div>
                  <div className="adc-info-item">
                    <Calendar size={13} />
                    <span>
                      Membre depuis le {formatDate(selectedClient.createdAt)}
                    </span>
                  </div>
                </div>
              </section>

              {/* ── Résumé ──────────────────────────────────────── */}
              <section className="adc-section" {...helpProps("client-profile")}>
                <h3 className="adc-section-title">
                  <TrendingUp size={14} />
                  Résumé
                </h3>
                <div className="adc-stats-grid">
                  <div className="adc-stat-card">
                    <span className="adc-stat-value">
                      {selectedClient.ordersCount}
                    </span>
                    <span className="adc-stat-label">Commandes</span>
                  </div>
                  <div className="adc-stat-card">
                    <span className="adc-stat-value">
                      {formatMoney(selectedClient.totalSpent)}
                    </span>
                    <span className="adc-stat-label">Total dépensé</span>
                  </div>
                  <div className="adc-stat-card">
                    <span className="adc-stat-value">
                      {formatMoney(selectedClient.creditBalance)}
                    </span>
                    <span className="adc-stat-label">Crédits</span>
                  </div>
                  <div className="adc-stat-card">
                    <span className="adc-stat-value">
                      {selectedLoyaltyPoints.toLocaleString("fr-CA")}
                    </span>
                    <span className="adc-stat-label">Points</span>
                  </div>
                </div>
              </section>

              {/* ── Carte de points ───────────────────────────── */}
              <section className="adc-section">
                <h3 className="adc-section-title">
                  <Star size={14} />
                  Carte de points
                </h3>
                <div className="adc-points-admin">
                  <div {...helpProps("points-total")}>
                    <span className="adc-points-total">
                      {selectedLoyaltyPoints.toLocaleString("fr-CA")} pts
                    </span>
                    <span className="adc-points-value">
                      {selectedLoyaltyDollarValue.toLocaleString("fr-CA")} $
                      utilisable
                    </span>
                  </div>
                  <div className="adc-points-form" {...helpProps("points-adjust")}>
                    <input
                      type="number"
                      step={adminPointsStep}
                      max={maxAddablePoints ?? undefined}
                      value={pointsDelta}
                      onChange={(e) => setPointsDelta(e.target.value)}
                      onBlur={normalizePointsDeltaInput}
                      placeholder={`+${adminPointsStep * 50} ou -${adminPointsStep * 50}`}
                      aria-label="Points à ajuster"
                    />
                    <button
                      onClick={handleAdjustPoints}
                      disabled={updatingPoints}
                    >
                      {updatingPoints ? "..." : "Appliquer"}
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Produits fréquents ───────────────────────────── */}
              {topProducts.length > 0 && (
                <section className="adc-section" {...helpProps("top-products")}>
                  <h3 className="adc-section-title">
                    <Package size={14} />
                    Produits fréquents
                  </h3>
                  <div className="adc-top-products-grid">
                    {topProducts.map((p) => (
                      <div
                        key={p.id}
                        className="adc-top-product-card"
                        onClick={() =>
                          navigate(`/products?q=${encodeURIComponent(p.name)}`)
                        }
                        title="Voir le produit"
                      >
                        <img
                          src={
                            p.image
                              ? p.image.startsWith("http")
                                ? p.image
                                : `${API_URL}${p.image}`
                              : defaultAvatar
                          }
                          alt={p.name}
                          className="adc-top-product-img"
                        />
                        <div className="adc-top-product-info">
                          <span className="adc-top-product-name">{p.name}</span>
                          <span className="adc-top-product-qty">
                            {p.qty} acheté(s)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Habitudes d'achat ────────────────────────────── */}
              <section className="adc-section"  {...helpProps("habits")}>
                <div className="adc-section-row">
                  <h3 className="adc-section-title">
                    <Calendar size={14} />
                    Habitudes d'achat
                  </h3>
                  <div className="adc-period-toggle">
                    <button
                      className={`adc-period-btn ${habitPeriod === "month" ? "active" : ""}`}
                      onClick={() => switchHabitPeriod("month")}
                    >
                      Mensuel
                    </button>
                    <button
                      className={`adc-period-btn ${habitPeriod === "day" ? "active" : ""}`}
                      onClick={() => switchHabitPeriod("day")}
                    >
                      Journalier
                    </button>
                  </div>
                </div>

                {loadingHabits ? (
                  <p className="adc-panel-empty">Chargement...</p>
                ) : habits.length === 0 ? (
                  <p className="adc-panel-empty">Aucune donnée disponible.</p>
                ) : (
                  <div className="adc-habits">
                    {habits
                      .slice()
                      .reverse()
                      .map((h) => (
                        <div key={h.period} className="adc-habit-row">
                          <span className="adc-habit-period">{h.period}</span>
                          <div className="adc-habit-bar-wrap">
                            <div
                              className="adc-habit-bar"
                              style={{
                                width: `${(h.totalSpent / maxHabitSpent) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="adc-habit-meta">
                            <span>{h.ordersCount} cmd</span>
                            <span>{h.itemsCount} art.</span>
                            <span className="adc-habit-total">
                              {formatMoney(h.totalSpent)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* ── Commandes ───────────────────────────────────── */}
              <section className="adc-section">
                <h3 className="adc-section-title">
                  <ShoppingBag size={14} />
                  Commandes ({selectedClient.orders.length})
                </h3>

                {selectedClient.orders.length === 0 ? (
                  <p className="adc-panel-empty">Aucune commande.</p>
                ) : (
                  <div className="adc-orders">
                    {selectedClient.orders
                      .slice(
                        orderPage * ordersRowsPerPage,
                        (orderPage + 1) * ordersRowsPerPage,
                      )
                      .map((order) => (
                        <div key={order.id} className="adc-order"  {...helpProps("orders")}>
                          <div
                            className="adc-order-header"
                            onClick={() =>
                              setExpandedOrderId(
                                expandedOrderId === order.id ? null : order.id,
                              )
                            }
                          >
                            <div className="adc-order-meta">
                              <span className="adc-order-id">#{order.id}</span>
                              <span className="adc-order-date">
                                {formatDate(order.purchaseDate)}
                              </span>
                              {order.commande && (
                                <span
                                  className={`adc-order-type adc-order-type--${order.commande.type.toLowerCase()}`}
                                >
                                  {order.commande.type}
                                </span>
                              )}
                            </div>
                            <div className="adc-order-right">
                              <span className="adc-order-total">
                                {formatMoney(order.total)}
                              </span>
                              {expandedOrderId === order.id ? (
                                <ChevronUp size={15} />
                              ) : (
                                <ChevronDown size={15} />
                              )}
                            </div>
                          </div>

                          {expandedOrderId === order.id && (
                            <div className="adc-order-detail">
                              {order.items.map((item) => (
                                <div key={item.id} className="adc-order-item">
                                  <span
                                    className="adc-order-item-name adc-order-item-name--link"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/products?q=${encodeURIComponent(item.productName)}`,
                                      );
                                    }}
                                    title="Voir le produit"
                                  >
                                    {item.productName}
                                  </span>
                                  <span className="adc-order-item-qty">
                                    ×{item.quantity}
                                  </span>
                                  <span className="adc-order-item-price">
                                    {formatMoney(item.lineTotal)}
                                  </span>
                                </div>
                              ))}
                              {(order.creditUsed > 0 ||
                                order.loyaltyPointsUsed > 0 ||
                                order.loyaltyPointsEarned > 0 ||
                                order.stripeAmountPaid > 0) && (
                                <div className="adc-order-payment">
                                  {order.creditUsed > 0 && (
                                    <span>
                                      <CreditCard size={11} />
                                      Crédits : {formatMoney(order.creditUsed)}
                                    </span>
                                  )}
                                  {order.loyaltyPointsUsed > 0 && (
                                    <span>
                                      Points :{" "}
                                      {order.loyaltyPointsUsed.toLocaleString(
                                        "fr-CA",
                                      )}{" "}
                                      pts (-{formatMoney(order.loyaltyDiscount)}
                                      )
                                    </span>
                                  )}
                                  {order.loyaltyPointsEarned > 0 && (
                                    <span>
                                      Gagnés :{" "}
                                      {order.loyaltyPointsEarned.toLocaleString(
                                        "fr-CA",
                                      )}{" "}
                                      pts
                                    </span>
                                  )}
                                  {order.stripeAmountPaid > 0 && (
                                    <span>
                                      Stripe :{" "}
                                      {formatMoney(order.stripeAmountPaid)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    {selectedClient.orders.length > ordersRowsPerPage && (
                      <div className="adc-pagination-wrap adc-pagination-wrap--small" {...helpProps("pagination")}>
                        <PaginationControls
                          page={orderPage}
                          rowsPerPage={ordersRowsPerPage}
                          total={selectedClient.orders.length}
                          onPageChange={setOrderPage}
                          onRowsPerPageChange={setOrdersRowsPerPage}
                          rowsPerPageOptions={[5, 10, 15, 20]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </>

         
        ) : null}
        
         <HelpModal page="clientDashboard" 
            isOpen={isHelpOpen==true} 
            onOpen={()=>setIsHelpOpen(true)} 
            onClose={()=>setIsHelpOpen(false)}
            variant="light"
          /> 
      </div>
    </div>
  );
}
