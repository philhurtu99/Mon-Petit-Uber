import { Request, Response } from "express";
import { createEmployeeReview, getAllEmployeeReviews, } from "../services/employeeReview.service";

export const create = async (req: Request, res: Response) => {
  try {
    const reviewerId = req.user?.id;
    if (!reviewerId)
      return res.status(401).json({ message: "Non authentifié" });

    const commandeId = Number(req.params.commandeId);
    const { rating, comment } = req.body;

    const review = await createEmployeeReview(reviewerId, commandeId, {
      rating: parseInt(rating),
      comment,
    });

    return res.status(201).json({ message: "Avis créé", review });
  } catch (error: any) {
    if (error.message === "Commande non trouvée")
      return res.status(404).json({ message: error.message });
    if (error.message === "Vous avez déjà laissé un avis pour cette commande")
      return res.status(409).json({ message: error.message });
    if (
      error.message === "Vous n'êtes pas autorisé à laisser un avis pour cette commande" ||
      error.message === "Aucun livreur assigné à cette commande"
    )
      return res.status(403).json({ message: error.message });
    if (error.message) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getAll = async (req: Request, res: Response) => {
  try {
    const reviews = await getAllEmployeeReviews();
    return res.status(200).json(reviews);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};