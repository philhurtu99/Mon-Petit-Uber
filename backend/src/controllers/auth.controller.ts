import { getRequiredEnv } from "../utils/env";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import crypto from "crypto";

const getSessionFromRequest = (req: Request) => (req as any).session;
import bcrypt from "bcrypt";
import {
  findUserByEmail,
  createUser,
  createVerificationToken,
  findVerificationToken,
  createPasswordResetToken,
  findPasswordResetToken,
  applyPendingEmail,
  findUserById,
} from "../services/auth.service";
import { createTwoFactorCode, verifyTwoFactorCode } from "../services/twoFactor.service";
import { sendSms } from "../services/sms.service";

export const register = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      passwordConfirm,
      address,
      phone,
      marketingConsent,
      marketingMethod,
    } = req.body;

    // Vérification de l'existence d'un utilisateur avec le même courriel
    const existingUser = await findUserByEmail(email);
    if (existingUser)
      return res.status(400).json({ message: "Email déjà utilisé." });

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.",
      });
    }

    if (password !== passwordConfirm)
      return res
        .status(400)
        .json({ message: "Les mots de passe ne correspondent pas." });

    // Hash du mot de passe avant de le stocker
    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePicture: string | null = null;
    if (req.file) {
      profilePicture = `/uploads/profiles/${req.file.filename}`;
    }
    
    // Normalisation marketing 
    const marketingConsentBool = marketingConsent === true || marketingConsent === "true";
    const marketingMethodValue = marketingMethod === "EMAIL" || marketingMethod === "SMS" ? marketingMethod : null;

    // Validation : si consentement, la méthode est obligatoire
    if (marketingConsentBool && !marketingMethodValue) {
      return res.status(400).json({
        message: "Une méthode de réception (EMAIL ou SMS) doit être choisie pour les offres promotionnelles",
      });
    }

    const newUser = await createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      address,
      phone,
      profilePicture,
      marketingConsent: marketingConsentBool,
      marketingMethod: marketingMethodValue,
      marketingConsentDate: marketingConsentBool ? new Date() : null,
    });

    const token = crypto.randomUUID();
    await createVerificationToken(newUser.id, token);

    // Envoi du courriel de vérification
    try {
      const confirmLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${token}`;

      const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "api-key":
            getRequiredEnv("BREVO_API_KEY"),
        },
        body: JSON.stringify({
          sender: {
            name: "MonPetitUber",
            email: getRequiredEnv("MAIL_FROM_EMAIL"),
          },
          to: [
            {
              email: email,
              name: `${firstName} ${lastName}`,
            },
          ],
          subject: "Confirmez votre courriel",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; text-align: center; background-color: #fbfbfb;">
                <img src="https://res.cloudinary.com/dnz7fsota/image/upload/v1775612918/image_h405pb.png" alt="Mascotte MONPETITUBER" style="width: 200px; height: auto; margin-bottom: 20px;" />
                <h2 style="color: #2c3e50; font-size: 24px; margin-bottom: 10px;">
                    Bienvenue sur MON<span style="color: #8DC640;">PETIT</span>UBER !
                </h2>
                <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                    Bravo, votre compte est presque prêt. Pour finaliser votre inscription et confirmer votre profil, veuillez cliquer sur le bouton ci-dessous :
                </p>
                <a href="${confirmLink}" style="display: inline-block; padding: 14px 28px; background-color: #8DC640; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px; transition: background-color 0.3s;">
                    Confirmer mon courriel
                </a>
            </div>`,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error("Erreur Brevo détaillée:", errorData);
      } else {
        console.log("E-mail envoyé avec succès via Brevo !");
      }
    } catch (emailError) {
      console.error("Erreur réseau lors de l'appel à Brevo :", emailError);
    }

    return res
      .status(201)
      .json({ message: "Utilisateur créé. Veuillez vérifier votre courriel." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de l'inscription." });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token, type } = req.body;
    
    // Vérification de l'existence du token de vérification
    const existingToken = await findVerificationToken(token);
    if (!existingToken)
      return res.status(400).json({ message: "Token de vérification invalide ou expiré." });

    // cas changement d'Email
    if (type === "email-change") {
      if (!existingToken.pendingEmail)
        return res.status(400).json({ message: "Aucun changement d'email en attente." });

      const updatedUser = await applyPendingEmail(existingToken.userId, existingToken.pendingEmail);
      await prisma.verificationToken.delete({ where: { id: existingToken.id } });

      if ((req.session as any).user) {
        (req.session as any).user.email = existingToken.pendingEmail;
      }

      return res.status(200).json({
        message: "Email mis à jour avec succès..",
        user: updatedUser
      });
    }

    // creation compte
    else {
      await prisma.user.update({
        where: { id: existingToken.userId },
        data: { emailVerifiedAt: new Date() },
      });

      await prisma.verificationToken.delete({ where: { id: existingToken.id } });

      return res.status(200).json({
        message: "Courriel vérifié avec succès. Vous pouvez maintenant vous connecter.",        
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la vérification du courriel." });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Vérification de l'existence de l'utilisateur et de la validité du mot de passe
    const user = await findUserByEmail(email);
    if (!user || (!user.password && user.password !== ""))
      return res
        .status(400)
        .json({ message: "Email ou mot de passe invalide." });

    // Vérification que le courriel a été vérifié avant de permettre la connexion
    if (!user.emailVerifiedAt)
      return res.status(400).json({
        message: "Veuillez vérifier votre courriel avant de vous connecter.",
      });

    // Comparaison du mot de passe fourni avec le mot de passe haché stocké dans la base de données
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword)
      return res
        .status(400)
        .json({ message: "Email ou mot de passe invalide." });

    // Si la double authentification est activée, on n'ouvre pas la session
    // tout de suite : on envoie un code et on attend que l'utilisateur le valide.
    if (user.twoFactorEnabled && user.twoFactorMethod) {
      const sent = await sendTwoFactorCodeToUser(user);
      if (!sent) {
        return res.status(500).json({
          message: "Erreur lors de l'envoi du code de vérification.",
        });
      }
      return res.status(200).json({
        requiresTwoFactor: true,
        userId: user.id,
        method: user.twoFactorMethod,
      });
    }

    (req.session as any).userId = user.id;
    (req.session as any).user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      role: user.role,
      address: user.address,
      phone: user.phone,
      profanityFilterEnabled: user.profanityFilterEnabled,
    };

    return res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      role: user.role,
      address: user.address,
      phone: user.phone,
      profanityFilterEnabled: user.profanityFilterEnabled,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la connexion." });
  }
};

// US 396 - Génère un code 2FA et l'envoie à l'utilisateur via son canal préféré (EMAIL ou SMS).
// Helper interne utilisé par login() et par le callback Google OAuth.
const sendTwoFactorCodeToUser = async (user: {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  twoFactorMethod: "EMAIL" | "SMS" | null;
}): Promise<boolean> => {
  const code = await createTwoFactorCode(user.id);

  if (user.twoFactorMethod === "SMS") {
    if (!user.phone) {
      console.error(`User ${user.id} a 2FA SMS activé mais n'a pas de numéro de téléphone.`);
      return false;
    }
    return await sendSms(
      user.phone,
      `MonPetitUber - Votre code de connexion : ${code}. Valide 5 minutes.`,
    );
  }

  // Méthode par défaut : EMAIL via Brevo
  try {
    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key":
          getRequiredEnv("BREVO_API_KEY"),
      },
      body: JSON.stringify({
        sender: { name: "MonPetitUber", email: getRequiredEnv("MAIL_FROM_EMAIL") },
        to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
        subject: "Code de double authentification",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; text-align: center; background-color: #fbfbfb;">
            <h2 style="color: #2c3e50;">Code de connexion</h2>
            <p style="color: #555; font-size: 16px;">Voici votre code de double authentification :</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #8DC640; margin: 20px 0;">${code}</p>
            <p style="color: #555; font-size: 14px;">Ce code est valide pendant <strong>5 minutes</strong>.</p>
            <p style="color: #aaa; font-size: 13px; margin-top: 20px;">Si vous n'avez pas tenté de vous connecter, ignorez ce courriel et changez votre mot de passe.</p>
          </div>`,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Erreur Brevo 2FA:", errorData);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Erreur réseau lors de l'envoi du code 2FA par courriel:", error);
    return false;
  }
};

// US 396 - Endpoint appelé par le frontend après que l'utilisateur saisisse son code 2FA.
// Valide le code et, si correct, ouvre la session comme dans login().
export const verifyTwoFactor = async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ message: "userId et code requis." });
    }

    const user = await findUserByEmail("");  // placeholder, on cherche par id
    // On utilise findUserById qui retourne déjà les champs publics
    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
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
        twoFactorEnabled: true,
      },
    });

    if (!fullUser) {
      return res.status(400).json({ message: "Utilisateur introuvable." });
    }

    if (!fullUser.twoFactorEnabled) {
      return res.status(400).json({ message: "Double authentification non activée." });
    }

    const isValid = await verifyTwoFactorCode(userId, code);
    if (!isValid) {
      return res.status(400).json({ message: "Code invalide ou expiré." });
    }

    // Code valide : on ouvre la session
    (req.session as any).userId = fullUser.id;
    (req.session as any).user = {
      id: fullUser.id,
      email: fullUser.email,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      profilePicture: fullUser.profilePicture,
      role: fullUser.role,
      address: fullUser.address,
      phone: fullUser.phone,
      profanityFilterEnabled: fullUser.profanityFilterEnabled,
    };

    return res.status(200).json({
      id: fullUser.id,
      email: fullUser.email,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      profilePicture: fullUser.profilePicture,
      role: fullUser.role,
      address: fullUser.address,
      phone: fullUser.phone,
      profanityFilterEnabled: fullUser.profanityFilterEnabled,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la vérification du code 2FA." });
  }
};

// Export du helper pour utilisation par le callback Google OAuth
export { sendTwoFactorCodeToUser };
export const getSession = async (req: Request, res: Response) => {
 const sessionUser = (req.session as any).user;
  if (!sessionUser) return res.json({ user: null });

  const user = await findUserById(sessionUser.id);
  return res.json({ user });
};

export const logout = async (req: Request, res: Response) => {
  getSessionFromRequest(req).destroy(() => {
    res.json({ message: "Déconnexion réussie." });
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);

    if (!user)
      return res
        .status(200)
        .json({ message: "Si ce courriel existe, un lien vous a été envoyé." });

    const token = crypto.randomUUID();
    await createPasswordResetToken(user.id, token);

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/?reset-password=${token}`;

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key":
          getRequiredEnv("BREVO_API_KEY"),
      },
      body: JSON.stringify({
        sender: { name: "MonPetitUber", email: getRequiredEnv("MAIL_FROM_EMAIL") },
        to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
        subject: "Réinitialisation de votre mot de passe",
        htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; text-align: center; background-color: #fbfbfb;">
                <h2 style="color: #2c3e50;">Réinitialisation du mot de passe</h2>
                <p style="color: #555; font-size: 16px; margin-bottom: 25px;">
                  Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valide pendant <strong>1 heure</strong>.
                </p>
                <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #8DC640; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">
                  Réinitialiser mon mot de passe
                </a>
                <p style="color: #aaa; font-size: 13px; margin-top: 20px;">Si vous n'avez pas fait cette demande, ignorez ce courriel.</p>
              </div>`,
      }),
    });

    return res
      .status(200)
      .json({ message: "Si ce courriel existe, un lien vous a été envoyé." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message:
        "Une erreur est survenue lors de la réinitialisation du mot de passe.",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password, passwordConfirm } = req.body;

    if (password !== passwordConfirm) {
      return res
        .status(400)
        .json({ message: "Les mots de passe ne correspondent pas." });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password))
      return res.status(400).json({
        message: "Le mot de passe ne respecte pas les critères de sécurité.",
      });

    const existingToken = await findPasswordResetToken(token);
    if (!existingToken || existingToken.expiresAt < new Date())
      return res.status(400).json({ message: "Lien invalide ou expiré." });

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: existingToken.userId },
      data: { password: hashedPassword },
    });

    await prisma.passwordResetToken.delete({ where: { id: existingToken.id } });

    return res
      .status(200)
      .json({ message: "Mot de passe mis à jour avec succès." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la réinitialisation." });
  }
};
