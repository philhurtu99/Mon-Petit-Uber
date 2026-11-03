import { describe, expect, it, jest } from "@jest/globals";
import { prismaMock } from "../prismaMock";
import {
  createRestrictedWord,
  deleteRestrictedWord,
  getActiveRestrictedWordValues,
  getRestrictedWords,
  updateRestrictedWord,
  upsertAiRestrictedWords,
} from "../../services/restrictedWord.service";

const restrictedWordMock = () => (prismaMock as any).restrictedWord;

describe("RestrictedWordServiceTests", () => {
  it("getRestrictedWords_RetourneTousLesMotsTries", async () => {
    const words = [
      { id: 1, word: "bruit", active: true },
      { id: 2, word: "insulte", active: false },
    ];
    restrictedWordMock().findMany.mockResolvedValue(words);

    const result = await getRestrictedWords();

    expect(result).toEqual(words);
    expect(restrictedWordMock().findMany).toHaveBeenCalledWith({
      where: undefined,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { word: "asc" },
    });
  });

  it("getRestrictedWords_WhenActiveOnly_FiltreLesMotsActifs", async () => {
    restrictedWordMock().findMany.mockResolvedValue([]);

    await getRestrictedWords(true);

    expect(restrictedWordMock().findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
      }),
    );
  });

  it("createRestrictedWord_NettoieEtCreeUnMotAdminActifParDefaut", async () => {
    const created = { id: 1, word: "gros mot", active: true, source: "admin" };
    restrictedWordMock().create.mockResolvedValue(created);

    const result = await createRestrictedWord({
      word: "  gros   mot  ",
      createdById: "user-1",
    });

    expect(result).toEqual(created);
    expect(restrictedWordMock().create).toHaveBeenCalledWith({
      data: {
        word: "gros mot",
        active: true,
        source: "admin",
        createdById: "user-1",
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  });

  it("createRestrictedWord_WhenWordTooShort_RejetteLeMot", async () => {
    await expect(createRestrictedWord({ word: " a " })).rejects.toThrow(
      "Le mot doit contenir au moins 2 caractères",
    );
    expect(restrictedWordMock().create).not.toHaveBeenCalled();
  });

  it("upsertAiRestrictedWords_DedoublonneNettoieEtIgnoreLesMotsTropCourts", async () => {
    restrictedWordMock().upsert.mockResolvedValue({ id: 1 });

    await upsertAiRestrictedWords(["  alpha  ", "alpha", " beta   test ", "x", ""]);

    expect(restrictedWordMock().upsert).toHaveBeenCalledTimes(2);
    expect(restrictedWordMock().upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { word: "alpha" },
        update: expect.objectContaining({
          detectedByAi: true,
          lastDetectedByAiAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          word: "alpha",
          active: false,
          source: "ai",
          detectedByAi: true,
          createdById: null,
          lastDetectedByAiAt: expect.any(Date),
        }),
      }),
    );
    expect(restrictedWordMock().upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { word: "beta test" },
        create: expect.objectContaining({ word: "beta test" }),
      }),
    );
  });

  it("updateRestrictedWord_MetAJourSeulementLesChampsFournis", async () => {
    const updated = { id: 7, word: "nouveau mot", active: false, source: "ai" };
    restrictedWordMock().update.mockResolvedValue(updated);

    const result = await updateRestrictedWord(7, {
      word: " nouveau   mot ",
      active: false,
      source: "ai",
    });

    expect(result).toEqual(updated);
    expect(restrictedWordMock().update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        word: "nouveau mot",
        active: false,
        source: "ai",
      },
    });
  });

  it("deleteRestrictedWord_SupprimeParId", async () => {
    restrictedWordMock().delete.mockResolvedValue({ id: 3 });

    const result = await deleteRestrictedWord(3);

    expect(result).toEqual({ id: 3 });
    expect(restrictedWordMock().delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it("getActiveRestrictedWordValues_RetourneLesValeursDesMotsActifs", async () => {
    restrictedWordMock().findMany.mockResolvedValue([
      { id: 1, word: "alpha" },
      { id: 2, word: "beta" },
    ]);

    const result = await getActiveRestrictedWordValues();

    expect(result).toEqual(["alpha", "beta"]);
    expect(restrictedWordMock().findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
      }),
    );
  });
});
