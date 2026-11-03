import { API_URL } from "../config";

export interface Product {
  id: number;
  name: string;
  price: number;
}

export interface Promotion {
  id: number;
  name: string;
  description?: string;
  type: "BUY_X_GET_Y" | "FREE_ITEM";
  targetProductId: number;
  bonusProductId?: number;
  quantity?: number;
  bonusQuantity?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targetProduct?: Product;
  bonusProduct?: Product;
}

export interface CreatePromotionPayload {
  name: string;
  description?: string | null;
  type: "BUY_X_GET_Y" | "FREE_ITEM";
  targetProductId: number;
  bonusProductId?: number | null;
  quantity?: number | null;
  bonusQuantity: number;
  startDate?: string | null;
  endDate: string;
}

export interface UpdatePromotionPayload extends CreatePromotionPayload {
  isActive?: boolean;
}

export const promotionService = {
  /**
   * Récupère toutes les promotions
   */
  async getAllPromotions(): Promise<Promotion[]> {
    const response = await fetch(`${API_URL}/api/promotion/getAll`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors du chargement des promotions");
    }

    return response.json();
  },

  /**
   * Crée une nouvelle promotion
   */
  async createPromotion(payload: CreatePromotionPayload): Promise<Promotion> {
    const response = await fetch(`${API_URL}/api/promotion/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la création de la promotion");
    }

    return response.json();
  },

  /**
   * Récupère tous les produits disponibles
   */
  async getAllProducts(): Promise<Product[]> {
    const response = await fetch(`${API_URL}/api/products/getAll`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors du chargement des produits");
    }

    return response.json();
  },

  /**
   * Supprime une promotion par ID
   */
  async deletePromotion(promotionId: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/promotion/${promotionId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la suppression de la promotion");
    }
  },

  /**
   * Met à jour une promotion existante
   */
  async updatePromotion(promotionId: number, payload: UpdatePromotionPayload): Promise<Promotion> {
    const response = await fetch(`${API_URL}/api/promotion/${promotionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la mise à jour de la promotion");
    }

    return response.json();
  },

  /**
   * Récupère toutes les promotions actives
   */
  async getActivePromotions(): Promise<Promotion[]> {
    const response = await fetch(`${API_URL}/api/promotion/active`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error("Erreur lors du chargement des promotions actives");
      return [];
    }

    return response.json();
  },

  /**
   * Récupère les promotions pour un produit spécifique
   */
  async getPromotionsForProduct(productId: number): Promise<Promotion[]> {
    const response = await fetch(`${API_URL}/api/promotion/product/${productId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error("Erreur lors du chargement des promotions du produit");
      return [];
    }

    return response.json();
  },
};
