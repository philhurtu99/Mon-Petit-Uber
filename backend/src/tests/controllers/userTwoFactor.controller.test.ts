import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// Mock prisma AVANT tout pour éviter le chargement du client généré
jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    twoFactorCode: {
      deleteMany: jest.fn(),
    },
  },
}));

import * as userService from "../../services/user.service";
import * as twoFactorService from "../../services/twoFactor.service";
import { toggleTwoFactor, getTwoFactor } from "../../controllers/user.controller";

jest.mock("../../services/user.service");
jest.mock("../../services/twoFactor.service");

// Setup avec un user connecté simulé
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  (req as any).session = {};
  (req as any).user = { id: "user_test", phone: "+15145551234" };
  next();
});

app.patch("/user/two-factor", toggleTwoFactor);
app.get("/user/two-factor", getTwoFactor);

describe("UserTwoFactorControllerTests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // --- TOGGLE 2FA (PATCH) ---

  // Teste qu'activer la 2FA avec méthode EMAIL fonctionne
  it("ToggleTwoFactor_Enable_WithEmail_Success", async () => {
    // Arrange
    (userService.setTwoFactorSettings as any).mockResolvedValue({
      id: "user_test",
      twoFactorEnabled: true,
      twoFactorMethod: "EMAIL",
      phone: "+15145551234",
    });

    // Act
    const response = await request(app)
      .patch("/user/two-factor")
      .send({ enabled: true, method: "EMAIL" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.twoFactorEnabled).toBe(true);
    expect(response.body.twoFactorMethod).toBe("EMAIL");
    expect(userService.setTwoFactorSettings).toHaveBeenCalledWith(
      "user_test",
      true,
      "EMAIL",
      undefined,
    );
  });

  // Teste qu'activer la 2FA avec méthode SMS et numéro valide fonctionne
  it("ToggleTwoFactor_Enable_WithSmsAndPhone_Success", async () => {
    // Arrange
    (userService.setTwoFactorSettings as any).mockResolvedValue({
      id: "user_test",
      twoFactorEnabled: true,
      twoFactorMethod: "SMS",
      phone: "+15145551234",
    });

    // Act
    const response = await request(app)
      .patch("/user/two-factor")
      .send({ enabled: true, method: "SMS", phone: "+15145551234" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.twoFactorMethod).toBe("SMS");
  });

  // Teste que désactiver la 2FA supprime les codes en attente
  it("ToggleTwoFactor_Disable_DeletesPendingCodes", async () => {
    // Arrange
    (userService.setTwoFactorSettings as any).mockResolvedValue({
      id: "user_test",
      twoFactorEnabled: false,
      twoFactorMethod: null,
      phone: "+15145551234",
    });
    (twoFactorService.deleteTwoFactorCodesForUser as any).mockResolvedValue(undefined);

    // Act
    const response = await request(app)
      .patch("/user/two-factor")
      .send({ enabled: false });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.twoFactorEnabled).toBe(false);
    expect(twoFactorService.deleteTwoFactorCodesForUser).toHaveBeenCalledWith("user_test");
  });

  // Teste que activer sans méthode retourne 400
  it("ToggleTwoFactor_Enable_WithoutMethod_Returns400", async () => {
    // Act
    const response = await request(app)
      .patch("/user/two-factor")
      .send({ enabled: true });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("EMAIL");
    expect(userService.setTwoFactorSettings).not.toHaveBeenCalled();
  });

  // Teste que activer avec méthode invalide retourne 400
  it("ToggleTwoFactor_Enable_WithInvalidMethod_Returns400", async () => {
    // Act
    const response = await request(app)
      .patch("/user/two-factor")
      .send({ enabled: true, method: "TOTP" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("EMAIL");
  });

  // Teste que activer SMS sans numéro de téléphone valide retourne 400
  it("ToggleTwoFactor_Enable_SmsWithoutPhone_Returns400", async () => {
    // Arrange - simuler un user sans phone dans la session
    const appNoPhone = express();
    appNoPhone.use(express.json());
    appNoPhone.use((req, res, next) => {
      (req as any).session = {};
      (req as any).user = { id: "user_test", phone: null };
      next();
    });
    appNoPhone.patch("/user/two-factor", toggleTwoFactor);

    // Act
    const response = await request(appNoPhone)
      .patch("/user/two-factor")
      .send({ enabled: true, method: "SMS" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("numéro de téléphone");
  });

  // Teste que enabled non boolean retourne 400
  it("ToggleTwoFactor_EnabledNotBoolean_Returns400", async () => {
    // Act
    const response = await request(app)
      .patch("/user/two-factor")
      .send({ enabled: "yes" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("enabled");
  });

  // Teste que erreur service retourne 500
  it("ToggleTwoFactor_ServiceError_Returns500", async () => {
    // Arrange
    (userService.setTwoFactorSettings as any).mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const response = await request(app)
      .patch("/user/two-factor")
      .send({ enabled: true, method: "EMAIL" });

    // Assert
    expect(response.status).toBe(500);
  });

  // --- GET 2FA ---

  // Teste que GET retourne les paramètres 2FA
  it("GetTwoFactor_ReturnsSettings", async () => {
    // Arrange
    (userService.getTwoFactorSettings as any).mockResolvedValue({
      twoFactorEnabled: true,
      twoFactorMethod: "EMAIL",
      phone: "+15145551234",
    });

    // Act
    const response = await request(app).get("/user/two-factor");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.twoFactorEnabled).toBe(true);
    expect(response.body.twoFactorMethod).toBe("EMAIL");
  });

  // Teste que GET retourne 404 si utilisateur introuvable
  it("GetTwoFactor_UserNotFound_Returns404", async () => {
    // Arrange
    (userService.getTwoFactorSettings as any).mockResolvedValue(null);

    // Act
    const response = await request(app).get("/user/two-factor");

    // Assert
    expect(response.status).toBe(404);
  });
});
