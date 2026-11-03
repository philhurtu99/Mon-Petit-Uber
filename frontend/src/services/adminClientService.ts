import { API_URL } from "../config";
import type {
  AdminClientDetails,
  AdminClientHabit,
  AdminClientSummary,
} from "../models";

export type {
  AdminClientDetails,
  AdminClientHabit,
  AdminClientSummary,
} from "../models";

export const adminClientService = {
  async getAll(): Promise<AdminClientSummary[]> {
    const res = await fetch(`${API_URL}/api/admin/clients`, {
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Erreur lors du chargement des clients");
    }
    return res.json();
  },

  async getById(id: string): Promise<AdminClientDetails> {
    const res = await fetch(`${API_URL}/api/admin/clients/${id}`, {
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Erreur lors du chargement du client");
    }
    return res.json();
  },

  async getHabits(
    id: string,
    period: "day" | "month",
  ): Promise<AdminClientHabit[]> {
    const res = await fetch(
      `${API_URL}/api/admin/clients/${id}/habits?period=${period}`,
      { credentials: "include" },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Erreur lors du chargement des habitudes");
    }
    return res.json();
  },

  /*
   * Met à jour les points de fidélité du client sélectionné.
   *
   * @param id - L'identifiant du client.
   * @param pointsDelta - Le nombre de points à ajouter ou soustraire.
   */
  async adjustLoyaltyPoints(
    id: string,
    pointsDelta: number,
  ): Promise<{ id: string; loyaltyPoints: number }> {
    const res = await fetch(`${API_URL}/api/admin/clients/${id}/loyalty-points`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointsDelta }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Erreur lors de la mise à jour des points");
    }
    return res.json();
  },

  async exportJson(): Promise<void> {
    const res = await fetch(`${API_URL}/api/admin/clients/export/json`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erreur lors de l'export JSON");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async exportCsv(): Promise<void> {
    const res = await fetch(`${API_URL}/api/admin/clients/export/csv`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erreur lors de l'export CSV");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
