import { Request, Response } from "express";
import {
  getAllFaq,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
  type FaqCategory,
} from "../services/faq.service";

const VALID_CATEGORIES: FaqCategory[] = ["LIVRAISON", "PAIEMENT", "MENU", "AUTRE"];

/** ---------------------------------------------------------------------
 * Parse une chaîne de mots-clés séparés par des virgules en tableau propre
 * Ex : "livraison, commande, panier" -> ["livraison", "commande", "panier"]
 ---------------------------------------------------------------------*/
const parseKeywords = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((k) => String(k).trim())
      .filter((k) => k.length > 0);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }
  return [];
};

/** ---------------------------------------------------------------------
 * GET /api/faq/getAll
 * Retourne toutes les FAQ (public)
 ---------------------------------------------------------------------*/
export const getAll = async (_req: Request, res: Response) => {
  try {
    const faqs = await getAllFaq();
    return res.status(200).json(faqs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la récupération des FAQ" });
  }
};

/** ---------------------------------------------------------------------
 * GET /api/faq/:id
 * Retourne une FAQ précise (public)
 ---------------------------------------------------------------------*/
export const getById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!id) return res.status(400).json({ message: "ID invalide" });

    const faq = await getFaqById(id);
    if (!faq) return res.status(404).json({ message: "FAQ introuvable" });

    return res.status(200).json(faq);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la récupération de la FAQ" });
  }
};

/** ---------------------------------------------------------------------
 * POST /api/faq/create
 * Cr\u00e9e une nouvelle FAQ (admin)
 ---------------------------------------------------------------------*/
export const create = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const { question, answer, keywords, category } = body as {
      question?: string;
      answer?: string;
      keywords?: unknown;
      category?: string;
    };

    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({ message: "Question et réponse requises" });
    }

    const cat = (category ?? "AUTRE") as FaqCategory;
    if (!VALID_CATEGORIES.includes(cat)) {
      return res.status(400).json({ message: "Catégorie invalide" });
    }

    const newFaq = await createFaq({
      question: question.trim(),
      answer: answer.trim(),
      keywords: parseKeywords(keywords),
      category: cat,
    });

    return res.status(201).json({
      message: "FAQ crée avec succès",
      faq: newFaq,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la création de la FAQ" });
  }
};

/** ---------------------------------------------------------------------
 * PUT /api/faq/:id
 * Met à jour une FAQ (admin)
 ---------------------------------------------------------------------*/
export const update = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!id) return res.status(400).json({ message: "ID invalide" });

    const body = req.body ?? {};
    const { question, answer, keywords, category } = body as {
      question?: string;
      answer?: string;
      keywords?: unknown;
      category?: string;
    };

    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({ message: "Question et réponse requises" });
    }

    const cat = (category ?? "AUTRE") as FaqCategory;
    if (!VALID_CATEGORIES.includes(cat)) {
      return res.status(400).json({ message: "Catégorie invalide" });
    }

    const existing = await getFaqById(id);
    if (!existing) return res.status(404).json({ message: "FAQ introuvable" });

    const updated = await updateFaq(id, {
      question: question.trim(),
      answer: answer.trim(),
      keywords: parseKeywords(keywords),
      category: cat,
    });

    return res.status(200).json({
      message: "FAQ mise \u00e0 jour avec succès",
      faq: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour de la FAQ" });
  }
};

/** ---------------------------------------------------------------------
 * DELETE /api/faq/:id
 * Supprime une FAQ (admin)
 ---------------------------------------------------------------------*/
export const remove = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!id) return res.status(400).json({ message: "ID invalide" });

    const existing = await getFaqById(id);
    if (!existing) return res.status(404).json({ message: "FAQ introuvable" });

    const deleted = await deleteFaq(id);
    return res.status(200).json({
      message: "FAQ supprim\u00e9e avec succ\u00e8s",
      deletedFaq: deleted,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la suppression de la FAQ" });
  }
};
