import { prismaMock } from "../prismaMock"; // Obligatoirement premier lors de l'import pour les tests
import {
  createPasswordResetToken,
  createUser,
  createVerificationToken,
  findPasswordResetToken,
  findUserByEmail,
  findVerificationToken,
  createEmailChangeToken,
  applyPendingEmail,
} from "../../services/auth.service";
import { describe, expect, it } from "@jest/globals";

describe("AuthServiceTests", () => {
  // Teste que findUserByEmail retourne un utilisateur lorsque celui-ci existe.
  it("FindUserByEmail_ShouldReturnUser_WhenUserExists", async () => {
    // Arrange
    const user = { email: "test@test.com", password: "password" } as any;
    prismaMock.user.findUnique.mockResolvedValue(user);

    // Act
    const result = await findUserByEmail("test@test.com");

    //  Assert
    expect(result?.email).toBe(user.email);
  });

  // Teste que findUserByEmail retourne null lorsque l'utilisateur n'existe pas.
  it("FindUserByEmail_ShouldReturnNull_WhenUserDoesNotExist", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act
    const result = await findUserByEmail("test@test.com");

    // Assert
    expect(result).toBeNull();
  });

  // Teste que createUser crée un utilisateur avec les données valides.
  it("CreateUser_ShouldReturnCreatedUser_WhenDataIsValid", async () => {
    // Arrange
    const user = { email: "test@test.com", password: "password" } as any;
    prismaMock.user.create.mockResolvedValue(user);

    // Act
    const result = await createUser(user);

    // Assert
    expect(prismaMock.user.create).toHaveBeenCalledWith({ data: user });
    expect(result).toEqual(user);
  });

  // Teste que createUser lève une erreur lorsque la base de données échoue.
  it("CreateUser_ShouldThrowError_WhenDatabaseFails", async () => {
    // Arrange
    const user = { email: "test@test.com", password: "password" } as any;
    prismaMock.user.create.mockRejectedValue(new Error("Erreur Database"));

    // Act & Assert
    await expect(createUser(user)).rejects.toThrow("Erreur Database");
  });

  // Teste que createVerificationToken crée un token avec une expiration de 24 heures.
  it("CreateVerificationToken_ShouldCreateTokenWith24hExpiration", async () => {
    // Arrange
    const expectedDbResponse = {
      userId: "123",
      token: "token",
      expiresAt: new Date(),
    } as any;
    prismaMock.verificationToken.create.mockResolvedValue(expectedDbResponse);

    // Act
    const result = await createVerificationToken(
      expectedDbResponse.userId,
      expectedDbResponse.token,
    );
    // Assert
    expect(prismaMock.verificationToken.create).toHaveBeenCalledTimes(1);

    const createdTokenData = prismaMock.verificationToken.create.mock
      .calls[0]![0] as any;
    expect(createdTokenData.data.userId).toBe(expectedDbResponse.userId);
    expect(createdTokenData.data.token).toBe("token");

    const expirationDate = createdTokenData.data.expiresAt;
    expect(expirationDate.getTime()).toBeGreaterThan(Date.now());
  });

  // Teste que findVerificationToken retourne un token lorsque celui-ci existe.
  it("FindVerificationToken_ShouldReturnToken_WhenTokenExists", async () => {
    // Arrange
    const expectedDbResponse = {
      userId: "123",
      token: "token",
      expiresAt: new Date(),
    } as any;
    prismaMock.verificationToken.findUnique.mockResolvedValue(
      expectedDbResponse,
    );

    // Act
    const result = await findVerificationToken(expectedDbResponse.token);

    // Assert
    expect(result).toEqual(expectedDbResponse);
  });

  // Teste que findVerificationToken retourne null lorsque le token n'existe pas.
  it("FindVerificationToken_ShouldReturnNull_WhenTokenDoesNotExist", async () => {
    // Arrange
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);

    // Act
    const result = await findVerificationToken("token");

    // Assert
    expect(result).toBeNull();
  });

  // Teste que createPasswordResetToken crée un token lorsque l'utilisateur existe.
  it("createPasswordResetToken_ShouldCreateToken_WhenUserExists", async () => {
    // Arrange
    const userId = "123";
    const token = "token";
    prismaMock.user.findUnique.mockResolvedValue({ id: userId } as any);

    prismaMock.user.findUnique.mockResolvedValue({ id: userId } as any);

    prismaMock.passwordResetToken.create.mockResolvedValue({
      userId,
      token,
      expiresAt: new Date(),
    } as any);

    // Act
    await createPasswordResetToken(userId, token);

    // Assert
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });

    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });

    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledTimes(1);
    const createdTokenData = prismaMock.passwordResetToken.create.mock
      .calls[0]![0] as any;
    expect(createdTokenData.data.userId).toBe(userId);
    expect(createdTokenData.data.token).toBe(token);
  });

  // Teste que createPasswordResetToken ne crée pas de token lorsque l'utilisateur n'existe pas.
  it("createPasswordResetToken_ShouldNotCreateToken_WhenUserDoesNotExist", async () => {
    // Arrange
    const userId = "123";
    const token = "token";
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act
    const result = await createPasswordResetToken(userId, token);

    // Assert
    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledTimes(0);
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledTimes(0);
    expect(result).toBeNull();
  });

  // Teste que findPasswordResetToken retourne un token lorsque celui-ci existe.
  it("findPasswordResetToken_ShouldReturnToken_WhenTokenExists", async () => {
    // Arrange
    const expectedDbResponse = {
      userId: "123",
      token: "token",
      expiresAt: new Date(),
    } as any;
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      expectedDbResponse,
    );

    // Act
    const result = await findPasswordResetToken(expectedDbResponse.token);

    // Assert
    expect(result).toEqual(expectedDbResponse);
  });

  // Teste que findPasswordResetToken retourne null lorsque le token n'existe pas.
  it("findPasswordResetToken_ShouldReturnNull_WhenTokenDoesNotExist", async () => {
    // Arrange
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

    // Act
    const result = await findPasswordResetToken("token");

    // Assert
    expect(result).toBeNull();
  });

  // Teste que createEmailChangeToken crée un token avec email en attente et expiration d'1 heure.
  it("CreateEmailChangeToken_ShouldCreateTokenWithPendingEmailAnd1hExpiration", async () => {
    // Arrange
    const userId = "123";
    const token = "token";
    const pendingEmail = "new@test.com";
    const expectedDbResponse = { userId, token, pendingEmail, expiresAt: new Date() } as any;
    prismaMock.verificationToken.create.mockResolvedValue(expectedDbResponse);

    // Act
    await createEmailChangeToken(userId, token, pendingEmail);

    // Assert
    expect(prismaMock.verificationToken.create).toHaveBeenCalledTimes(1);
    const createdData = prismaMock.verificationToken.create.mock.calls[0]![0] as any;
    expect(createdData.data.userId).toBe(userId);
    expect(createdData.data.token).toBe(token);
    expect(createdData.data.pendingEmail).toBe(pendingEmail);
    expect(createdData.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  //Teste le token d'EmailChange apres une heure de la creation
  it("CreateEmailChangeToken_ShouldBeExpired_AfterOneHour", async () => {
    // Arrange
    jest.useFakeTimers();
    const expectedDbResponse = { userId: "123", token: "token", pendingEmail: "new@test.com", expiresAt: new Date() } as any;
    prismaMock.verificationToken.create.mockResolvedValue(expectedDbResponse);

    // Act
    await createEmailChangeToken("123", "token", "new@test.com");

    // Simuler 1 heure plus tard
    jest.advanceTimersByTime(60 * 60 * 1000 + 1);

    const createdData = prismaMock.verificationToken.create.mock.calls[0]![0] as any;

    // Assert
    expect(createdData.data.expiresAt.getTime()).toBeLessThan(Date.now());

    jest.useRealTimers();
  });


  // Teste que applyPendingEmail met à jour l'email de l'utilisateur.
  it("ApplyPendingEmail_ShouldUpdateUserEmail", async () => {
    // Arrange
    const userId = "123";
    const pendingEmail = "new@test.com";
    const updatedUser = { id: userId, email: pendingEmail } as any;
    prismaMock.user.update.mockResolvedValue(updatedUser);

    // Act
    const result = await applyPendingEmail(userId, pendingEmail);

    // Assert
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { email: pendingEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        role: true,
        address: true,
        phone: true,
        profanityFilterEnabled: true,
      },
    });
    expect(result.email).toBe(pendingEmail);
  });

  // Teste que applyPendingEmail lève une erreur lorsque la base de données échoue.
  it("ApplyPendingEmail_ShouldThrowError_WhenDatabaseFails", async () => {
    // Arrange
    prismaMock.user.update.mockRejectedValue(new Error("Erreur Database"));

    // Act & Assert
    await expect(applyPendingEmail("123", "new@test.com")).rejects.toThrow("Erreur Database");
  });
});
