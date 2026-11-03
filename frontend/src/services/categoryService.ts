import { API_URL } from "../config";
import type { Category } from "../models";

export const categoryService = {

    getAll: async (): Promise<Category[]> => {
        const res = await fetch(`${API_URL}/api/category/getAll`);
        if (!res.ok) throw new Error("Error fetching categories");
        return res.json();
    },

    create: async (name: string, color: string) => {
        const res = await fetch(`${API_URL}/api/category/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color }),
            credentials: "include",
        });
        const data = await res.json();
        return { status: res.status, data };
    },

    update: async (updatedCategory: Category) => {
        const res = await fetch(`${API_URL}/api/category/${updatedCategory.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCategory),
            credentials: "include",
        });
        const data = await res.json();
        return { status: res.status, data };
    },

    remove: async (id: number) => {
        const res = await fetch(`${API_URL}/api/category/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        const data = await res.json();
        return { status: res.status, data };
    },
};