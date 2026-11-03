import { prismaMock } from "../prismaMock";
import { 
  getMarketingPreferences, 
  updateMarketingPreferences 
} from "../../services/user.service";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Utilisateur de base pour les tests
const mockUser = {
  id: "cmtest123456789",
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
  emailVerifiedAt: new Date(),
  password: null,
  googleId: null,
  address: "123 rue Test",
  phone: "5141234567",
  profilePicture: null,
  role: "user",
  creditBalance: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  // Champs 2FA (US 396)
  twoFactorEnabled: false,
  twoFactorMethod: null,
  // Champs marketing (US 395)
  marketingConsent: false,
  marketingMethod: null,
  marketingConsentDate: null,
};


describe("MarketingService - getMarketingPreferences", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie que la fonction retourne les préférences d'un utilisateur sans consentement
  it("getMarketing_userSansConsent_returnsDefaults", async () => {
    // Arrange
    const expected = {
      marketingConsent: false,
      marketingMethod: null,
      marketingConsentDate: null,
      phone: "5141234567",
    };
    prismaMock.user.findUnique.mockResolvedValue(expected as any);

    // Act
    const result = await getMarketingPreferences(mockUser.id);

    // Assert
    expect(result.marketingConsent).toBe(false);
    expect(result.marketingMethod).toBeNull();
  });

  // Vérifie que la fonction retourne les préférences d'un utilisateur avec consentement EMAIL
  it("getMarketing_userAvecConsentEmail_returnsValues", async () => {
    // Arrange
    const date = new Date();
    const expected = {
      marketingConsent: true,
      marketingMethod: "EMAIL" as const,
      marketingConsentDate: date,
      phone: "5141234567",
    };
    prismaMock.user.findUnique.mockResolvedValue(expected as any);

    // Act
    const result = await getMarketingPreferences(mockUser.id);

    // Assert
    expect(result.marketingConsent).toBe(true);
    expect(result.marketingMethod).toBe("EMAIL");
    expect(result.marketingConsentDate).toEqual(date);
  });

  // Vérifie qu'une erreur est levée si l'utilisateur n'existe pas
  it("getMarketing_userInexistant_throwsError", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act & Assert
    await expect(getMarketingPreferences("inexistant"))
      .rejects.toThrow("Utilisateur introuvable");
  });
});


describe("MarketingService - updateMarketingPreferences", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie l'activation du consentement avec méthode EMAIL
  it("update_consentTrueEmail_returnsUpdated", async () => {
    // Arrange
    const input = { marketingConsent: true, marketingMethod: "EMAIL" as const };
    const updatedData = {
      marketingConsent: true,
      marketingMethod: "EMAIL",
      marketingConsentDate: new Date(),
      phone: "5141234567",
    };
    prismaMock.user.update.mockResolvedValue(updatedData as any);

    // Act
    const result = await updateMarketingPreferences(mockUser.id, input);

    // Assert
    expect(result.marketingConsent).toBe(true);
    expect(result.marketingMethod).toBe("EMAIL");
    expect(result.marketingConsentDate).toBeInstanceOf(Date);
  });

  // Vérifie l'activation du consentement avec méthode SMS
  it("update_consentTrueSms_returnsUpdated", async () => {
    // Arrange
    const input = { marketingConsent: true, marketingMethod: "SMS" as const };
    const updatedData = {
      marketingConsent: true,
      marketingMethod: "SMS",
      marketingConsentDate: new Date(),
      phone: "5141234567",
    };
    prismaMock.user.update.mockResolvedValue(updatedData as any);

    // Act
    const result = await updateMarketingPreferences(mockUser.id, input);

    // Assert
    expect(result.marketingConsent).toBe(true);
    expect(result.marketingMethod).toBe("SMS");
  });

  // Vérifie que la désactivation force la méthode à null
  it("update_consentFalse_methodForcedToNull", async () => {
    // Arrange
    const input = { marketingConsent: false, marketingMethod: "EMAIL" as const };
    const updatedData = {
      marketingConsent: false,
      marketingMethod: null,
      marketingConsentDate: new Date(),
      phone: "5141234567",
    };
    prismaMock.user.update.mockResolvedValue(updatedData as any);

    // Act
    const result = await updateMarketingPreferences(mockUser.id, input);

    // Assert
    expect(result.marketingConsent).toBe(false);
    expect(result.marketingMethod).toBeNull();

    // Vérifier que le mock a été appelé avec methodToSet = null
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          marketingMethod: null,
        }),
      })
    );
  });

  // Vérifie qu'une erreur est levée si consent=true sans méthode
  it("update_consentTrueSansMethod_throwsError", async () => {
    // Arrange
    const input = { marketingConsent: true };

    // Act & Assert
    await expect(updateMarketingPreferences(mockUser.id, input))
      .rejects.toThrow("Une méthode de réception (EMAIL ou SMS) doit être choisie");
  });

  // Vérifie que la date est mise à jour à chaque changement
  it("update_anyChange_updatesDate", async () => {
    // Arrange
    const before = new Date(Date.now() - 60000); // 1 min avant
    const input = { marketingConsent: true, marketingMethod: "EMAIL" as const };
    const updatedData = {
      marketingConsent: true,
      marketingMethod: "EMAIL",
      marketingConsentDate: new Date(),
      phone: "5141234567",
    };
    prismaMock.user.update.mockResolvedValue(updatedData as any);

    // Act
    const result = await updateMarketingPreferences(mockUser.id, input);

    // Assert
    expect(result.marketingConsentDate?.getTime()).toBeGreaterThan(before.getTime());
  });
});
