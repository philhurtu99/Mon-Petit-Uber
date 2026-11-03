import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  create,
  getAllRestrictedWords,
  remove,
  testAiDetection,
  update,
} from "../../controllers/restrictedWord.controller";
import * as restrictedWordService from "../../services/restrictedWord.service";
import * as commentModerationService from "../../services/commentModeration.service";

jest.mock("../../services/restrictedWord.service");
jest.mock("../../services/commentModeration.service");

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("RestrictedWordControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getAllRestrictedWords_RetourneLesMots", async () => {
    const words = [{ id: 1, word: "alpha", active: true }];
    (
      restrictedWordService.getRestrictedWords as jest.MockedFunction<
        typeof restrictedWordService.getRestrictedWords
      >
    ).mockResolvedValue(words as any);
    const res = mockRes();

    await getAllRestrictedWords({} as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(words);
  });

  it("getAllRestrictedWords_WhenServiceFails_Retourne500", async () => {
    (
      restrictedWordService.getRestrictedWords as jest.MockedFunction<
        typeof restrictedWordService.getRestrictedWords
      >
    ).mockRejectedValue(new Error("DB error"));
    const res = mockRes();

    await getAllRestrictedWords({} as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Erreur lors de la récupération des mots filtrés",
    });
  });

  it("create_CreeUnMotAvecUtilisateurDeSession", async () => {
    const word = { id: 1, word: "alpha", active: true };
    (
      restrictedWordService.createRestrictedWord as jest.MockedFunction<
        typeof restrictedWordService.createRestrictedWord
      >
    ).mockResolvedValue(word as any);
    const req: any = {
      body: { word: "alpha" },
      session: { user: { id: "admin-1" } },
    };
    const res = mockRes();

    await create(req, res);

    expect(restrictedWordService.createRestrictedWord).toHaveBeenCalledWith({
      word: "alpha",
      source: "admin",
      createdById: "admin-1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "Mot ajouté", word });
  });

  it("create_WhenDuplicate_Retourne409", async () => {
    (
      restrictedWordService.createRestrictedWord as jest.MockedFunction<
        typeof restrictedWordService.createRestrictedWord
      >
    ).mockRejectedValue({ code: "P2002" });
    const res = mockRes();

    await create({ body: { word: "alpha" }, session: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Ce mot existe déjà" });
  });

  it("create_WhenValidationFails_Retourne400", async () => {
    (
      restrictedWordService.createRestrictedWord as jest.MockedFunction<
        typeof restrictedWordService.createRestrictedWord
      >
    ).mockRejectedValue(new Error("Le mot doit contenir au moins 2 caractères"));
    const res = mockRes();

    await create({ body: { word: "a" }, session: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Le mot doit contenir au moins 2 caractères",
    });
  });

  it("update_MetAJourUnMot", async () => {
    const word = { id: 2, word: "beta", active: false };
    (
      restrictedWordService.updateRestrictedWord as jest.MockedFunction<
        typeof restrictedWordService.updateRestrictedWord
      >
    ).mockResolvedValue(word as any);
    const res = mockRes();

    await update({ params: { id: "2" }, body: { active: false } } as any, res);

    expect(restrictedWordService.updateRestrictedWord).toHaveBeenCalledWith(2, {
      active: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Mot mis à jour", word });
  });

  it("update_WhenWordNotFound_Retourne404", async () => {
    (
      restrictedWordService.updateRestrictedWord as jest.MockedFunction<
        typeof restrictedWordService.updateRestrictedWord
      >
    ).mockRejectedValue({ code: "P2025" });
    const res = mockRes();

    await update({ params: { id: "999" }, body: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Mot introuvable" });
  });

  it("update_WhenDuplicate_Retourne409", async () => {
    (
      restrictedWordService.updateRestrictedWord as jest.MockedFunction<
        typeof restrictedWordService.updateRestrictedWord
      >
    ).mockRejectedValue({ code: "P2002" });
    const res = mockRes();

    await update({ params: { id: "2" }, body: { word: "alpha" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Ce mot existe déjà" });
  });

  it("remove_SupprimeUnMot", async () => {
    (
      restrictedWordService.deleteRestrictedWord as jest.MockedFunction<
        typeof restrictedWordService.deleteRestrictedWord
      >
    ).mockResolvedValue({ id: 4 } as any);
    const res = mockRes();

    await remove({ params: { id: "4" } } as any, res);

    expect(restrictedWordService.deleteRestrictedWord).toHaveBeenCalledWith(4);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Mot supprimé" });
  });

  it("remove_WhenWordNotFound_Retourne404", async () => {
    (
      restrictedWordService.deleteRestrictedWord as jest.MockedFunction<
        typeof restrictedWordService.deleteRestrictedWord
      >
    ).mockRejectedValue({ code: "P2025" });
    const res = mockRes();

    await remove({ params: { id: "999" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Mot introuvable" });
  });

  it("testAiDetection_InsereLesMotsSignalesEtRetourneLesDiagnostics", async () => {
    const diagnostics = {
      externalModerationEnabled: false,
      moderation: { flagged: true, categories: { restricted_words: true } },
      flaggedWords: ["alpha", "beta"],
    };
    (
      commentModerationService.getCommentModerationDiagnostics as jest.MockedFunction<
        typeof commentModerationService.getCommentModerationDiagnostics
      >
    ).mockResolvedValue(diagnostics);
    (
      restrictedWordService.upsertAiRestrictedWords as jest.MockedFunction<
        typeof restrictedWordService.upsertAiRestrictedWords
      >
    ).mockResolvedValue([] as any);
    const res = mockRes();

    await testAiDetection({ body: { comment: "alpha beta" } } as any, res);

    expect(commentModerationService.getCommentModerationDiagnostics).toHaveBeenCalledWith(
      "alpha beta",
    );
    expect(restrictedWordService.upsertAiRestrictedWords).toHaveBeenCalledWith([
      "alpha",
      "beta",
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ...diagnostics, inserted: 2 });
  });

  it("testAiDetection_WhenNoFlaggedWords_NInsereRien", async () => {
    const diagnostics = {
      externalModerationEnabled: false,
      moderation: { flagged: false, categories: {} },
      flaggedWords: [],
    };
    (
      commentModerationService.getCommentModerationDiagnostics as jest.MockedFunction<
        typeof commentModerationService.getCommentModerationDiagnostics
      >
    ).mockResolvedValue(diagnostics);
    const res = mockRes();

    await testAiDetection({ body: { comment: "commentaire propre" } } as any, res);

    expect(restrictedWordService.upsertAiRestrictedWords).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ...diagnostics, inserted: 0 });
  });
});
