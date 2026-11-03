import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./SalesDashboard.css";
import {
  fetchBestSellers,
  fetchProductPerformance,
  fetchOverallStats,
  downloadSalesExportCsv,
  type BestSeller,
  type ProductPerformance,
  type OverallStats,
} from "../../services/salesService";
import { DateFilterDropdown } from "../../components";
import type { DateRange } from "../../models";
import {
  BarChart3,
  Download,
  Search,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Activity,
} from "lucide-react";
import { formatCurrency, getProductImage } from "../../services/ordersService";
import PaginationControls from "../../components/pagination/pagination";
import { DEFAULT_PAGE, DEFAULT_ROWS_PER_PAGE } from "../../config";
import { Star } from "lucide-react";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

// Helper component for star ratings
const StarRating = ({
  rating,
  count,
  showCountBelow = false,
}: {
  rating: number;
  count: number;
  showCountBelow?: boolean;
}) => {
  return (
    <div className={`star-rating ${showCountBelow ? "rating-column" : ""}`}>
      {count > 0 ? (
        <>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => {
              const fill = Math.min(1, Math.max(0, rating - (star - 1)));
              return (
                <span
                  key={star}
                  style={{
                    position: "relative",
                    display: "inline-block",
                    color: "rgba(255, 255, 255, 0.15)",
                    fontSize: "14px",
                    lineHeight: 1,
                  }}
                >
                  ★
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: `${fill * 100}%`,
                      overflow: "hidden",
                      color: "#f59e0b",
                    }}
                  >
                    ★
                  </span>
                </span>
              );
            })}
          </div>
          <span className="rating-count">
            {count} {count > 1 ? "avis" : "avis"}
          </span>
        </>
      ) : (
        <span className="rating-count">aucun avis</span>
      )}
    </div>
  );
};

