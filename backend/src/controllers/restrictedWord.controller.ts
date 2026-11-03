import { Request, Response } from "express";
import {
  createRestrictedWord,
  deleteRestrictedWord,
  getRestrictedWords,
  upsertAiRestrictedWords,
  updateRestrictedWord,
} from "../services/restrictedWord.service";
import { getCommentModerationDiagnostics } from "../services/commentModeration.service";

export const getAllRestrictedWords = async (_req: Request, res: Response) => {
  try {
    const words = await getRestrictedWords();
    return res.status(200).json(words);
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la récupération des mots filtrés" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const word = await createRestrictedWord({
      ...req.body,
      source: "admin",
      createdById: (req.session as any).user?.id ?? null,
    });
    return res.status(201).json({ message: "Mot ajouté", word });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Ce mot existe déjà" });
    }

    return res.status(400).json({ message: error.message ?? "Mot invalide" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const word = await updateRestrictedWord(id, req.body);
    return res.status(200).json({ message: "Mot mis à jour", word });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Mot introuvable" });
    }

    if (error.code === "P2002") {
      return res.status(409).json({ message: "Ce mot existe déjà" });
    }

    return res.status(400).json({ message: error.message ?? "Mot invalide" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await deleteRestrictedWord(id);
    return res.status(200).json({ message: "Mot supprimé" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Mot introuvable" });
    }

    return res.status(500).json({ message: "Erreur lors de la suppression du mot" });
  }
};

export const testAiDetection = async (req: Request, res: Response) => {
  try {
    const comment = String(req.body.comment ?? "");
    const diagnostics = await getCommentModerationDiagnostics(comment);

    if (diagnostics.flaggedWords.length > 0) {
      await upsertAiRestrictedWords(diagnostics.flaggedWords);
    }

    return res.status(200).json({
      ...diagnostics,
      inserted: diagnostics.flaggedWords.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Erreur lors du test de détection IA",
      error: error.message ?? "Erreur inconnue",
    });
  }
};
