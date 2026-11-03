import { API_URL } from "../config";

export const employeeReviewService = {

  create: async (commandeId: number, payload: { rating: number; comment?: string }) => {
    const res = await fetch(`${API_URL}/api/employeeReview/createReview/${commandeId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  getMyReviews: async () => {
    const res = await fetch(`${API_URL}/api/employeeReview/employeReviews/me`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erreur lors du chargement des avis");
    return res.json();
  },

  getAll: async () => {
    const res = await fetch(`${API_URL}/api/employeeReview/employeReviews`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erreur lors du chargement des avis");
    return res.json();
  },

};