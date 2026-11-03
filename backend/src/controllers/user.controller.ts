import { getRequiredEnv } from "../utils/env";
import { Request, Response } from "express";
import {
    getUserCreditBalance,
    getUserLoyaltyPoints,
    setProfanityFilterEnabled,
    getMarketingPreferences,
    updateMarketingPreferences,
    updateUser,
} from "../services/user.service";
import { setTwoFactorSettings, getTwoFactorSettings } from "../services/user.service";
import { deleteTwoFactorCodesForUser } from "../services/twoFactor.service";
import crypto from "crypto";
import { createEmailChangeToken, findUserByEmail, } from "../services/auth.service";
import {
    creditEvents,
    USER_CREDIT_CHANGED,
} from "../services/creditEvents.service";
import {
    loyaltyEvents,
    USER_LOYALTY_POINTS_CHANGED,
} from "../services/loyaltyEvents.service";

// Retourne le solde de crédit actuel depuis la base de données.
// Le panier appelle cette route pour afficher un solde frais avant d'envoyer
// seulement le choix applyCredit à /api/checkout/create-session.
export const getCreditBalance = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const creditBalance = await getUserCreditBalance(userId);

        if (creditBalance === null) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        res.json({ creditBalance });
    } catch {
        res.status(500).json({ message: "Erreur lors de la récupération du crédit" });
    }
};

// Retourne le solde de points de fidélité actuel depuis la base de données.
// Cette route est utilisée par le frontend pour afficher le solde de points de fidélité de l'utilisateur.
// Elle est protégée par le middleware auth pour s'assurer que seuls les utilisateurs authentifiés peuvent accéder à cette information.
// Elle renvoie le solde de points de fidélité de l'utilisateur sous forme de JSON.
export const getLoyaltyPoints = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const loyaltyPoints = await getUserLoyaltyPoints(userId);

        if (loyaltyPoints === null) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        res.json({ loyaltyPoints });
    } catch {
        res.status(500).json({ message: "Erreur lors de la récupération des points" });
    }
};

// Cette route est utilisée pour streamer les points de fidélité de l'utilisateur en temps réel.
// Elle est protégée par le middleware auth pour s'assurer que seuls les utilisateurs authentifiés peuvent accéder à cette information.
// Elle renvoie les points de fidélité de l'utilisateur sous forme de flux de données (SSE).
export const streamLoyaltyPoints = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

  // Envoie les points de fidélité de l'utilisateur au client via le flux SSE.
    const sendLoyaltyPoints = async () => {
      const loyaltyPoints = await getUserLoyaltyPoints(userId);
      // Si l'utilisateur n'est pas trouvé, renvoie une erreur.
        if (loyaltyPoints === null) {
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ message: "Utilisateur introuvable" })}\n\n`);
            return;
        }

        res.write(`event: loyalty-points\n`);
        res.write(`data: ${JSON.stringify({ loyaltyPoints })}\n\n`);
    };

  // Gère les changements de points de fidélité de l'utilisateur et envoie les nouveaux points au client via le flux SSE.
  const handleLoyaltyPointsChanged = (changedUserId: string) => {
      // Si le changement concerne l'utilisateur actuel, envoie les nouveaux points au client.
        if (changedUserId === userId) {
            sendLoyaltyPoints().catch(() => undefined);
        }
    };

  // Ajoute un écouteur pour les changements de points de fidélité de l'utilisateur.
    loyaltyEvents.on(USER_LOYALTY_POINTS_CHANGED, handleLoyaltyPointsChanged);
    await sendLoyaltyPoints();

  // Supprime l'écouteur lorsque la connexion est fermée.
    req.on("close", () => {
        loyaltyEvents.off(USER_LOYALTY_POINTS_CHANGED, handleLoyaltyPointsChanged);
        res.end();
    });
};

export const streamCreditBalance = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const sendCreditBalance = async () => {
        const creditBalance = await getUserCreditBalance(userId);
        if (creditBalance === null) {
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ message: "Utilisateur introuvable" })}\n\n`);
            return;
        }

        res.write(`event: credit\n`);
        res.write(`data: ${JSON.stringify({ creditBalance })}\n\n`);
    };

    const handleCreditChanged = (changedUserId: string) => {
        if (changedUserId === userId) {
            sendCreditBalance().catch(() => undefined);
        }
    };

    creditEvents.on(USER_CREDIT_CHANGED, handleCreditChanged);
    await sendCreditBalance();

    req.on("close", () => {
        creditEvents.off(USER_CREDIT_CHANGED, handleCreditChanged);
        res.end();
    });
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const { firstName, lastName, email, address, phone, profanityFilterEnabled } = req.body;

        let profilePicture: string | undefined = undefined;
        if (req.file) {
            profilePicture = `/uploads/profiles/${req.file.filename}`;
        }

        const updatedUser = await updateUser({
            id: userId,
            firstName,
            lastName,
            address,
            phone,
            ...(profanityFilterEnabled !== undefined && {
                profanityFilterEnabled:
                    profanityFilterEnabled === true || profanityFilterEnabled === "true",
            }),
            ...(profilePicture !== undefined && { profilePicture }),
        });

        (req as any).session.user = updatedUser;

        let emailMessage: string | null = null;

        if (email && email !== updatedUser.email) {

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: "Email invalide." });
            }

            const taken = await findUserByEmail(email);
            if (taken && taken.id !== userId) {
                return res.status(400).json({ message: "Cet email est déjà utilisé." });
            }

            const token = crypto.randomUUID();
            await createEmailChangeToken(userId, token, email);

            const confirmLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/accueil?token=${token}&type=email-change`;

            const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": getRequiredEnv("BREVO_API_KEY")
                },
                body: JSON.stringify({
                    sender: { name: "MonPetitUber", email: getRequiredEnv("MAIL_FROM_EMAIL") },
                    to: [{ email }],
                    subject: "Confirmez votre nouvel email",
                    htmlContent: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; text-align: center; background-color: #fbfbfb;">
                            <h2 style="color: #2c3e50;">Confirmation de changement d'email</h2>
                            <p style="color: #555; font-size: 16px; margin-bottom: 25px;">
                                Cliquez ci-dessous pour confirmer votre nouvel email. Ce lien est valide pendant <strong>1 heure</strong>.
                            </p>
                            <a href="${confirmLink}" style="display: inline-block; padding: 14px 28px; background-color: #8DC640; color: #fff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">
                                Confirmer mon nouvel email
                            </a>
                            <p style="color: #aaa; font-size: 13px; margin-top: 20px;">Si vous n'avez pas fait cette demande, ignorez ce courriel.</p>
                        </div>`,
                }),
            });

            if (!brevoRes.ok) {
                const errData = await brevoRes.json();
                console.error("Erreur Brevo:", errData);
            }

            emailMessage = `Un lien de confirmation a été envoyé à ${email}`;
        }

        res.json({
            message: "Profil mis à jour avec succès",
            user: updatedUser,
            ...(emailMessage && { emailMessage }),
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        const isValidationError = [
            "Le prénom doit contenir au moins 2 caractères",
            "Le nom doit contenir au moins 2 caractères",
            "Email invalide",
            "Téléphone invalide",
        ].includes(message);

        res.status(isValidationError ? 400 : 500).json({ message });
    }
};

