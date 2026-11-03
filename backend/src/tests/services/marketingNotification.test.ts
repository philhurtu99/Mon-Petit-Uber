import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { notifyConsentingUsers } from "../../services/marketingNotification.service";
import * as smsService from "../../services/sms.service";

// ============================================================
//  TESTS DU SERVICE DE NOTIFICATION MARKETING
// ============================================================
//
// Tests : 6 cas couverts
// - aucun user consentant
// - un user EMAIL
// - un user SMS avec téléphone valide
// - un user SMS sans téléphone (sauté)
// - mix EMAIL + SMS
// - filtre userIds spécifiques
//
// ============================================================

jest.mock("../../services/sms.service");


// Promotion exemple pour tous les tests
const fakePromotion = {
  id: 1,
  name: "2 pour 1 sur les pizzas",
  description: "Profitez-en !",
  type: "BUY_X_GET_Y" as const,
  quantity: 2,
  bonusQuantity: 1,
  endDate: new Date("2026-12-31"),
  targetProduct: { id: 10, name: "Pizza Margherita" },
  bonusProduct: { id: 10, name: "Pizza Margherita" },
};


describe("MarketingNotificationService - notifyConsentingUsers", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Forcer le mode console pour les tests (évite vrais envois)
    process.env.SMS_PROVIDER = "console";
  });


  // Vérifie qu'aucune notification n'est envoyée s'il n'y a pas d'user consentant
  it("notify_aucunUserConsentant_returnsZero", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([]);

    // Act
    const result = await notifyConsentingUsers(fakePromotion);

    // Assert
    expect(result.totalSent).toBe(0);
    expect(result.totalFailed).toBe(0);
    expect(result.totalSkipped).toBe(0);
  });


  // Vérifie qu'un user avec méthode EMAIL reçoit bien sa notification
  it("notify_userEmail_sendOneEmail", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([{
      id: "user-1",
      email: "test@test.com",
      phone: "5145551234",
      marketingMethod: "EMAIL",
      firstName: "Test",
    }] as any);

    // Act
    const result = await notifyConsentingUsers(fakePromotion);

    // Assert
    expect(result.totalSent).toBe(1);
    expect(result.totalFailed).toBe(0);
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });


  // Vérifie qu'un user avec méthode SMS et téléphone valide reçoit bien son SMS
  it("notify_userSmsAvecTelephone_sendOneSms", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([{
      id: "user-2",
      email: "sms@test.com",
      phone: "5145551234",
      marketingMethod: "SMS",
      firstName: "SMS",
    }] as any);
    (smsService.sendSms as jest.Mock<any>).mockResolvedValue(true);

    // Act
    const result = await notifyConsentingUsers(fakePromotion);

    // Assert
    expect(result.totalSent).toBe(1);
    expect(smsService.sendSms).toHaveBeenCalledWith(
      "+15145551234",
      expect.stringContaining("Mon Petit Uber"),
    );
  });


  // Vérifie qu'un user SMS sans téléphone est sauté (totalSkipped)
  it("notify_userSmsSansTelephone_skipped", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([{
      id: "user-3",
      email: "nophone@test.com",
      phone: null,
      marketingMethod: "SMS",
      firstName: "NoPhone",
    }] as any);

    // Act
    const result = await notifyConsentingUsers(fakePromotion);

    // Assert
    expect(result.totalSent).toBe(0);
    expect(result.totalSkipped).toBe(1);
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });


  // Vérifie qu'un mix d'users EMAIL et SMS est correctement traité
  it("notify_mixEmailSms_traitesCorrectement", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user-a",
        email: "a@test.com",
        phone: "5141111111",
        marketingMethod: "EMAIL",
        firstName: "A",
      },
      {
        id: "user-b",
        email: "b@test.com",
        phone: "5142222222",
        marketingMethod: "SMS",
        firstName: "B",
      },
      {
        id: "user-c",
        email: "c@test.com",
        phone: null,
        marketingMethod: "SMS",
        firstName: "C",
      },
    ] as any);
    (smsService.sendSms as jest.Mock<any>).mockResolvedValue(true);

    // Act
    const result = await notifyConsentingUsers(fakePromotion);

    // Assert
    expect(result.totalSent).toBe(2);     // 1 email + 1 SMS
    expect(result.totalSkipped).toBe(1);  // C (SMS sans téléphone)
    expect(smsService.sendSms).toHaveBeenCalledTimes(1);
  });


  // Vérifie que le filtre userIds limite bien aux utilisateurs spécifiés
  it("notify_avecUserIds_filtreCorrectement", async () => {
    // Arrange
    prismaMock.user.findMany.mockResolvedValue([{
      id: "user-only",
      email: "only@test.com",
      phone: "5143333333",
      marketingMethod: "EMAIL",
      firstName: "Only",
    }] as any);

    // Act
    await notifyConsentingUsers(fakePromotion, ["user-only"]);

    // Assert
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          marketingConsent: true,
          id: { in: ["user-only"] },
        }),
      }),
    );
  });
});
