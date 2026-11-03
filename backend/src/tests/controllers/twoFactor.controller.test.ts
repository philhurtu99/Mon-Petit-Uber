import { prismaMock } from "../prismaMock"; // Obligatoirement premier lors de l'import pour les tests
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import * as authService from "../../services/auth.service";
import * as twoFactorService from "../../services/twoFactor.service";
import * as smsService from "../../services/sms.service";
import bcrypt from "bcrypt";
import {
  login,
  verifyTwoFactor,
} from "../../controllers/auth.controller";

jest.mock("../../services/auth.service");
jest.mock("../../services/twoFactor.service");
jest.mock("../../services/sms.service");
jest.mock("bcrypt");

// Setup
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  (req as any).session = {};
  next();
});

app.post("/auth/login", login);
app.post("/auth/verify-2fa", verifyTwoFactor);

describe("TwoFactorAuthControllerTests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // --- LOGIN avec 2FA activé ---

  // Teste que le login retourne requiresTwoFactor: true sans ouvrir la session quand 2FA est actif
  it("Login_Returns2faRequired_WhenTwoFactorEnabled", async () => {
    // Arrange
    const user = {
      id: "user_1",
      email: "test@test.com",
      password: "hashedPassword",
      emailVerifiedAt: new Date(),
      firstName: "Olivier",
      lastName: "Test",
      phone: "+15145551234",
      twoFactorEnabled: true,
      twoFactorMethod: "EMAIL",
    };
    (authService.findUserByEmail as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(true);
    (twoFactorService.createTwoFactorCode as any).mockResolvedValue("123456");

    // Mock global fetch (Brevo) pour le helper sendTwoFactorCodeToUser
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as any);

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "Passw0rd!" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.requiresTwoFactor).toBe(true);
    expect(response.body.userId).toBe("user_1");
    expect(response.body.method).toBe("EMAIL");
    // La session ne doit pas être ouverte (id absent dans la réponse)
    expect(response.body.id).toBeUndefined();
  });

  // Teste que le login envoie le code par sms quand la méthode est sms
  it("Login_SendsSms_WhenTwoFactorMethodIsSms", async () => {
    // Arrange
    const user = {
      id: "user_2",
      email: "test@test.com",
      password: "hashedPassword",
      emailVerifiedAt: new Date(),
      firstName: "Olivier",
      lastName: "Test",
      phone: "+15145551234",
      twoFactorEnabled: true,
      twoFactorMethod: "SMS",
    };
    (authService.findUserByEmail as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(true);
    (twoFactorService.createTwoFactorCode as any).mockResolvedValue("654321");
    (smsService.sendSms as any).mockResolvedValue(true);

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "Passw0rd!" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.requiresTwoFactor).toBe(true);
    expect(response.body.method).toBe("SMS");
    expect(smsService.sendSms).toHaveBeenCalledWith(
      "+15145551234",
      expect.stringContaining("654321"),
    );
  });

  // Teste que le login normal (sans 2FA) fonctionne toujours comme avant
  it("Login_OpensSession_WhenTwoFactorDisabled", async () => {
    // Arrange
    const user = {
      id: "user_3",
      email: "test@test.com",
      password: "hashedPassword",
      emailVerifiedAt: new Date(),
      firstName: "Olivier",
      lastName: "Test",
      phone: "+15145551234",
      role: "user",
      address: "123 rue Test",
      profilePicture: null,
      twoFactorEnabled: false,
      twoFactorMethod: null,
    };
    (authService.findUserByEmail as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(true);

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "Passw0rd!" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.requiresTwoFactor).toBeUndefined();
    expect(response.body.id).toBe("user_3");
    expect(response.body.email).toBe("test@test.com");
    // createTwoFactorCode ne doit pas être appelé quand 2FA désactivé
    expect(twoFactorService.createTwoFactorCode).not.toHaveBeenCalled();
  });

  // Teste que le login échoue avec 500 si l'envoi du code 2FA échoue
  it("Login_Returns500_WhenTwoFactorCodeSendFails", async () => {
    // Arrange
    const user = {
      id: "user_4",
      email: "test@test.com",
      password: "hashedPassword",
      emailVerifiedAt: new Date(),
      firstName: "Olivier",
      lastName: "Test",
      phone: null, // pas de phone, donc SMS échoue
      twoFactorEnabled: true,
      twoFactorMethod: "SMS",
    };
    (authService.findUserByEmail as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(true);
    (twoFactorService.createTwoFactorCode as any).mockResolvedValue("111111");
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "Passw0rd!" });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.message).toContain("Erreur");

    errorSpy.mockRestore();
  });

  // --- VERIFY 2FA ---

  // Teste qu'un code valide ouvre la session et retourne les infos utilisateur
  it("VerifyTwoFactor_Success_OpensSession", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_5",
      email: "test@test.com",
      firstName: "Olivier",
      lastName: "Test",
      profilePicture: null,
      role: "user",
      address: "123 rue Test",
      phone: "+15145551234",
      twoFactorEnabled: true,
    } as any);
    (twoFactorService.verifyTwoFactorCode as any).mockResolvedValue(true);

    // Act
    const response = await request(app)
      .post("/auth/verify-2fa")
      .send({ userId: "user_5", code: "123456" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.id).toBe("user_5");
    expect(response.body.email).toBe("test@test.com");
    expect(twoFactorService.verifyTwoFactorCode).toHaveBeenCalledWith("user_5", "123456");
  });

  // Teste qu'un code invalide retourne 400
  it("VerifyTwoFactor_InvalidCode_Returns400", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_6",
      twoFactorEnabled: true,
    } as any);
    (twoFactorService.verifyTwoFactorCode as any).mockResolvedValue(false);

    // Act
    const response = await request(app)
      .post("/auth/verify-2fa")
      .send({ userId: "user_6", code: "wrongcode" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Code invalide ou expiré.");
  });

  // Teste que userId manquant retourne 400
  it("VerifyTwoFactor_MissingUserId_Returns400", async () => {
    // Act
    const response = await request(app)
      .post("/auth/verify-2fa")
      .send({ code: "123456" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("requis");
  });

  // Teste que code manquant retourne 400
  it("VerifyTwoFactor_MissingCode_Returns400", async () => {
    // Act
    const response = await request(app)
      .post("/auth/verify-2fa")
      .send({ userId: "user_7" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("requis");
  });

  // Teste qu'un utilisateur introuvable retourne 400
  it("VerifyTwoFactor_UserNotFound_Returns400", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act
    const response = await request(app)
      .post("/auth/verify-2fa")
      .send({ userId: "user_unknown", code: "123456" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("introuvable");
  });

  // Teste qu'un utilisateur sans 2FA activée retourne 400
  it("VerifyTwoFactor_TwoFactorDisabled_Returns400", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_8",
      twoFactorEnabled: false,
    } as any);

    // Act
    const response = await request(app)
      .post("/auth/verify-2fa")
      .send({ userId: "user_8", code: "123456" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("non activée");
  });
});
