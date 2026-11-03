import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { notifyConsentingUsers } from "../services/marketingNotification.service";

// ======================
// HELPERS
// ======================
type IdParams = {
  id: string;
};

type ProductParams = {
  productId: string;
};

const nameExists = async (name: string, excludeId?: number): Promise<boolean> => {
  const promotion = await prisma.promotion.findFirst({
    where: {
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return !!promotion;
};

const validateDates = (startDate?: string, endDate?: string) => {
  if (!endDate) return { valid: false, error: "La date de fin est requise" };

  const end = new Date(endDate);
  if (isNaN(end.getTime())) {
    return { valid: false, error: "La date de fin est invalide" };
  }

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return { valid: false, error: "La date de début est invalide" };
    }
    if (start >= end) {
      return {
        valid: false,
        error: "La date de début doit être avant la date de fin",
      };
    }
  }

  if (end <= new Date()) {
    return { valid: false, error: "La date de fin doit être dans le futur" };
  }

  return { valid: true };
};

const validateQuantity = (purchaseQtt: number, bonusQtt: number) => {
  if (purchaseQtt <= 0) {
    return { valid: false, error: "La quantité achetée doit être > 0" };
  }

  if (bonusQtt <= 0) {
    return { valid: false, error: "La quantité bonus doit être > 0" };
  }

  if (bonusQtt >= purchaseQtt) {
    return { valid: false, error: "La quantité à payer ne peut pas être égale ou supérieure à la quantité achetée" };
  }

  return { valid: true };
};

// ======================
// CREATE
// ======================

export const create = async (req: Request<IdParams>, res: Response): Promise<Response> => {
  try {
    const {
      name,
      description,
      type,
      targetProductId,
      bonusProductId,
      quantity,
      bonusQuantity,
      startDate,
      endDate,
    } = req.body ?? {};

    if (!name || !type || !targetProductId || !endDate) {
      return res.status(400).json({
        message: "Champs requis manquants",
      });
    }

    if (!["BUY_X_GET_Y", "FREE_ITEM"].includes(type)) {
      return res.status(400).json({
        message: "Type invalide",
      });
    }

    if (await nameExists(name)) {
      return res.status(400).json({
        message: "Ce nom existe déjà",
      });
    }

    const dateValidation = validateDates(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.error });
    }

    // Vérifier que le produit cible existe
    const targetProduct = await prisma.product.findUnique({
      where: { id: targetProductId },
    });

    if (!targetProduct) {
      return res.status(404).json({ message: "Produit cible non trouvé" });
    }

    if (bonusProductId) {
      const bonusProduct = await prisma.product.findUnique({
        where: { id: bonusProductId },
      });

      if (!bonusProduct) {
        return res.status(404).json({ message: "Produit bonus non trouvé" });
      }
    }

   if (type === "BUY_X_GET_Y") {
  if (quantity == null || bonusQuantity == null) {
    return res.status(400).json({
      message: "quantity et bonusQuantity sont requis",
    });
  }

  const validateQtt = validateQuantity(quantity, bonusQuantity);

  if (!validateQtt.valid) {
    return res.status(400).json({ message: validateQtt.error });
  }
}
    if (type === "BUY_X_GET_Y" && (!quantity || quantity < 1)) {
      return res.status(400).json({
        message: "quantity doit être >= 1",
      });
    }

    if (type === "FREE_ITEM" && !bonusProductId) {
      return res.status(400).json({
        message: "bonusProductId requis",
      });
    }

    if (type === "FREE_ITEM" && (!quantity || quantity < 1)) {
      return res.status(400).json({
        message: "quantity doit être >= 1",
      });
    }

    const promotion = await prisma.promotion.create({
      data: {
        name,
        description: description ?? null,
        type,
        targetProductId,
        bonusProductId: bonusProductId ?? null,
        quantity: quantity ?? null,
        bonusQuantity: bonusQuantity ?? 1,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(endDate),
        isActive: true,
      },
      include: {
        targetProduct: {
          select: { id: true, name: true, price: true, finalPrice: true },
        },
        bonusProduct: {
          select: { id: true, name: true, price: true, finalPrice: true },
        },
      },
    });
    
    notifyConsentingUsers({
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      type: promotion.type as "BUY_X_GET_Y" | "FREE_ITEM",
      quantity: promotion.quantity,
      bonusQuantity: promotion.bonusQuantity,
      endDate: promotion.endDate,
      targetProduct: promotion.targetProduct,
      bonusProduct: promotion.bonusProduct,
    }).catch((err) => {
      console.error("Erreur lors de l'envoi des notifications marketing :", err);
    });

    return res.status(201).json({ promotion });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// ======================
// GET ALL
// ======================

export const getAll = async (_: Request, res: Response): Promise<Response> => {
  try {
    const promotions = await prisma.promotion.findMany();
    return res.status(200).json(promotions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// ======================
// GET ACTIVE
// ======================
export const getActive = async (_: Request, res: Response): Promise<Response> => {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gt: now },
      },
    });
    return res.status(200).json(promotions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// ======================
// GET BY PRODUCT
// ======================
export const getByProduct = async (req: Request<ProductParams>, res: Response): Promise<Response> => {
  try {
    const productId = Number(req.params.productId);
    if (!productId || productId <= 0) {
      return res.status(400).json({ message: "ID produit invalide" });
    }

    const promotions = await prisma.promotion.findMany({
      where: {
        OR: [
          { targetProductId: productId },
          { bonusProductId: productId },
        ],
      },
    });

    return res.status(200).json(promotions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// ======================
// GET BY ID
// ======================

export const getById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const promotion = await prisma.promotion.findUnique({ where: { id } });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion non trouvée" });
    }

    return res.status(200).json(promotion);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// ======================
// UPDATE
// ======================

export const update = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const existing = await prisma.promotion.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Promotion non trouvée" });
    }

    const {
      name,
      description,
      type,
      targetProductId,
      bonusProductId,
      quantity,
      bonusQuantity,
      startDate,
      endDate,
      isActive,
    } = req.body ?? {};

    if (name && name !== existing.name) {
      if (await nameExists(name, id)) {
        return res.status(400).json({ message: "Nom déjà utilisé" });
      }
    }

    if (endDate) {
      const validation = validateDates(startDate, endDate);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
    }

    const nextType = type ?? existing.type;
    const nextQuantity = quantity ?? existing.quantity;
    const nextBonusProductId = bonusProductId ?? existing.bonusProductId;

    if (nextType === "FREE_ITEM" && (!nextBonusProductId || !nextQuantity || nextQuantity < 1)) {
      return res.status(400).json({
        message: "bonusProductId et quantity >= 1 sont requis",
      });
    }

    const updated = await prisma.promotion.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(targetProductId !== undefined && { targetProductId }),
        ...(bonusProductId !== undefined && { bonusProductId }),
        ...(quantity !== undefined && { quantity }),
        ...(bonusQuantity !== undefined && { bonusQuantity }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// ======================
// DELETE
// ======================

export const remove = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const existing = await prisma.promotion.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Promotion non trouvée" });
    }

    await prisma.promotion.delete({ where: { id } });

    return res.status(200).json({ message: "Supprimé" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error?.message || "Erreur serveur" });
  }
};
