import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Request, Response } from "express";
import { getMarketing, updateMarketing } from "../../controllers/user.controller";
import * as userService from "../../services/user.service";

// ============================================================
// TESTS FONCTIONNELS CONTROLLERS MARKETING
// ============================================================


// Helpers pour mock req/res
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (body: any = {}, userId: string = "user-test-123") => {
  return {
    body,
    user: { id: userId },
  } as unknown as Request;
};


describe("MarketingController - getMarketing", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie que GET retourne les préférences avec un user authentifié
  it("get_authenticatedUser_returnsPreferences", async () => {
    // Arrange
    const mockData = {
      marketingConsent: true,
      marketingMethod: "EMAIL",
      marketingConsentDate: new Date(),
      phone: "5141234567",
    };
    jest.spyOn(userService, "getMarketingPreferences").mockResolvedValue(mockData as any);
    
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await getMarketing(req, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith(mockData);
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  // Vérifie que GET retourne 500 si le service lève une erreur
  it("get_serviceThrows_returns500", async () => {
    // Arrange
    jest.spyOn(userService, "getMarketingPreferences").mockRejectedValue(
      new Error("Erreur BD")
    );
    
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await getMarketing(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
  });
});


describe("MarketingController - updateMarketing", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie PATCH avec consentement=true et méthode=EMAIL
  it("update_consentTrueEmail_returns200", async () => {
    // Arrange
    const body = { marketingConsent: true, marketingMethod: "EMAIL" };
    const updatedData = {
      marketingConsent: true,
      marketingMethod: "EMAIL",
      marketingConsentDate: new Date(),
      phone: "5141234567",
    };
    jest.spyOn(userService, "updateMarketingPreferences").mockResolvedValue(updatedData as any);

    const req = mockRequest(body);
    const res = mockResponse();

    // Act
    await updateMarketing(req, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith(updatedData);
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  // Vérifie PATCH avec consentement=false force la méthode à null
  it("update_consentFalse_methodSetToNull", async () => {
    // Arrange
    const body = { marketingConsent: false };
    const updatedData = {
      marketingConsent: false,
      marketingMethod: null,
      marketingConsentDate: new Date(),
      phone: "5141234567",
    };
    jest.spyOn(userService, "updateMarketingPreferences").mockResolvedValue(updatedData as any);

    const req = mockRequest(body);
    const res = mockResponse();

    // Act
    await updateMarketing(req, res);

    // Assert
    expect(res.json).toHaveBeenCalled();
    const responseBody = (res.json as jest.Mock).mock.calls[0][0] as {
        marketingConstent: boolean;
        marketingMethod: "EMAIL" | "SMS" | null;
        marketingConsentDate: Date;
        phone: string | null;
    }
    expect(responseBody.marketingMethod).toBeNull();
  });

  // Vérifie 400 si marketingConsent n'est pas un booléen
  it("update_consentNotBoolean_returns400", async () => {
    // Arrange
    const body = { marketingConsent: "yes" }; // mauvais type
    const req = mockRequest(body);
    const res = mockResponse();

    // Act
    await updateMarketing(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Vérifie 400 si marketingMethod a une valeur invalide
  it("update_methodInvalid_returns400", async () => {
    // Arrange
    const body = { marketingConsent: true, marketingMethod: "PHONE" }; // valeur invalide
    const req = mockRequest(body);
    const res = mockResponse();

    // Act
    await updateMarketing(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Vérifie 400 si consent=true sans méthode
  it("update_consentTrueSansMethod_returns400", async () => {
    // Arrange
    const body = { marketingConsent: true };
    jest.spyOn(userService, "updateMarketingPreferences").mockRejectedValue(
      new Error("Une méthode de réception (EMAIL ou SMS) doit être choisie")
    );

    const req = mockRequest(body);
    const res = mockResponse();

    // Act
    await updateMarketing(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
