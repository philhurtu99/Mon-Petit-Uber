import { API_URL } from "../config";
import type { FaqItem, FaqCategory } from "../models";

export interface FaqFormPayload {
  question: string;
  answer: string;
  keywords: string;     // chaine séparée par virgules dans le formulaire
  category: FaqCategory;
}

export const faqService = {

  /** Récupére toutes les FAQ (public) */
  getAll: async (): Promise<FaqItem[]> => {
    const res = await fetch(`${API_URL}/api/faq/getAll`);
    if (!res.ok) throw new Error("Erreur lors du chargement des FAQ");
    return res.json();
  },

  /** Récupére une FAQ par son ID (public) */
  getById: async (id: string): Promise<FaqItem> => {
    const res = await fetch(`${API_URL}/api/faq/${id}`);
    if (!res.ok) throw new Error("FAQ introuvable");
    return res.json();
  },

  /** Crée une FAQ (admin) */
  create: async (payload: FaqFormPayload) => {
    const res = await fetch(`${API_URL}/api/faq/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  /** Met à jour une FAQ (admin) */
  update: async (id: string, payload: FaqFormPayload) => {
    const res = await fetch(`${API_URL}/api/faq/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  /** Supprime une FAQ (admin) */
  remove: async (id: string) => {
    const res = await fetch(`${API_URL}/api/faq/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    return { status: res.status, data };
  },
};
