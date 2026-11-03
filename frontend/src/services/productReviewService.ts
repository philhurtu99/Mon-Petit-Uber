import { API_URL } from "../config";
import type { ProductReviewsResponse } from "../models";

export const productReviewService = {

  create: async (productId: number, formData: FormData) => {
    const res = await fetch(`${API_URL}/api/productReview/createReview/${productId}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  getByProduct: async (productId: number): Promise<ProductReviewsResponse> => {
    const res = await fetch(`${API_URL}/api/productReview/product/${productId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erreur lors du chargement des avis");
    return res.json();
  },

  update: async (reviewId: number, formData: FormData) => {
    const res = await fetch(`${API_URL}/api/productReview/updateReview/${reviewId}`, {
      method: "PUT",
      credentials: "include",
      body: formData,
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  getStats: async (productId: number) => {
    const res = await fetch(`${API_URL}/api/productReview/stats/${productId}`, {
      method: "POST",
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  flag: async (reviewId: number) => {
    const res = await fetch(`${API_URL}/api/productReview/flag/${reviewId}`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  getAllFlagged: async (skip: number = 0, take: number = 20) => {
    const res = await fetch(`${API_URL}/api/productReview/flagged/all?skip=${skip}&take=${take}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erreur lors du chargement des avis signalés");
    return res.json();
  },

  toggleActive: async (reviewId: number, isActive: boolean) => {
    const res = await fetch(`${API_URL}/api/productReview/toggleActive/${reviewId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  updateAsAdmin: async (reviewId: number, data: { comment?: string; rating?: number }) => {
    const res = await fetch(`${API_URL}/api/productReview/updateAsAdmin/${reviewId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    return { status: res.status, data: responseData };
  },

};
