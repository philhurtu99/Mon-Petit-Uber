import { prisma } from "../lib/prisma";

export type FaqCategory = "LIVRAISON" | "PAIEMENT" | "MENU" | "AUTRE";

/** ---------------------------------------------------------------------
 * Retourne toutes les FAQ triées par catégorie puis par date de création
 * @returns - Liste de toutes les FaqItem
 ---------------------------------------------------------------------*/
export const getAllFaq = async () => {
  return await prisma.faqItem.findMany({
    orderBy: [
      { category: "asc" },
      { createdAt: "asc" },
    ],
  });
};

/** ---------------------------------------------------------------------
 * Retourne une FAQ par son ID
 * @param id - ID (uuid) de la FaqItem
 * @returns - La FaqItem trouvée ou null
 ---------------------------------------------------------------------*/
export const getFaqById = async (id: string) => {
  return await prisma.faqItem.findUnique({ where: { id } });
};

/** ---------------------------------------------------------------------
 * Crée une nouvelle FAQ
 * @param data - question, answer, keywords (tableau), category
 * @returns - La FaqItem crée
 ---------------------------------------------------------------------*/
export const createFaq = async (data: {
  question: string;
  answer: string;
  keywords: string[];
  category: FaqCategory;
}) => {
  return await prisma.faqItem.create({ data });
};

/** ---------------------------------------------------------------------
 * Met à jour une FAQ
 * @param id - ID de la FaqItem
 * @param data - champs à mettre à jour
 * @returns - La FaqItem mise à jour
 ---------------------------------------------------------------------*/
export const updateFaq = async (
  id: string,
  data: {
    question: string;
    answer: string;
    keywords: string[];
    category: FaqCategory;
  }
) => {
  return await prisma.faqItem.update({
    where: { id },
    data,
  });
};

/** ---------------------------------------------------------------------
 * Supprime une FAQ
 * @param id - ID de la FaqItem
 * @returns - La FaqItem supprim\ée
 ---------------------------------------------------------------------*/
export const deleteFaq = async (id: string) => {
  return await prisma.faqItem.delete({ where: { id } });
};
