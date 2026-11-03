import { Request, Response } from "express";
import { searchFaqItems } from "../services/bot.service";

export const searchBotAnswers = async (req: Request, res: Response) => {
  try {
    const { searchText, category } = req.query;

    const questions = await searchFaqItems(
      searchText as string,
      category as string,
    );

    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ error: "Une erreur est survenue" });
  }
};
