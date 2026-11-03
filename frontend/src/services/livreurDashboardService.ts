import { API_URL } from "../config";

export const livreurDashboardService = {
  getDashboard: async () => {
    const res = await fetch(`${API_URL}/api/livreurDashboard/dashboard`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erreur lors du chargement du dashboard");
    return res.json();
  },
};