export function SalesDashboard() {
  const navigate = useNavigate();
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [performance, setPerformance] = useState<ProductPerformance[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalItemsSold: 0,
    averageOrderValue: 0,
  });

  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol 
  const { helpProps } = useHelpSystem();

  // Pagination
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Tri de la table
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ProductPerformance;
    direction: "asc" | "desc";
  }>({
    key: "totalQuantity",
    direction: "desc",
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [best, perf, stats] = await Promise.all([
        fetchBestSellers(dateRange),
        fetchProductPerformance(dateRange),
        fetchOverallStats(dateRange),
      ]);
      setBestSellers(best);
      setPerformance(perf);
      setOverallStats(stats);
    } catch (error) {
      console.error("Erreur chargement dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadSalesExportCsv(dateRange);
    } catch (error) {
      console.error("Erreur export CSV:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (key: keyof ProductPerformance) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredPerformance = useMemo(() => {
    let result = performance.filter((item) => {
      const search = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search)
      );
    });

    result.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [performance, searchTerm, sortConfig]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(0);
  }, [filteredPerformance.length]);

  const paginatedPerformance = useMemo(() => {
    return filteredPerformance.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [filteredPerformance, page, rowsPerPage]);

  const renderSortIcon = (key: keyof ProductPerformance) => {
    if (sortConfig.key !== key) return null;
    return <span>{sortConfig.direction === "asc" ? " ↑" : " ↓"}</span>;
  };

  return (
    <div className="sales-wrapper">
      <div className="sales-main">
        {/* Header */}
        <div className="sales-header">
          <div>
            <h1 className="sales-title">Dashboard Analytique</h1>
            <p className="sales-subtitle">
              Suivez les performances de vos produits et vos revenus
            </p>
          </div>

          <div className="sales-header-actions" {...helpProps("export")}>
            <button
              className="sales-btn-export"
              onClick={handleExportCsv}
              disabled={exporting}
            >
              <Download size={18} />
              {exporting ? "Exportation..." : "Exporter CSV"}
            </button>
            <div {...helpProps("dateFilter")}>
              <DateFilterDropdown onChange={setDateRange} textColor="white" />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="sales-summary-grid" {...helpProps("summary")}>
          <div className="summary-card">
            <div className="summary-icon revenue">
              <DollarSign size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-label">Chiffre d'Affaires</span>
              <span className="summary-value">
                {formatCurrency(overallStats.totalRevenue)}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon orders">
              <ShoppingCart size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-label">Commandes</span>
              <span className="summary-value">{overallStats.totalOrders}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon items">
              <Package size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-label">Articles vendus</span>
              <span className="summary-value">
                {overallStats.totalItemsSold}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon avg">
              <Activity size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-label">Panier Moyen</span>
              <span className="summary-value">
                {formatCurrency(overallStats.averageOrderValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Best Sellers */}
        <div className="sales-section">
          <h2 className="sales-section-title">
            <TrendingUp size={20} /> Les meilleurs produits du moment
          </h2>

          <div className="best-sellers-grid" {...helpProps("bestSellers")}>
            {bestSellers.length > 0 ? (
              bestSellers.map((product, index) => (
                <div className="best-seller-card" key={product.productId}>
                  <div className="best-seller-rank">{index + 1}</div>
                  <img
                    src={getProductImage(product.imageUrl) ?? undefined}
                    alt={product.name}
                    className="best-seller-img"
                  />
                  <h3 className="best-seller-name">{product.name}</h3>
                  <StarRating
                    rating={product.avgRating}
                    count={product.reviewCount}
                    showCountBelow={true}
                  />
                  <span className="best-seller-qty">
                    {product.totalQuantity} unités vendues
                  </span>
                  <span className="best-seller-revenue">
                    Total: {formatCurrency(product.totalRevenue)}
                  </span>
                </div>
              ))
            ) : (
              <div className="sales-empty" style={{ gridColumn: "1/-1" }}>
                {loading ? "Chargement..." : "Aucune vente sur cette période"}
              </div>
            )}
          </div>
        </div>

        {/* Performance par Produit */}
        <div className="sales-section">
          <h2 className="sales-section-title">
            <BarChart3 size={20} /> Analyse par produit
          </h2>

          <div className="sales-search-wrapper" {...helpProps("search")}>
            <div className="sales-search-container">
              <Search
                size={18}
                style={{ marginRight: "10px", color: "#8DC640" }}
              />
              <input
                type="text"
                placeholder="Rechercher un produit ou une catégorie..."
                className="sales-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="sales-table-container">
            <table className="sales-table">
              <thead {...helpProps("sorting")}>
                <tr>
                  <th
                    onClick={() => handleSort("name")}
                    className={sortConfig.key === "name" ? "active" : ""}
                  >
                    Produit {renderSortIcon("name")}
                  </th>
                  <th
                    onClick={() => handleSort("category")}
                    className={sortConfig.key === "category" ? "active" : ""}
                  >
                    Catégorie {renderSortIcon("category")}
                  </th>
                  <th
                    onClick={() => handleSort("unitPrice")}
                    className={sortConfig.key === "unitPrice" ? "active" : ""}
                  >
                    Prix Unitaire {renderSortIcon("unitPrice")}
                  </th>
                  <th
                    onClick={() => handleSort("totalQuantity")}
                    className={
                      sortConfig.key === "totalQuantity" ? "active" : ""
                    }
                  >
                    Vendus {renderSortIcon("totalQuantity")}
                  </th>
                  <th
                    onClick={() => handleSort("totalRevenue")}
                    className={
                      sortConfig.key === "totalRevenue" ? "active" : ""
                    }
                  >
                    Chiffre d'Affaires {renderSortIcon("totalRevenue")}
                  </th>
                  <th
                    onClick={() => handleSort("avgRating")}
                    className={sortConfig.key === "avgRating" ? "active" : ""}
                  >
                    Note {renderSortIcon("avgRating")}
                  </th>
                  <th
                    onClick={() => handleSort("stock")}
                    className={sortConfig.key === "stock" ? "active" : ""}
                  >
                    Stock {renderSortIcon("stock")}
                  </th>
                </tr>
              </thead>
              <tbody {...helpProps("productAnalysis")}>
                {paginatedPerformance.length > 0 ? (
                  paginatedPerformance.map((item) => (
                    <tr key={item.productId}>
                      <td
                        className="sales-product-link"
                        onClick={() =>
                          navigate(
                            `/admin/inventory?q=${encodeURIComponent(item.name)}`,
                          )
                        }
                      >
                        {item.name}
                      </td>
                      <td>{item.category}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td className="sales-col-qty">{item.totalQuantity}</td>
                      <td className="sales-col-total">
                        {formatCurrency(item.totalRevenue)}
                      </td>
                      <td>
                        <StarRating
                          rating={item.avgRating}
                          count={item.reviewCount}
                          showCountBelow={true}
                        />
                      </td>
                      <td
                        className={`sales-col-stock ${item.stock <= 5 ? (item.stock === 0 ? "stock-danger" : "stock-warning") : ""}`}
                      >
                        {item.stock}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="sales-empty">
                      {loading
                        ? "Chargement..."
                        : "Aucune donnée correspondant à votre recherche"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredPerformance.length > 0 && (
            <div {...helpProps("pagination")}>
              <PaginationControls
                page={page}
                rowsPerPage={rowsPerPage}
                total={filteredPerformance.length}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
