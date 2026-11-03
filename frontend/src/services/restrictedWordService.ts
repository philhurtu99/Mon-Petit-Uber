import { API_URL } from "../config";

export type RestrictedWordSource = "admin" | "ai";

export interface RestrictedWord {
  id: number;
  word: string;
  active: boolean;
  source: RestrictedWordSource;
  detectedByAi: boolean;
  lastDetectedByAiAt: string | null;
  createdById: string | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RestrictedWordPayload {
  word: string;
  active?: boolean;
}

const readJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const restrictedWordService = {
  getAll: async (): Promise<RestrictedWord[]> => {
    const res = await fetch(`${API_URL}/api/admin/restricted-words`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Erreur lors du chargement des mots filtrés");
    return res.json();
  },

  create: async (payload: RestrictedWordPayload) => {
    const res = await fetch(`${API_URL}/api/admin/restricted-words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await readJson(res);
    return { status: res.status, data };
  },

  update: async (id: number, payload: RestrictedWordPayload) => {
    const res = await fetch(`${API_URL}/api/admin/restricted-words/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await readJson(res);
    return { status: res.status, data };
  },

  remove: async (id: number) => {
    const res = await fetch(`${API_URL}/api/admin/restricted-words/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await readJson(res);
    return { status: res.status, data };
  },
};
