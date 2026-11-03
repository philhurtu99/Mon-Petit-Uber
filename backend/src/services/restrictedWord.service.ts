import { prisma } from "../lib/prisma";

type RestrictedWordData = {
  word: string;
  active?: boolean;
  source?: "admin" | "ai";
  createdById?: string | null;
};

const restrictedWordClient = () => (prisma as any).restrictedWord;

const cleanWord = (word: string) => word.trim().replace(/\s+/g, " ");

const validateWord = (word: string) => {
  const cleaned = cleanWord(word);
  if (cleaned.length < 2) {
    throw new Error("Le mot doit contenir au moins 2 caractères");
  }

  return cleaned;
};

export const getRestrictedWords = async (activeOnly = false) => {
  return await restrictedWordClient().findMany({
    where: activeOnly ? { active: true } : undefined,
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { word: "asc" },
  });
};

export const createRestrictedWord = async (data: RestrictedWordData) => {
  const word = validateWord(data.word);

  return await restrictedWordClient().create({
    data: {
      word,
      active: data.active ?? true,
      source: data.source ?? "admin",
      createdById: data.createdById ?? null,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
};

export const upsertAiRestrictedWords = async (words: string[]) => {
  const uniqueWords = [...new Set(words.map(cleanWord).filter((word) => word.length >= 2))];
  const detectedAt = new Date();

  return await Promise.all(
    uniqueWords.map((word) =>
      restrictedWordClient().upsert({
        where: { word },
        update: {
          detectedByAi: true,
          lastDetectedByAiAt: detectedAt,
        },
        create: {
          word,
          active: false,
          source: "ai",
          detectedByAi: true,
          lastDetectedByAiAt: detectedAt,
          createdById: null,
        },
      }),
    ),
  );
};

export const updateRestrictedWord = async (id: number, data: Partial<RestrictedWordData>) => {
  const updateData: Record<string, string | boolean> = {};

  if (data.word !== undefined) {
    updateData.word = validateWord(data.word);
  }

  if (data.active !== undefined) {
    updateData.active = data.active;
  }

  if (data.source !== undefined) {
    updateData.source = data.source;
  }

  return await restrictedWordClient().update({
    where: { id },
    data: updateData,
  });
};

export const deleteRestrictedWord = async (id: number) => {
  return await restrictedWordClient().delete({ where: { id } });
};

export const getActiveRestrictedWordValues = async () => {
  const words = (await getRestrictedWords(true)) ?? [];
  return words.map((item: { word: string }) => item.word);
};
