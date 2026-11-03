import { prisma } from "../lib/prisma";

export const getCategoryById = async (id: number) => {
  return await prisma.category.findUnique({ where: { id } });
};

export const getAllCategories = async () => {
  return await prisma.category.findMany();
};

export const createCategory = async (data: any) => {
  return await prisma.category.create({ data });
};

export const deleteCategory = async (id: number) => {
  // On renvoie la catégorie supprimée
  return await prisma.category.delete({ where: { id } });
};