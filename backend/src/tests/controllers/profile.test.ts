import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { updateProfile } from "../../controllers/user.controller";
import { updateUser } from "../../services/user.service";
import * as authService from "../../services/auth.service";
import express from "express";
import request from "supertest";
import multer from "multer";


jest.mock("../../services/user.service", () => ({
  updateUser: jest.fn(),
}));

const mockUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>;

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  (req as any).user = { id: "cmo3hwmy6000ep0nvjx3farrs" };
  (req as any).session = {};
  next();
});

const upload = multer({ storage: multer.memoryStorage() });
app.patch("/user/updateProfile", upload.single("profilePicture"), updateProfile);

const mockUser = {
  id: "cmo3hwmy6000ep0nvjx3farrs",
  firstName: "Juan",
  lastName: "Santofimio",
  email: "juan@example.com",
  emailVerifiedAt: new Date(),
  password: null,
  googleId: null,
  address: "309 ch chambly",
  phone: "5148674413",
  profilePicture: "/uploads/profiles/avatar.jpg",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("userControllerTests", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie que la mise à jour du profil retourne 200 avec les données correctes
  it("updateUser_return200", async () => {

    // Arrange
    mockUpdateUser.mockResolvedValue(mockUser as any);

    // Act
    const res = await request(app)
      .patch("/user/updateProfile")
      .send({
        firstName: "Juan Sebastian",
        lastName: "S",
        email: "juan@example.com",
        address: "1994 ch chambly",
        phone: "5140000000",
      });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe("Juan");
    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cmo3hwmy6000ep0nvjx3farrs" })
    );
  });

  // Vérifie que la mise à jour de la photo de profil retourne 200
  it("updateUserImage_return200", async () => {

    // Arrange
    const updatedUserWithPhoto = {
      ...mockUser,
      profilePicture: "/uploads/profiles/1234567890-fake.jpg",
    };
    mockUpdateUser.mockResolvedValue(updatedUserWithPhoto as any);

    // Act
    const res = await request(app)
      .patch("/user/updateProfile")
      .attach("profilePicture", Buffer.from("fake-image"), "nouvelle-photo.jpg")
      .field("firstName", "Juan")
      .field("lastName", "Santofimio");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.user.profilePicture).toContain("/uploads/profiles/");
  });

  // Vérifie que la mise à jour retourne 500 en cas d'erreur de la base de données
  it("updateUser_returns500", async () => {

    // Arrange
    mockUpdateUser.mockRejectedValue(new Error("Erreur lors de la mise à jour du profil"));

    // Act
    const res = await request(app)
      .patch("/user/updateProfile")
      .send({ firstName: "Juan" });

    // Assert
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Erreur lors de la mise à jour du profil");
  });

  // Vérifie que la mise à jour retourne 400 lorsque l'email est invalide
  it("updateProfile_ShouldReturn400_WhenEmailIsInvalid", async () => {
    // Arrange
    mockUpdateUser.mockResolvedValue(mockUser as any);

    // Act
    const res = await request(app)
      .patch("/user/updateProfile")
      .send({ email: "emailsansarobas" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email invalide.");
  });

  // Vérifie que la mise à jour retourne 400 lorsque l'email est déjà utilisé
  it("updateProfile_ShouldReturn400_WhenEmailIsAlreadyTaken", async () => {
    // Arrange
    mockUpdateUser.mockResolvedValue(mockUser as any);
    jest.spyOn(authService, "findUserByEmail").mockResolvedValue({ id: "otro-id", email: "taken@test.com" } as any);

    // Act
    const res = await request(app)
      .patch("/user/updateProfile")
      .send({ email: "taken@test.com" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cet email est déjà utilisé.");
  });

  // Vérifie qu'un email de confirmation est envoyé et retourne 200 lorsque l'email change
  it("updateProfile_ShouldSendEmailAndReturn200_WhenEmailChanges", async () => {
    // Arrange
    mockUpdateUser.mockResolvedValue(mockUser as any);
    jest.spyOn(authService, "findUserByEmail").mockResolvedValue(null);
    jest.spyOn(authService, "createEmailChangeToken").mockResolvedValue({} as any);
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    ) as unknown as typeof fetch;

    // Act
    const res = await request(app)
      .patch("/user/updateProfile")
      .send({ email: "nuevo@test.com" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.emailMessage).toContain("nuevo@test.com");
  });

});