import { prismaMock } from "../prismaMock"; // Obligatoirement premier lors de l'import pour les tests
import {
  generateTwoFactorCode,
  createTwoFactorCode,
  verifyTwoFactorCode,
  deleteTwoFactorCodesForUser,
} from "../../services/twoFactor.service";
import bcrypt from "bcrypt";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("bcrypt");

describe("TwoFactorServiceTests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Teste que generateTwoFactorCode retourne un code à 6 chiffres
  it("GenerateTwoFactorCode_ShouldReturnSixDigitString", () => {
    // Act
    const code = generateTwoFactorCode();

    // Assert
    expect(code).toMatch(/^\d{6}$/);
    expect(code.length).toBe(6);
  });

  // Teste que generateTwoFactorCode génère des codes différents (aléatoire)
  it("GenerateTwoFactorCode_ShouldGenerateDifferentCodes", () => {
    // Act
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      codes.add(generateTwoFactorCode());
    }

    // Assert
    // Avec 50 codes aléatoires sur 900 000 possibilités, on doit avoir au moins 45 codes uniques
    expect(codes.size).toBeGreaterThan(45);
  });

  // Teste que createTwoFactorCode supprime les anciens codes et crée un nouveau code hashé
  it("CreateTwoFactorCode_ShouldDeleteOldCodes_AndCreateHashedCode", async () => {
    // Arrange
    const userId = "user_123";
    (bcrypt.hash as any).mockResolvedValue("hashedCode");
    prismaMock.twoFactorCode.deleteMany.mockResolvedValue({ count: 1 } as any);
    prismaMock.twoFactorCode.create.mockResolvedValue({} as any);

    // Act
    const code = await createTwoFactorCode(userId);

    // Assert
    expect(code).toMatch(/^\d{6}$/);
    expect(prismaMock.twoFactorCode.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith(code, 10);
    expect(prismaMock.twoFactorCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        code: "hashedCode",
      }),
    });
  });

  // Teste que createTwoFactorCode stocke une date d'expiration dans le futur
  it("CreateTwoFactorCode_ShouldSetExpirationInFuture", async () => {
    // Arrange
    const userId = "user_123";
    (bcrypt.hash as any).mockResolvedValue("hashedCode");
    prismaMock.twoFactorCode.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.twoFactorCode.create.mockResolvedValue({} as any);

    const beforeCreate = Date.now();

    // Act
    await createTwoFactorCode(userId);

    // Assert
    const createCall = prismaMock.twoFactorCode.create.mock.calls[0]![0] as any;
    const expiresAt = createCall.data.expiresAt as Date;
    expect(expiresAt.getTime()).toBeGreaterThan(beforeCreate);
    // Doit expirer dans environ 5 minutes (entre 4 et 6 min pour la marge)
    const diffMinutes = (expiresAt.getTime() - beforeCreate) / 1000 / 60;
    expect(diffMinutes).toBeGreaterThanOrEqual(4);
    expect(diffMinutes).toBeLessThanOrEqual(6);
  });

  // Teste que verifyTwoFactorCode retourne true pour un code valide non expiré
  it("VerifyTwoFactorCode_ShouldReturnTrue_WhenCodeIsValidAndNotExpired", async () => {
    // Arrange
    const futureDate = new Date(Date.now() + 5 * 60 * 1000);
    prismaMock.twoFactorCode.findFirst.mockResolvedValue({
      id: "tfc_1",
      code: "hashedCode",
      userId: "user_123",
      expiresAt: futureDate,
      createdAt: new Date(),
    } as any);
    (bcrypt.compare as any).mockResolvedValue(true);
    prismaMock.twoFactorCode.delete.mockResolvedValue({} as any);

    // Act
    const result = await verifyTwoFactorCode("user_123", "123456");

    // Assert
    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith("123456", "hashedCode");
    // Le code doit être supprimé après validation (usage unique)
    expect(prismaMock.twoFactorCode.delete).toHaveBeenCalledWith({
      where: { id: "tfc_1" },
    });
  });

  // Teste que verifyTwoFactorCode retourne false quand le code n'existe pas
  it("VerifyTwoFactorCode_ShouldReturnFalse_WhenCodeNotFound", async () => {
    // Arrange
    prismaMock.twoFactorCode.findFirst.mockResolvedValue(null);

    // Act
    const result = await verifyTwoFactorCode("user_123", "123456");

    // Assert
    expect(result).toBe(false);
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(prismaMock.twoFactorCode.delete).not.toHaveBeenCalled();
  });

  // Teste que verifyTwoFactorCode retourne false et supprime le code quand il est expiré
  it("VerifyTwoFactorCode_ShouldReturnFalse_AndDeleteCode_WhenExpired", async () => {
    // Arrange
    const pastDate = new Date(Date.now() - 10 * 60 * 1000); // expiré depuis 10 min
    prismaMock.twoFactorCode.findFirst.mockResolvedValue({
      id: "tfc_2",
      code: "hashedCode",
      userId: "user_123",
      expiresAt: pastDate,
      createdAt: new Date(),
    } as any);
    prismaMock.twoFactorCode.delete.mockResolvedValue({} as any);

    // Act
    const result = await verifyTwoFactorCode("user_123", "123456");

    // Assert
    expect(result).toBe(false);
    expect(bcrypt.compare).not.toHaveBeenCalled();
    // Le code expiré doit être supprimé
    expect(prismaMock.twoFactorCode.delete).toHaveBeenCalledWith({
      where: { id: "tfc_2" },
    });
  });

  // Teste que verifyTwoFactorCode retourne false quand le code est faux mais non expiré
  it("VerifyTwoFactorCode_ShouldReturnFalse_WhenCodeIsInvalid", async () => {
    // Arrange
    const futureDate = new Date(Date.now() + 5 * 60 * 1000);
    prismaMock.twoFactorCode.findFirst.mockResolvedValue({
      id: "tfc_3",
      code: "hashedCode",
      userId: "user_123",
      expiresAt: futureDate,
      createdAt: new Date(),
    } as any);
    (bcrypt.compare as any).mockResolvedValue(false);

    // Act
    const result = await verifyTwoFactorCode("user_123", "wrongCode");

    // Assert
    expect(result).toBe(false);
    expect(bcrypt.compare).toHaveBeenCalled();
    // Le code reste en BD pour permettre une nouvelle tentative (tant que pas expiré)
    expect(prismaMock.twoFactorCode.delete).not.toHaveBeenCalled();
  });

  // Teste que deleteTwoFactorCodesForUser supprime tous les codes d'un utilisateur
  it("DeleteTwoFactorCodesForUser_ShouldDeleteAllCodesForUser", async () => {
    // Arrange
    prismaMock.twoFactorCode.deleteMany.mockResolvedValue({ count: 2 } as any);

    // Act
    await deleteTwoFactorCodesForUser("user_123");

    // Assert
    expect(prismaMock.twoFactorCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_123" },
    });
  });
});
