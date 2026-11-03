import e, { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Méthode qui permet de trouver un utilisateur par son courriel dans la base de données.
export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({ where: { email } });
};

// Méthode qui permet de créer un utilisateur dans la base de données.
export const createUser = async (data: any) => {
  return await prisma.user.create({ data });
};

// Méthode qui permet de créer un token de vérification pour un utilisateur donné.
export const createVerificationToken = async (
  userId: string,
  token: string,
) => {
  return await prisma.verificationToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Token valide pendant 24 heures
    },
  });
};

// Méthode qui permet de trouver un token de vérification dans la base de données.
export const findVerificationToken = async (token: string) => {
  return await prisma.verificationToken.findUnique({ where: { token } });
};

// Méthode qui permet de créer un token de réinitialisation de mot de passe pour un utilisateur donné.
export const createPasswordResetToken = async (
  userId: string,
  token: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  return await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 heure d'expiration
    },
  });
};

// Méthode qui permet de trouver un token de réinitialisation de mot de passe dans la base de données.
export const findPasswordResetToken = async (token: string) => {
  return await prisma.passwordResetToken.findUnique({ where: { token } });
};

//  cree token de verification avec pendingEmail
export const createEmailChangeToken = async (userId: string, token: string, pendingEmail: string) => {
  return await prisma.verificationToken.create({
    data: { userId, token, pendingEmail,expiresAt: new Date(Date.now() + 1000 * 60 * 60), },
  });
};

//  ajout le pendingEmail a la BD
export const applyPendingEmail = async (userId: string, pendingEmail: string) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { email: pendingEmail },
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

export const findUserById = async (id: string) => {
  return await prisma.user.findUnique({
    where: { id },
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