export const updateProfanityFilter = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "Le champ 'enabled' est requis." });
    }

    const updatedUser = await setProfanityFilterEnabled(userId, enabled);

    if ((req as any).session.user) {
      (req as any).session.user.profanityFilterEnabled = enabled;
    }

    return res.status(200).json({
      message: enabled
        ? "Filtre des commentaires activé."
        : "Filtre des commentaires désactivé.",
      profanityFilterEnabled: (updatedUser as any).profanityFilterEnabled,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la mise à jour du filtre." });
  }
};

// Endpoint pour activer/désactiver la double authentification + choisir la méthode
// Body: { enabled: boolean, method?: "EMAIL" | "SMS", phone?: string }
export const toggleTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { enabled, method, phone } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "Le champ 'enabled' est requis." });
    }

    // Cas activation : la méthode est obligatoire
    if (enabled) {
      if (method !== "EMAIL" && method !== "SMS") {
        return res.status(400).json({
          message: "La méthode doit être 'EMAIL' ou 'SMS'.",
        });
      }

      // Si méthode SMS, un numéro de téléphone valide est requis
      if (method === "SMS") {
        const phoneToUse = phone !== undefined ? phone : (req as any).user.phone;
        if (!phoneToUse || phoneToUse.replace(/\D/g, "").length < 10) {
          return res.status(400).json({
            message: "Un numéro de téléphone valide est requis pour la 2FA par SMS.",
          });
        }
      }
    }

    const updatedUser = await setTwoFactorSettings(
      userId,
      enabled,
      enabled ? method : null,
      phone,
    );

    // Si on désactive la 2FA, on supprime les codes en attente
    if (!enabled) {
      await deleteTwoFactorCodesForUser(userId);
    }

    return res.status(200).json({
      message: enabled
        ? "Double authentification activée."
        : "Double authentification désactivée.",
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      twoFactorMethod: updatedUser.twoFactorMethod,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const isValidationError = message === "Téléphone invalide";
    return res.status(isValidationError ? 400 : 500).json({ message });
  }
};

// Endpoint pour récupérer l'état de la 2FA de l'utilisateur connecté
export const getTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const settings = await getTwoFactorSettings(userId);

    if (!settings) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    return res.status(200).json(settings);
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la récupération des paramètres 2FA." });
  }
};

// ─── GET /api/user/marketing ────────────────────────────────
// Retourne les préférences marketing de l'utilisateur connecté

export const getMarketing = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const preferences = await getMarketingPreferences(userId);
    res.json(preferences);
  } catch (error: any) {
    console.error("Erreur getMarketing:", error);
    res.status(500).json({ 
      message: error.message || "Erreur lors de la récupération des préférences marketing" 
    });
  }
};


// ─── PATCH /api/user/marketing ──────────────────────────────
// Met à jour les préférences marketing de l'utilisateur connecté
//
// Body attendu :
// {
//   "marketingConsent": true | false,
//   "marketingMethod": "EMAIL" | "SMS" | null
// }

export const updateMarketing = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { marketingConsent, marketingMethod } = req.body;

    // Validation du type
    if (typeof marketingConsent !== "boolean") {
      return res.status(400).json({ 
        message: "marketingConsent doit être un booléen" 
      });
    }

    // Validation de la valeur de marketingMethod
    if (
      marketingMethod !== undefined &&
      marketingMethod !== null &&
      marketingMethod !== "EMAIL" &&
      marketingMethod !== "SMS"
    ) {
      return res.status(400).json({ 
        message: "marketingMethod doit être 'EMAIL', 'SMS' ou null" 
      });
    }

    const updated = await updateMarketingPreferences(userId, {
      marketingConsent,
      marketingMethod,
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Erreur updateMarketing:", error);
    res.status(400).json({ 
      message: error.message || "Erreur lors de la mise à jour des préférences marketing" 
    });
  }
};

