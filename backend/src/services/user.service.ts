import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";
interface UpdateUserData {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  address?: string;
  email?: string;
  phone?: string;
  profanityFilterEnabled?: boolean;
}

export const getUserCreditBalance = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  return user?.creditBalance ?? null;
};

/* Récupère les points de fidélité d'un utilisateur.
 * Retourne les points ou null si l'utilisateur n'existe pas. */
export const getUserLoyaltyPoints = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  });

  return user?.loyaltyPoints ?? null;
};

export const updateUser = async (data: UpdateUserData) => {
  const { id, email, ...fields } = data;

  if (fields.firstName !== undefined && fields.firstName.trim().length < 2)
    throw new Error("Le prénom doit contenir au moins 2 caractères");

  if (fields.lastName !== undefined && fields.lastName.trim().length < 2)
    throw new Error("Le nom doit contenir au moins 2 caractères");

  if (fields.phone !== undefined && fields.phone !== "" && fields.phone.replace(/\D/g, "").length < 10)
    throw new Error("Téléphone invalide");

  if (
    fields.profanityFilterEnabled !== undefined &&
    typeof fields.profanityFilterEnabled !== "boolean"
  )
    throw new Error("Filtre de commentaires invalide");

  if (data.profilePicture) {
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { profilePicture: true },
    });

    if (currentUser?.profilePicture) {
      const oldPath = path.join(process.cwd(), currentUser.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
  }

  const updateData = Object.fromEntries(
    Object.entries(fields).filter(([_, v]) => v !== undefined)
  );

  return await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      role: true,
      address: true,
      phone: true,
      profanityFilterEnabled: true,
    },
  });
};

export const setProfanityFilterEnabled = async (userId: string, enabled: boolean) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { profanityFilterEnabled: enabled } as any,
    select: {
      id: true,
      profanityFilterEnabled: true,
    } as any,
  });
};

// Active/désactive la 2FA et met à jour la méthode + le numéro de téléphone si fourni.
export const setTwoFactorSettings = async (
  userId: string,
  enabled: boolean,
  method: "EMAIL" | "SMS" | null,
  phone?: string,
) => {
  // Validation du téléphone si fourni
  if (phone !== undefined && phone !== "" && phone.replace(/\D/g, "").length < 10) {
    throw new Error("Téléphone invalide");
  }

  const data: any = {
    twoFactorEnabled: enabled,
    twoFactorMethod: method,
  };

  // Mise à jour du numéro de téléphone si fourni
  if (phone !== undefined && phone !== "") {
    data.phone = phone;
  }

  return await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      phone: true,
    },
  });
};

// Récupère les paramètres 2FA actuels de l'utilisateur.
export const getTwoFactorSettings = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorMethod: true,
      phone: true,
    },
  });
};

// ─── RÉCUPÉRER LES PRÉFÉRENCES MARKETING ─────────────────
// Cette fonction retourne l'état actuel du consentement marketing
// pour l'utilisateur connecté.

export const getMarketingPreferences = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      marketingConsent: true,
      marketingMethod: true,
      marketingConsentDate: true,
      phone: true, // utile pour le frontend (vérif si SMS possible)
    },
  });

  if (!user) {
    throw new Error("Utilisateur introuvable");
  }

  return user;
};


// ─── MISE À JOUR DES PRÉFÉRENCES MARKETING ─────────────
// Gère toutes les transitions possibles :
// - Activation avec méthode EMAIL
// - Activation avec méthode SMS
// - Désactivation (force la méthode à null)
//
// La date du consentement est mise à jour à chaque changement (audit Loi 25).

interface UpdateMarketingInput {
  marketingConsent: boolean;
  marketingMethod?: "EMAIL" | "SMS" | null;
}

export const updateMarketingPreferences = async (
  userId: string,
  data: UpdateMarketingInput,
) => {
  // Validation : si consentement = true, méthode obligatoire
  if (data.marketingConsent === true && !data.marketingMethod) {
    throw new Error(
      "Une méthode de réception (EMAIL ou SMS) doit être choisie",
    );
  }

  // Si consentement = false, on force la méthode à null
  // null pour garantir que methodeToSet est jamais undefined (sinon Prisma le refuse)
  const methodToSet = data.marketingConsent ? (data.marketingMethod ?? null) : null;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      marketingConsent: data.marketingConsent,
      marketingMethod: methodToSet,
      marketingConsentDate: new Date(),
    },
    select: {
      marketingConsent: true,
      marketingMethod: true,
      marketingConsentDate: true,
      phone: true,
    },
  });

  return updated;
};


