import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";

// Mock du module twilio
const mockMessagesCreate = jest.fn() as jest.MockedFunction<any>;
jest.mock("twilio", () => jest.fn());

import twilio from "twilio";
import { sendSms } from "../../services/sms.service";

const mockedTwilio = twilio as unknown as jest.Mock;

describe("SmsServiceTests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    mockedTwilio.mockImplementation(() => ({
      messages: { create: mockMessagesCreate },
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Teste que le mode console retourne true et ne fait pas d'appel Twilio
  it("SendSms_ShouldReturnTrue_WhenProviderIsConsole", async () => {
    // Arrange
    process.env.SMS_PROVIDER = "console";
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    const result = await sendSms("+15145551234", "Code test: 123456");

    // Assert
    expect(result).toBe(true);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  // Teste le mode console par défaut quand SMS_PROVIDER n'est pas défini
  it("SendSms_ShouldUseConsoleMode_WhenProviderIsUndefined", async () => {
    // Arrange
    delete process.env.SMS_PROVIDER;
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    const result = await sendSms("+15145551234", "Code test");

    // Assert
    expect(result).toBe(true);
    expect(mockMessagesCreate).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  // Teste que le mode Twilio appelle bien l'API avec les bons paramètres
  it("SendSms_ShouldCallTwilioApi_WhenProviderIsTwilio", async () => {
    // Arrange
    process.env.SMS_PROVIDER = "twilio";
    process.env.TWILIO_ACCOUNT_SID = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN = "tokentest";
    process.env.TWILIO_PHONE_NUMBER = "+15555550100";
    mockMessagesCreate.mockResolvedValue({ sid: "SMxxx" } as any);

    // Act
    const result = await sendSms("+15145551234", "Code: 123456");

    // Assert
    expect(result).toBe(true);
    expect(mockMessagesCreate).toHaveBeenCalledWith({
      body: "Code: 123456",
      from: "+15555550100",
      to: "+15145551234",
    });
  });

  // Teste que le service retourne false si la config Twilio est manquante
  it("SendSms_ShouldReturnFalse_WhenTwilioConfigMissing", async () => {
    // Arrange
    process.env.SMS_PROVIDER = "twilio";
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const result = await sendSms("+15145551234", "Code");

    // Assert
    expect(result).toBe(false);
    expect(mockMessagesCreate).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  // Teste que le service retourne false si Twilio lève une exception
  it("SendSms_ShouldReturnFalse_WhenTwilioThrows", async () => {
    // Arrange
    process.env.SMS_PROVIDER = "twilio";
    process.env.TWILIO_ACCOUNT_SID = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN = "tokentest";
    process.env.TWILIO_PHONE_NUMBER = "+15555550100";
    mockMessagesCreate.mockRejectedValue(new Error("Twilio API error") as any);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const result = await sendSms("+15145551234", "Code");

    // Assert
    expect(result).toBe(false);

    errorSpy.mockRestore();
  });

  // Teste que le service retourne false si le provider est inconnu
  it("SendSms_ShouldReturnFalse_WhenProviderIsUnknown", async () => {
    // Arrange
    process.env.SMS_PROVIDER = "fakeProvider";
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const result = await sendSms("+15145551234", "Code");

    // Assert
    expect(result).toBe(false);
    expect(mockMessagesCreate).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
