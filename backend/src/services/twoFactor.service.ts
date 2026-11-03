// US 396 - Service de double authentification (2FA)
// Gère la génération, le stockage hashé, la validation et l'expiration des codes 2FA
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

// Durée de validité d'un code 2FA en minutes
const CODE_EXPIRATION_MINUTES = 5;

// Méthode qui génère un code aléatoire à 6 chiffres pour la 2FA.
// Retourne une chaîne de 6 chiffres (ex: "048392").
export const generateTwoFactorCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Méthode qui crée un code 2FA pour un utilisateur donné et le stocke en BD (hashé).
// Supprime tout code 2FA existant pour cet utilisateur avant d'en créer un nouveau.
// Retourne le code en clair (à envoyer par courriel/SMS au client).
export const createTwoFactorCode = async (userId: string): Promise<string> => {
  // Supprime les codes existants pour éviter qu'un ancien code reste valide
  await prisma.twoFactorCode.deleteMany({ where: { userId } });

  const code = generateTwoFactorCode();
  const hashedCode = await bcrypt.hash(code, 10);

  await prisma.twoFactorCode.create({
    data: {
      userId,
      code: hashedCode,
      expiresAt: new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000),
    },
  });

  return code;
};

// Méthode qui vérifie un code 2FA fourni par l'utilisateur lors de la connexion.
// Retourne true si le code est valide et non expiré, false sinon.
// Supprime le code après une validation réussie (usage unique).
export const verifyTwoFactorCode = async (
  userId: string,
  code: string,
): Promise<boolean> => {
  const twoFactorCode = await prisma.twoFactorCode.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!twoFactorCode) return false;

  // Vérifie l'expiration
  if (twoFactorCode.expiresAt < new Date()) {
    await prisma.twoFactorCode.delete({ where: { id: twoFactorCode.id } });
    return false;
  }

  // Compare le code fourni avec le hash en BD
  const isValid = await bcrypt.compare(code, twoFactorCode.code);

  if (isValid) {
    // Usage unique : supprime le code après validation
    await prisma.twoFactorCode.delete({ where: { id: twoFactorCode.id } });
    return true;
  }

  return false;
};

// Méthode qui supprime tous les codes 2FA d'un utilisateur (ex: à la déconnexion ou désactivation).
export const deleteTwoFactorCodesForUser = async (userId: string): Promise<void> => {
  await prisma.twoFactorCode.deleteMany({ where: { userId } });
};
