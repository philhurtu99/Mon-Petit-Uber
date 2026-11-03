import { useState, useEffect } from "react";
import { Star, Package, Clock, TrendingUp, Award } from "lucide-react";
import { livreurDashboardService } from "../../services/livreurDashboardService";
import PaginationControls from "../../components/pagination/pagination";
import type { DashboardData } from "../../models";
import "./livreurDashboard.css";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

function StarRating({ rating }: { rating: number | null }) {
    if (rating === null)
        return <span className="ld-no-rating">—</span>;
    return (
        <div className="ld-stars">
            {[1, 2, 3, 4, 5].map((v) => (
                <Star
                    key={v}
                    size={13}
                    className={v <= rating ? "ld-star ld-star--filled" : "ld-star"}
                    fill={v <= rating ? "#f5a623" : "none"}
                />
            ))}
        </div>
    );
}

function StarRatingDecimal({ rating }: { rating: number }) {
  return (
    <div className="ld-stars" style={{ position: "relative", display: "inline-flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((v) => {
        const fill = Math.min(Math.max(rating - (v - 1), 0), 1);
        return (
          <span key={v} style={{ position: "relative", display: "inline-block" }}>            
            <Star size={13} fill="none" color="rgba(255,255,255,0.2)" />            
            {fill > 0 && (
              <span style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${fill * 100}%`,
                overflow: "hidden",
                display: "inline-block",
              }}>
                <Star size={13} fill="#f5a623" color="#f5a623" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("fr-CA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatTotalDuration(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const days = Math.floor(minutes / (60 * 24));
    const hours = Math.floor((minutes % (60 * 24)) / 60);
    const mins = minutes % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}j`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}min`);
    return parts.join(" ");
}

export default function LivreurDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
    const { helpProps } = useHelpSystem();

    useEffect(() => {
        livreurDashboardService
            .getDashboard()
            .then(setData)
            .catch(() => setError("Erreur lors du chargement du dashboard"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="ld-wrapper"><p className="ld-empty">Chargement...</p></div>;
    if (error) return <div className="ld-wrapper"><p className="ld-empty">{error}</p></div>;
    if (!data) return null;

    const { stats, deliveries } = data;
    const paged = deliveries.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

    return (
        <div className="ld-wrapper">
            <div className="ld-main">

                {/* Header */}
                <div className="ld-header">
                    <div>
                        <h1 className="ld-title">Mon Dashboard</h1>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="ld-stats-grid" {...helpProps("stats")}>
                    <div className="ld-stat-card">
                        <div className="ld-stat-icon ld-stat-icon--rating">
                            <Award size={20} />
                        </div>
                        <div className="ld-stat-info">
                            <span className="ld-stat-label">Note moyenne</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="ld-stat-value">
                                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
                                </span>
                                {stats.averageRating > 0 && (
                                    <StarRatingDecimal rating={stats.averageRating}/>
                                )}
                            </div>
                            <span className="ld-stat-sub">{stats.totalReviews} avis</span>
                        </div>
                    </div>

                    <div className="ld-stat-card">
                        <div className="ld-stat-icon ld-stat-icon--orders">
                            <Package size={20} />
                        </div>
                        <div className="ld-stat-info">
                            <span className="ld-stat-label">Total livraisons</span>
                            <span className="ld-stat-value">{stats.totalOrders}</span>
                        </div>
                    </div>

                    <div className="ld-stat-card">
                        <div className="ld-stat-icon ld-stat-icon--total">
                            <Clock size={20} />
                        </div>
                        <div className="ld-stat-info">
                            <span className="ld-stat-label">Temps en livraison</span>
                            <span className="ld-stat-value">{stats.totalDurationMinutes > 0 ? formatTotalDuration(stats.totalDurationMinutes) : "—"}</span>
                        </div>
                    </div>

                    <div className="ld-stat-card">
                        <div className="ld-stat-icon ld-stat-icon--avg">
                            <TrendingUp size={20} />
                        </div>
                        <div className="ld-stat-info">
                            <span className="ld-stat-label">Durée moyenne</span>
                            <span className="ld-stat-value">{stats.averageDurationMinutes > 0 ? formatDuration(stats.averageDurationMinutes) : "—"}</span>
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                {deliveries.length > 0 && (
                    <>
                        <div className="ld-table-header">
                            <span>Commande</span>
                            <span>Date</span>
                            <span>Prise en charge</span>
                            <span>Livrée à</span>
                            <span>Durée</span>
                            <span>Note</span>
                        </div>

                        <div className="ld-list" {...helpProps("history")}>
                            {paged.map((d) => (
                                <div key={d.orderId} className="ld-row">
                                    <span className="ld-row-id">#{d.orderId}</span>
                                    <span className="ld-row-date">{formatDate(d.date)}</span>
                                    <span className="ld-row-time">
                                        <span className="ld-row-label">Récupéré  </span>{formatTime(d.pickedUpAt)}
                                    </span>
                                    <span className="ld-row-time ld-row-time--right">
                                        <span className="ld-row-label">Livré </span>{formatTime(d.deliveredAt)}
                                    </span>
                                    <span className="ld-row-duration">
                                        {d.durationMinutes !== null ? formatDuration(d.durationMinutes) : "—"}
                                    </span>
                                    <StarRating rating={d.rating} />
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {deliveries.length > 0 && (
                            <div {...helpProps("pagination")}>
                                <PaginationControls
                                    page={page}
                                    rowsPerPage={itemsPerPage}
                                    total={deliveries.length}
                                    onPageChange={setPage}
                                    onRowsPerPageChange={(n) => { setItemsPerPage(n); setPage(0); }}
                                    rowsPerPageOptions={[10, 20, 30]}
                                />
                            </div>
                        )}
                    </>
                )}

                {deliveries.length === 0 && (
                    <p className="ld-empty">Aucune livraison complétée pour le moment.</p>
                )}
            </div>
        </div>
    );
}
