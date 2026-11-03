import { API_URL } from "../config";
import type { DateRange } from "../models";

export interface BestSeller {
  productId: number;
  name: string;
  imageUrl?: string;
  price: number;
  totalQuantity: number;
  totalRevenue: number;
  avgRating: number;
  reviewCount: number;
}

export interface ProductPerformance {
  productId: number;
  name: string;
  category: string;
  unitPrice: number;
  totalQuantity: number;
  totalRevenue: number;
  stock: number;
  avgRating: number;
  reviewCount: number;
}

export interface OverallStats {
  totalRevenue: number;
  totalOrders: number;
  totalItemsSold: number;
  averageOrderValue: number;
}

/**
 * Récupère les statistiques globales
 */
export async function fetchOverallStats(
  dateRange: DateRange,
): Promise<OverallStats> {
  const params = new URLSearchParams();
  if (dateRange?.from) params.append("startDate", dateRange.from.toISOString());
  if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());

  const res = await fetch(`${API_URL}/api/sales/stats?${params.toString()}`, {
    credentials: "include",
  });

  if (!res.ok)
    throw new Error("Erreur lors de la récupération des statistiques globales");
  return res.json();
}

/**
 * Récupère les meilleurs produits vendus
 */
export async function fetchBestSellers(
  dateRange: DateRange,
  limit = 5,
): Promise<BestSeller[]> {
  const params = new URLSearchParams();
  if (dateRange?.from) params.append("startDate", dateRange.from.toISOString());
  if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());
  if (limit) params.append("limit", limit.toString());

  const res = await fetch(
    `${API_URL}/api/sales/best-sellers?${params.toString()}`,
    {
      credentials: "include",
    },
  );

  if (!res.ok)
    throw new Error("Erreur lors de la récupération des best sellers");
  return res.json();
}

/**
 * Récupère la performance de chaque produit
 */
export async function fetchProductPerformance(
  dateRange: DateRange,
): Promise<ProductPerformance[]> {
  const params = new URLSearchParams();
  if (dateRange?.from) params.append("startDate", dateRange.from.toISOString());
  if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());

  const res = await fetch(
    `${API_URL}/api/sales/performance?${params.toString()}`,
    {
      credentials: "include",
    },
  );

  if (!res.ok)
    throw new Error("Erreur lors de la récupération des performances produits");
  return res.json();
}

/**
 * Télécharge l'export CSV des performances produits
 */
export async function downloadSalesExportCsv(
  dateRange: DateRange,
): Promise<void> {
  const params = new URLSearchParams();
  if (dateRange?.from) params.append("startDate", dateRange.from.toISOString());
  if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());

  const res = await fetch(
    `${API_URL}/api/sales/export/csv?${params.toString()}`,
    {
      credentials: "include",
    },
  );

  if (!res.ok) throw new Error("Erreur lors de l'export CSV");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `performance-ventes-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
