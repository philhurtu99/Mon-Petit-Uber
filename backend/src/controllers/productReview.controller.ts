import { Request, Response } from "express";
import { createProductReview, updateProductReview, deleteProductReview, getReviewsByProduct, getProductReviewStats } from "../services/productReview.service";

/**
 * Crée un avis sur un produit
 */
export const create = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const productId = Number(req.params.productId);
    const { rating, comment } = req.body;

    if (!userId)
      return res.status(401).json({ message: "Non authentifié" });

    const files = req.files as Express.Multer.File[];
    const imagesUrl = files?.map(f => `/uploads/reviews/${f.filename}`) ?? [];

    const review = await createProductReview(userId, productId, {
      rating: parseInt(rating),
      comment,
      imagesUrl,
    });

    return res.status(201).json({ message: "Avis créé", review });
  } catch (error: any) {
    if (error.message === "Produit non trouvé")
      return res.status(404).json({ message: error.message });
    if (error.message === "Vous avez déjà laissé un avis pour ce produit")
      return res.status(409).json({ message: error.message });
    if (error.message) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Erreur serveur" });
  }
};


/**
 * Modifie un avis (propriétaire uniquement)
 */
export const update = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reviewId = Number(req.params.id);
    const { rating, comment } = req.body;

    if (!userId)
      return res.status(401).json({ message: "Non authentifié" });

    const files = req.files as Express.Multer.File[];
    const keepImages: string[] = req.body.keepImages
      ? Array.isArray(req.body.keepImages)
        ? req.body.keepImages
        : [req.body.keepImages]
      : [];

    const newImages = files?.map(f => `/uploads/reviews/${f.filename}`) ?? [];
    const imagesUrl = [...keepImages, ...newImages];

    const review = await updateProductReview(reviewId, userId, {
      ...(rating !== undefined && { rating: parseInt(rating) }),
      ...(comment !== undefined && { comment }),
      imagesUrl,
    });

    return res.status(200).json({ message: "Avis mis à jour", review });
  } catch (error: any) {
    if (error.message === "Avis non trouvé")
      return res.status(404).json({ message: error.message });
    if (error.message === "Vous n'êtes pas autorisé à modifier cet avis")
      return res.status(403).json({ message: error.message });
    if (error.message) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Erreur serveur" });
  }
};


/**
 * Supprime un avis (admin uniquement)
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const reviewId = Number(req.params.id);

    await deleteProductReview(reviewId);

    return res.status(200).json({ message: "Avis supprimé" });
  } catch (error: any) {
    if (error.message === "Avis non trouvé")
      return res.status(404).json({ message: error.message });
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};


/**
 * Retourne les avis d'un produit avec stats
 */
export const getByProduct = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const userId = (req.session as any)?.user?.id;
    const data = userId
      ? await getReviewsByProduct(productId, userId)
      : await getReviewsByProduct(productId);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Retourne les statistiques des avis d'un produit
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const stats = await getProductReviewStats(productId);
    return res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Signale un avis (pour tout utilisateur)
 */
export const flag = async (req: Request, res: Response) => {
  try {
    const reviewId = Number(req.params.id);
    const userId = req.user?.id;
    
    if (!reviewId)
      return res.status(400).json({ message: "ID de l'avis requis" });
    if (!userId)
      return res.status(401).json({ message: "Non authentifié" });

    const { flagProductReview } = await import("../services/productReview.service");
    const review = await flagProductReview(reviewId, userId);

    return res.status(200).json({ message: "Avis signalé", review });
  } catch (error: any) {
    if (error.message === "Avis non trouvé")
      return res.status(404).json({ message: error.message });
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Modifie un avis en tant qu'admin (pour modération)
 */
export const updateAsAdmin = async (req: Request, res: Response) => {
  try {
    const reviewId = Number(req.params.id);
    const { comment, rating } = req.body;

    if (!reviewId)
      return res.status(400).json({ message: "ID de l'avis requis" });

    const { updateProductReviewAsAdmin } = await import("../services/productReview.service");
    const review = await updateProductReviewAsAdmin(reviewId, {
      ...(comment !== undefined && { comment }),
      ...(rating !== undefined && { rating: parseInt(rating) }),
    });

    return res.status(200).json({ message: "Avis modifié", review });
  } catch (error: any) {
    if (error.message === "Avis non trouvé")
      return res.status(404).json({ message: error.message });
    if (error.message.includes("note doit être"))
      return res.status(400).json({ message: error.message });
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Désactive/Active un avis (admin uniquement)
 */
export const toggleActive = async (req: Request, res: Response) => {
  try {
    const reviewId = Number(req.params.id);
    const { isActive } = req.body;

    if (!reviewId)
      return res.status(400).json({ message: "ID de l'avis requis" });

    if (typeof isActive !== "boolean")
      return res.status(400).json({ message: "Le statut 'isActive' doit être un booléen" });

    const { toggleProductReviewActive } = await import("../services/productReview.service");
    const review = await toggleProductReviewActive(reviewId, isActive);

    return res.status(200).json({
      message: `Avis ${isActive ? "visible" : "caché"}`,
      review,
    });
  } catch (error: any) {
    if (error.message === "Avis non trouvé")
      return res.status(404).json({ message: error.message });
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Récupère tous les avis signalés (admin uniquement)
 */
export const getAllFlagged = async (req: Request, res: Response) => {
  try {
    const skip = Number(req.query.skip) || 0;
    const take = Number(req.query.take) || 20;

    if (skip < 0 || take < 1)
      return res.status(400).json({ message: "Paramètres de pagination invalides" });

    const { getAllFlaggedReviews } = await import("../services/productReview.service");
    const data = await getAllFlaggedReviews(skip, take);

    return res.status(200).json(data);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
