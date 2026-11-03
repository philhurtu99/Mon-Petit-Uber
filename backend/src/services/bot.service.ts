import { CategoryNameFaq } from "../../generated/prisma";
import { prisma } from "../lib/prisma";

export const searchFaqItems = async (searchText: string, category: string) => {
  const whereClause: any = {};
  if (category && category !== "AUTRE") {
    whereClause.category = { equals: category as CategoryNameFaq };
  }

  const allQuestions = await prisma.faqItem.findMany({
    where: whereClause,
  });

  if (!searchText) return allQuestions;

  const words = searchText
    .toLowerCase()
    .replace(/[?.,!]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  if (words.length === 0) return [];

  const scored = allQuestions.map((q) => {
    let score = 0;
    const questionText = q.question.toLowerCase();
    const answerText = q.answer.toLowerCase();
    const keywords = q.keywords.map((k) => k.toLowerCase());

    words.forEach((word) => {
      if (questionText.includes(word)) score += 10;
      if (keywords.includes(word)) score += 5;
      if (answerText.includes(word)) score += 2;
    });

    return { ...q, score };
  });

  const topResults = scored
    .filter((q) => q.score > 0)
    .slice(0, 3)
    .sort((a, b) => b.score - a.score)
    .map((q, index) => ({
      ...q,
      rank: index + 1,
    }));

  return topResults;
};
