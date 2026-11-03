import { API_URL } from "../config";

export const authService = {
  async register(userData: any) {
    const isFormData = userData instanceof FormData;

    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: isFormData ? {} : { "Content-Type": "application/json" },
      body: isFormData ? userData : JSON.stringify(userData),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de l'inscription");
    }

    return response.json();
  },

  async login(formdata: any) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formdata),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la connexion");
    }

    return response.json();
  },

  async verifyEmailToken(token: string, type: string = "email-verification") {
    const response = await fetch(`${API_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, type }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Erreur lors de la vérification du courriel",
      );
    }

    return response.json();
  },
  forgotPassword: async (email: string) => {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  },

  resetPassword: async (body: {
    token: string;
    password: string;
    passwordConfirm: string;
  }) => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  },
    // Vérifie le code 2FA après un login qui a retourné requiresTwoFactor: true
  async verifyTwoFactor(userId: string, code: string) {
    const response = await fetch(`${API_URL}/api/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Code invalide ou expiré");
    }

    return response.json();
  },
};
