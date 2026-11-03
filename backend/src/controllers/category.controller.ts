import { Request, Response } from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoryById } from "../services/category.service";
import { prisma } from "../lib/prisma";

// Helper function to check if color exists
const colorExists = async (color: string) => {
  const category = await prisma.category.findFirst({
    where: { color }
  });
  return !!category;
};
const nameExists = async (name: string) => {
  const category = await prisma.category.findFirst({
    where: { name }
  });
  return !!category;
}

export const create = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const { name, color } = body as { name?: string; color?: string };

    if (!name || !color) {
      return res.status(400).json({ message: "Corps invalide: 'name' et 'color' sont requis" });
    }

    // Vérifier si la couleur existe déjà
    const colorAlreadyExists = await colorExists(color);
    if (colorAlreadyExists) {
      return res.status(400).json({
        message: "Cette couleur existe déjà pour une autre catégorie",
      });
    }

    const nameAlreadyExists = await nameExists(name);
    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Ce nom de catégorie existe déjà",
      });
    }

    const newCategory = await createCategory({
      name,
      color,
    });

    return res.status(201).json({
      message: "catégorie créée",
      category: newCategory,
    });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur a la creation de la catégorie" });
  }
};

export const getAll = async (_req: Request, res: Response) => {
  try {
    const categories = await getAllCategories();
    return res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "erreur" });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);

    if (isNaN(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const category = await getCategoryById(categoryId);
    if (!category)
      return res.status(404).json({ message: "catégorie non trouvée" });
    return res.status(200).json(category);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "erreur" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.params.id);

    if (categoryId <= 0) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const existing = await getCategoryById(categoryId);
    if (!existing) {
      return res.status(404).json({ message: "catégorie non trouvée" });
    }

    // Vérifier si la catégorie contient des produits
    const productCount = await prisma.product.count({
      where: { categoryId }
    });

    if (productCount > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer : cette catégorie contient ${productCount} produit${productCount > 1 ? 's' : ''}`
      });
    }

    const deleted = await deleteCategory(categoryId);

    return res.status(200).json({
      message: "catégorie supprimée avec succès",
      deletedCategory: deleted,
    });

  } catch (err: any) {
    if (err.code === "P2003") {
      return res.status(409).json({
        message: "Impossible de supprimer : catégorie utilisée ailleurs",
      });
    }

    console.error(err);
    return res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);
    const body = req.body ?? {};
    const { name, color } = body as { name?: string; color?: string };

    if (isNaN(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: "ID invalide" });
    }

    if (!name || !color) {
      return res.status(400).json({ message: "Corps invalide: 'name' et 'color' sont requis" });
    }

    // Vérifier si la catégorie existe
    const existing = await getCategoryById(categoryId);
    if (!existing) {
      return res.status(404).json({ message: "catégorie non trouvée" });
    }

    // Vérifier si le nouveau nom existe déjà (et ne pas le considérer si c'est le même)
    if (name !== existing.name) {
      const nameAlreadyExists = await nameExists(name);
      if (nameAlreadyExists) {
        return res.status(400).json({
          message: "Ce nom de catégorie existe déjà",
        });
      }
    }

    // Vérifier si la nouvelle couleur existe déjà (et ne pas le considérer si c'est la même)
    if (color !== existing.color) {
      const colorAlreadyExists = await colorExists(color);
      if (colorAlreadyExists) {
        return res.status(400).json({
          message: "Cette couleur existe déjà pour une autre catégorie",
        });
      }
    }

    // Mettre à jour la catégorie
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { name, color },
    });

    return res.status(200).json({
      message: "catégorie mise à jour avec succès",
      category: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la mise à jour de la catégorie",
    });
  }
};
