import { API_URL } from "../config";
import type { Product } from "../models";

export const productService = {

  getAll: async (): Promise<Product[]> => {
    const res = await fetch(`${API_URL}/api/products/getAll`);
    if (!res.ok) throw new Error("Error fetching products");
    return res.json();
  },

 /**
  * Appel le serveur pour chercher un produit par son Id
  * @param id Id du produit a chercher
  * @returns le produit correspondant au Id donnée
  */
  getById: async (id: string | undefined): Promise<Product> => {
    const res = await fetch(`${API_URL}/api/products/getById/${id}`);
    if (!res.ok) throw new Error("Error fetching products");
    return res.json();
  },

  create: async (formData: FormData) => {
    const res = await fetch(`${API_URL}/api/products/create`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  update: async (id: number, formData: FormData) => {
    const res = await fetch(`${API_URL}/api/products/update/${id}`, {
      method: "PUT",
      body: formData,
      credentials: "include",
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  remove: async (id: number) => {
    const res = await fetch(`${API_URL}/api/products/remove/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    return { status: res.status, data };
  },
};
