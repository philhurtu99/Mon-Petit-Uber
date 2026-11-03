import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import * as authService from "../../services/auth.service";
import bcrypt from "bcrypt";
import {
  forgotPassword,
  login,
  register,
  resetPassword,
  verifyEmail,
  getSession,
  logout,
} from "../../controllers/auth.controller";

jest.mock("../../services/auth.service");
jest.mock("bcrypt");

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockImplementation(async () => true),
  }),
}));

// Setup de base (Similaire au constructeur en C#)
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  (req as any).session = {};
  next();
});

app.post("/auth/register", register);
app.post("/auth/verifyEmail", verifyEmail);
app.post("/auth/login", login);
app.post("/auth/forgotPassword", forgotPassword);
app.post("/auth/resetPassword", resetPassword);
app.get("/auth/session", getSession);
app.post("/auth/logout", logout);

describe("AuthController", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Teste si la création d'un utilisateur échoue lorsque l'email est déjà utilisé
  it("Register_EmailAlreadyExists_Returns400", async () => {
    // Arrange
    const formData = {
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    };

    (authService.findUserByEmail as any).mockResolvedValue({
      id: "1",
      email: formData.email,
    });
    // Act
    const response = await request(app).post("/auth/register").send(formData);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email déjà utilisé.");
    expect(authService.createUser).not.toHaveBeenCalled();
  });

  // Teste si la création d'un utilisateur échoue lorsque les mots de passe ne correspondent pas
  it("Register_PasswordMismatch_Returns400", async () => {
    // Arrange
    const formData = {
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "WrongPassword!",
    };

    // Act
    const response = await request(app).post("/auth/register").send(formData);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Les mots de passe ne correspondent pas.",
    );
    expect(authService.createUser).not.toHaveBeenCalled();
  });

  it("Register_PasswordNotValid_Returns400", async () => {
    // Arrange
    const formData = {
      email: "test@test.com",
      password: "Passw0rd",
      passwordConfirm: "Passw0rd",
    };

    // Act
    const response = await request(app).post("/auth/register").send(formData);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.",
    );
    expect(authService.createUser).not.toHaveBeenCalled();
  });

  // Teste si la création d'un utilisateur réussit avec un email et un mot de passe valides
  it("Register_Success_Returns201", async () => {
    // Arrange
    const formData = {
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    };

    (authService.findUserByEmail as any).mockResolvedValue(null);
    (authService.createUser as any).mockResolvedValue({
      id: "1",
      email: formData.email,
    });

    // Act
    const response = await request(app).post("/auth/register").send(formData);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "Utilisateur créé. Veuillez vérifier votre courriel.",
    );
    expect(authService.createUser).toHaveBeenCalled();
  });

  // Ce test vérifie que l'inscription avec une photo de profil retourne 201
  it("Register_WithProfilePicture_Returns201", async () => {
    // Arrange
    const validRegisterPayload = {
      id: "1",
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    };
    (authService.findUserByEmail as any).mockResolvedValue(null);
    (authService.createUser as any).mockResolvedValue({
      validRegisterPayload,
    });
    (authService.createVerificationToken as any).mockResolvedValue({});
    (bcrypt.hash as any).mockResolvedValue("hashedPassword");
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) } as any);

    // Créer une app locale qui injecte req.file directement
    const appWithFile = express();
    appWithFile.use(express.json());
    appWithFile.use((req, res, next) => {
      (req as any).session = {};
      (req as any).file = { filename: "photo.jpg" }; // ← simule multer
      next();
    });
    appWithFile.post("/auth/register", register);

    // Act
    const response = await request(appWithFile)
      .post("/auth/register")
      .send(validRegisterPayload);

    // Assert
    expect(response.status).toBe(201);
    expect(authService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePicture: "/uploads/profiles/photo.jpg",
      }),
    );
  });

  // Ce test vérifie que l'inscription sans photo de profil retourne 201 avec profilePicture null
  it("Register_WithoutProfilePicture_Returns201WithNullPicture", async () => {
    // Arrange
    const validRegisterPayload = {
      id: "1",
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    };
    (authService.findUserByEmail as any).mockResolvedValue(null);
    (authService.createUser as any).mockResolvedValue({
      validRegisterPayload,
    });
    (authService.createVerificationToken as any).mockResolvedValue({});
    (bcrypt.hash as any).mockResolvedValue("hashedPassword");
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) } as any);

    // Act
    const response = await request(app)
      .post("/auth/register")
      .send(validRegisterPayload);

    // Assert
    expect(response.status).toBe(201);
    expect(authService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePicture: null,
      }),
    );
  });

  // Teste si la création d'un utilisateur échoue lorsque la base de données retourne une erreur
  it("Register_DatabaseError_Returns500", async () => {
    // Spy sur console.error pour éviter les logs en cas d'erreur
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });

    // Arrange
    const formData = {
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    };

    (authService.findUserByEmail as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue("hashedPassword123");
    (authService.createUser as any).mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const response = await request(app).post("/auth/register").send(formData);

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Erreur lors de l'inscription.");

    // Clean la console à cause d'un message d'erreur envoyé à la console
    consoleSpy.mockRestore();
  });

  // Ce test vérifie que l'inscription avec une erreur de base de données retourne 500
  it("Register_BrevoSuccess_LogsSuccess", async () => {
    // Arrange
    const validRegisterPayload = {
      id: "1",
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    };
    (authService.findUserByEmail as any).mockResolvedValue(null);
    (authService.createUser as any).mockResolvedValue({
      validRegisterPayload,
    });
    (authService.createVerificationToken as any).mockResolvedValue({});
    (bcrypt.hash as any).mockResolvedValue("hashedPassword");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as any);

    // Act
    const response = await request(app)
      .post("/auth/register")
      .send(validRegisterPayload);

    // Assert
    expect(response.status).toBe(201);
    expect(consoleSpy).toHaveBeenCalledWith(
      "E-mail envoyé avec succès via Brevo !",
    );

    consoleSpy.mockRestore();
  });

  // Ce test vérifie que l'erreur Brevo est bien logguée
  it("Register_BrevoError_LogsBrevoError", async () => {
    // Arrange
    const validRegisterPayload = {
      id: "1",
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    };
    (authService.findUserByEmail as any).mockResolvedValue(null);
    (authService.createUser as any).mockResolvedValue({
      validRegisterPayload,
    });
    (authService.createVerificationToken as any).mockResolvedValue({});
    (bcrypt.hash as any).mockResolvedValue("hashedPassword");
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });

    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Brevo error" }),
    } as any);

    // Act
    const response = await request(app)
      .post("/auth/register")
      .send(validRegisterPayload);

    // Assert
    expect(response.status).toBe(201);
    expect(consoleSpy).toHaveBeenCalledWith("Erreur Brevo détaillée:", {
      message: "Brevo error",
    });

    consoleSpy.mockRestore();
  });

  // Ce test vérifie que l'erreur réseau est bien logguée
  it("Register_BrevoNetworkFailure_LogsNetworkError", async () => {
    // Arrange
    const validRegisterPayload = {
      id: "1",
      email: "test@test.com",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    };
    (authService.findUserByEmail as any).mockResolvedValue(null);
    (authService.createUser as any).mockResolvedValue({
      validRegisterPayload,
    });
    (authService.createVerificationToken as any).mockResolvedValue({});
    (bcrypt.hash as any).mockResolvedValue("hashedPassword");
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });

    jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("Network failure")) as any;

    // Act
    const response = await request(app)
      .post("/auth/register")
      .send(validRegisterPayload);

    // Assert
    expect(response.status).toBe(201);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Erreur réseau lors de l'appel à Brevo :",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  // Teste la vérification d'email avec un token invalide
  it("VerifyEmail_InvalidToken_Returns400", async () => {
    // Arrange
    (authService.findVerificationToken as any).mockResolvedValue(null);

    // Act
    const response = await request(app)
      .post("/auth/verifyEmail")
      .send({ token: "token" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Token de vérification invalide ou expiré.",
    );
  });

  // Teste la vérification d'email avec un token valide
  it("VerifyEmail_Success_Returns200", async () => {
    // Arrange
    const TokenData = {
      id: 1,
      userId: "123",
      token: "token",
      expiresAt: new Date(),
    };
    (authService.findVerificationToken as any).mockResolvedValue(TokenData);
    (prismaMock.user.update as any).mockResolvedValue({
      id: TokenData.userId,
    } as any);

    prismaMock.verificationToken.delete.mockResolvedValue(TokenData as any);

    // Act
    const response = await request(app)
      .post("/auth/verifyEmail")
      .send({ token: TokenData.token });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Courriel vérifié avec succès. Vous pouvez maintenant vous connecter.",
    );
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledTimes(1);
  });

  it("VerifyEmail_ErrorWhileVerifying_Returns400", async () => {
    // Spy sur console.error pour éviter les logs en cas d'erreur
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });
    // Arrange
    const TokenData = {
      id: 1,
      userId: "123",
      token: "token",
      expiresAt: new Date(),
    };
    (authService.findVerificationToken as any).mockResolvedValue(TokenData);
    (prismaMock.user.update as any).mockRejectedValue(
      new Error("Erreur lors de la vérification du courriel."),
    );

    // Act
    const response = await request(app)
      .post("/auth/verifyEmail")
      .send({ token: TokenData.token });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "Erreur lors de la vérification du courriel.",
    );
    // Clean la console à cause d'un message d'erreur envoyé à la console
    consoleSpy.mockRestore();
  });

  // Teste la connexion avec un utilisateur non trouvé
  it("Login_UserNotFound_Returns400", async () => {
    // Arrange
    (authService.findUserByEmail as any).mockResolvedValue(null);

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "password" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email ou mot de passe invalide.");
  });

  // Teste la connexion avec un mot de passe invalide
  it("Login_PasswordInvalid_Returns400", async () => {
    // Arrange
    (authService.findUserByEmail as any).mockResolvedValue(null);

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "password" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email ou mot de passe invalide.");
  });

  // Teste la connexion avec un mot de passe vide
  it("Login_EmptyPassword_Returns400", async () => {
    // Arrange
    (authService.findUserByEmail as any).mockResolvedValue({
      id: "123",
      email: "test@example.com",
      password: "",
      emailVerifiedAt: new Date(),
    });

    (bcrypt.compare as any).mockResolvedValue(false);

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email ou mot de passe invalide.");
  });

  // Teste la connexion avec un email non vérifié
  it("Login_EmailNotVerified_Returns400", async () => {
    // Arrange
    (authService.findUserByEmail as any).mockResolvedValue({
      id: "123",
      email: "test@example.com",
      password: "password",
      emailVerifiedAt: null,
    });

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "password" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Veuillez vérifier votre courriel avant de vous connecter.",
    );
  });

  // Ce test vérifie que la connexion avec une erreur de base de données retourne 500
  it("Login_DatabaseError_Returns500", async () => {
    // Arrange
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });

    (authService.findUserByEmail as any).mockRejectedValue(
      new Error("DB Error"),
    );

    // Act
    const response = await request(app).post("/auth/login").send({
      email: "test@test.com",
      password: "Passw0rd!",
    });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Erreur lors de la connexion.");

    consoleSpy.mockRestore();
  });

  // Teste la connexion avec un utilisateur valide
  it("Login_Success_Returns200", async () => {
    // Arrange
    (authService.findUserByEmail as any).mockResolvedValue({
      id: "123",
      email: "test@example.com",
      firstName: "test",
      lastName: "test",
      password: "password",
      emailVerifiedAt: new Date(),
    });

    (bcrypt.compare as any).mockResolvedValue(true);

    // Act
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "password" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.email).toBe("test@example.com");
    expect(response.body.firstName).toBe("test");
    expect(response.body.lastName).toBe("test");
  });

  // Teste la récupération du mot de passe avec un utilisateur non trouvé
  it("ForgotPassword_UserNotFound_Returns200WithGenericMessage", async () => {
    // Arrange
    (authService.findUserByEmail as any).mockResolvedValue(null);

    // Act
    const response = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: "notfound@example.com" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Si ce courriel existe, un lien vous a été envoyé.",
    );
    expect(authService.createPasswordResetToken).not.toHaveBeenCalled();
  });

  // Teste la récupération du mot de passe avec un utilisateur trouvé
  it("ForgotPassword_UserFound_Returns200AndCreatesToken", async () => {
    // Arrange
    (authService.findUserByEmail as any).mockResolvedValue({
      id: "123",
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
    });

    // On simule que la création du token fonctionne
    (authService.createPasswordResetToken as any).mockResolvedValue({});

    // Act
    const response = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: "test@test.com" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Si ce courriel existe, un lien vous a été envoyé.",
    );
    expect(authService.createPasswordResetToken).toHaveBeenCalledWith(
      "123",
      expect.any(String), // Car crypto.randomUUID() génère un string aléatoire
    );
  });

  // Teste la récupération du mot de passe avec une erreur de base de données
  it("ForgotPassword_DatabaseError_Returns500", async () => {
    // Arrange
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });
    (authService.findUserByEmail as any).mockRejectedValue(
      new Error("DB Error"),
    );

    // Act
    const response = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: "test@test.com" });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "Une erreur est survenue lors de la réinitialisation du mot de passe.",
    );

    consoleSpy.mockRestore();
  });

  // Teste la réinitialisation du mot de passe avec un mot de passe qui ne correspond pas
  it("ResetPassword_PasswordMismatch_Returns400", async () => {
    // Act
    const response = await request(app).post("/auth/resetPassword").send({
      token: "valid-token",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd@",
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Les mots de passe ne correspondent pas.",
    );
  });

  // Teste la réinitialisation du mot de passe avec un mot de passe faible
  it("ResetPassword_WeakPassword_Returns400", async () => {
    // Act
    const response = await request(app).post("/auth/resetPassword").send({
      token: "valid-token",
      password: "weak", // Ne respecte pas le minimum pour le mot de passe
      passwordConfirm: "weak",
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Le mot de passe ne respecte pas les critères de sécurité.",
    );
  });

  // Teste la réinitialisation du mot de passe avec un token invalide
  it("ResetPassword_InvalidToken_Returns400", async () => {
    // Arrange
    (authService.findPasswordResetToken as any).mockResolvedValue(null);

    // Act
    const response = await request(app).post("/auth/resetPassword").send({
      token: "invalid-token",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Lien invalide ou expiré.");
  });

  // Teste la réinitialisation du mot de passe avec un token expiré
  it("ResetPassword_ExpiredToken_Returns400", async () => {
    // Arrange
    // On simule un token qui a expiré il y a 1 heure
    (authService.findPasswordResetToken as any).mockResolvedValue({
      id: "token-123",
      userId: "123",
      token: "expired-token",
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    // Act
    const response = await request(app).post("/auth/resetPassword").send({
      token: "expired-token",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Lien invalide ou expiré.");
  });

  // Teste la réinitialisation du mot de passe avec un token valide
  it("ResetPassword_Success_Returns200", async () => {
    // Arrange
    // On simule un token valide (expire dans 1 heure)
    (authService.findPasswordResetToken as any).mockResolvedValue({
      id: "token-123",
      userId: "123",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    (bcrypt.hash as any).mockResolvedValue("hashedNewPassword");

    // Mock les appels Prisma directement dans le contrôleur
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.passwordResetToken.delete.mockResolvedValue({} as any);

    // Act
    const response = await request(app).post("/auth/resetPassword").send({
      token: "valid-token",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Mot de passe mis à jour avec succès.");

    // Vérifier que le hash a été appelé avec le bon mot de passe
    expect(bcrypt.hash).toHaveBeenCalledWith("Passw0rd!", 10);

    // Vérifier que l'utilisateur a été mis à jour et que le token est supprimé
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "123" },
      data: { password: "hashedNewPassword" },
    });
    expect(prismaMock.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: "token-123" },
    });
  });

  // Ce test vérifie que la session avec un utilisateur valide retourne l'utilisateur
  it("GetSession_Success_Returns200", async () => {

    // Arrange
    const dbUser = {id: "123", email: "test@test.com", firstName: "John", lastName: "Doe", profilePicture: null, role: "user", address: null, phone: null,  } as any;
    jest.spyOn(authService, "findUserById").mockResolvedValue(dbUser);

    const appWithSession = express();
    appWithSession.use(express.json());
    appWithSession.use((req, res, next) => {
      (req as any).session = { user: { id: "123", email: "test@test.com" } };
      next();
    });
    appWithSession.get("/auth/session", getSession);

    // Act
    const response = await request(appWithSession).get("/auth/session");
    console.log("response.body:", response.body);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(dbUser);
  });

  // Ce test vérifie que la session vide retourne null
  it("GetSession_NoUserInSession_ReturnsNull", async () => {
    // Arrange
    const appWithSession = express();
    appWithSession.use(express.json());
    appWithSession.use((req, res, next) => {
      (req as any).session = {};
      next();
    });
    appWithSession.get("/auth/session", getSession);

    // Act
    const response = await request(appWithSession).get("/auth/session");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: null });
  });

  // Ce test vérifie que la déconnexion réussie retourne 200 et un message de succès
  it("Logout_Success_Returns200", async () => {
    const appWithSession = express();
    appWithSession.use(express.json());
    appWithSession.use((req, res, next) => {
      (req as any).session = {
        user: { id: "123", email: "test@test.com" },
        destroy: (cb: Function) => cb(),
      };
      next();
    });
    appWithSession.post("/auth/logout", logout);

    const response = await request(appWithSession).post("/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Déconnexion réussie." });
  });

  // Ce test vérifie que la réinitialisation de mot de passe avec une erreur de base de données retourne 500
  it("ResetPassword_DatabaseError_Returns500", async () => {
    // Arrange
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });

    (authService.findPasswordResetToken as any).mockRejectedValue(
      new Error("DB Error"),
    );

    // Act
    const response = await request(app).post("/auth/resetPassword").send({
      token: "valid-token",
      password: "Passw0rd!",
      passwordConfirm: "Passw0rd!",
    });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Erreur lors de la réinitialisation.");

    consoleSpy.mockRestore();
  });

  // Ce test vérifie que l'inscription avec consentement marketing EMAIL crée 
// l'utilisateur avec les bons champs marketing
it("Register_AvecConsentEmail_UserCreatedAvecMarketing", async () => {
  // Arrange
  const formData = {
    email: "marketing@test.com",
    password: "Passw0rd!",
    passwordConfirm: "Passw0rd!",
    marketingConsent: "true",       // String parce que FormData
    marketingMethod: "EMAIL",
  };

  (authService.findUserByEmail as any).mockResolvedValue(null);
  (authService.createUser as any).mockResolvedValue({
    id: "1",
    email: formData.email,
  });
  (authService.createVerificationToken as any).mockResolvedValue({});
  (bcrypt.hash as any).mockResolvedValue("hashedPassword");
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({ ok: true, json: async () => ({}) } as any);

  // Act
  const response = await request(app).post("/auth/register").send(formData);

  // Assert
  expect(response.status).toBe(201);
  expect(authService.createUser).toHaveBeenCalledWith(
    expect.objectContaining({
      marketingConsent: true,
      marketingMethod: "EMAIL",
      marketingConsentDate: expect.any(Date),
    }),
  );
});

// ============================================================
// TESTS REGISTER POUR PRÉFÉRENCES MARKETING
// ============================================================
// Ce test vérifie que l'inscription sans consentement marketing crée l'utilisateur 
// avec les valeurs par défaut
it("Register_SansConsent_UserCreatedAvecDefaults", async () => {
  // Arrange
  const formData = {
    email: "noconsent@test.com",
    password: "Passw0rd!",
    passwordConfirm: "Passw0rd!",
  };

  (authService.findUserByEmail as any).mockResolvedValue(null);
  (authService.createUser as any).mockResolvedValue({
    id: "2",
    email: formData.email,
  });
  (authService.createVerificationToken as any).mockResolvedValue({});
  (bcrypt.hash as any).mockResolvedValue("hashedPassword");
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({ ok: true, json: async () => ({}) } as any);

  // Act
  const response = await request(app).post("/auth/register").send(formData);

  // Assert
  expect(response.status).toBe(201);
  expect(authService.createUser).toHaveBeenCalledWith(
    expect.objectContaining({
      marketingConsent: false,
      marketingMethod: null,
      marketingConsentDate: null,
    }),
  );
});


// Ce test vérifie que l'inscription avec consent=true mais sans méthode retourne 400
it("Register_ConsentTrueSansMethod_Returns400", async () => {
  // Arrange
  const formData = {
    email: "consentnomethod@test.com",
    password: "Passw0rd!",
    passwordConfirm: "Passw0rd!",
    marketingConsent: "true",
    // marketingMethod manquante volontairement
  };

  (authService.findUserByEmail as any).mockResolvedValue(null);

  // Act
  const response = await request(app).post("/auth/register").send(formData);

  // Assert
  expect(response.status).toBe(400);
  expect(authService.createUser).not.toHaveBeenCalled();
});


// Ce test vérifie que l'inscription avec une méthode marketing invalide retourne 400
it("Register_MarketingMethodInvalide_Returns400", async () => {
  // Arrange
  const formData = {
    email: "invalidmethod@test.com",
    password: "Passw0rd!",
    passwordConfirm: "Passw0rd!",
    marketingConsent: "true",
    marketingMethod: "WHATSAPP",   // valeur invalide
  };

  (authService.findUserByEmail as any).mockResolvedValue(null);

  // Act
  const response = await request(app).post("/auth/register").send(formData);

  // Assert
  expect(response.status).toBe(400);
  expect(authService.createUser).not.toHaveBeenCalled();
});
});
