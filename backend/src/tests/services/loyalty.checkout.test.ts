import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../services/cart.service", () => ({
  getCartWithPromotions: jest.fn(),
}));

jest.mock("../../config/stripe.config", () => ({
  __esModule: true,
  default: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    coupons: {
      create: jest.fn(),
    },
  },
}));

import stripe from "../../config/stripe.config";
import { getCartWithPromotions } from "../../services/cart.service";
import { createCheckoutSession } from "../../services/checkout.service";

const mockCart = {
  cartId: 1,
  count: 1,
  total: 12,
  totalSavings: 0,
  items: [
    {
      productId: 1,
      productName: "Sandwich",
      quantity: 1,
      unitPrice: 12,
      originalTotal: 12,
      finalTotal: 12,
      savings: 0,
      appliedPromotions: [],
    },
  ],
  bonuses: [],
};

describe("LoyaltyCheckoutServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCartWithPromotions as unknown as jest.Mock<any>).mockResolvedValue(
      mockCart,
    );
    (stripe.coupons.create as unknown as jest.Mock<any>).mockResolvedValue({
      id: "coupon_rewards",
    });
    (stripe.checkout.sessions.create as unknown as jest.Mock<any>).mockResolvedValue({
      url: "https://stripe.test/session_rewards",
    });
  });

  // Vérifie que le checkout applique les points uniquement par tranches complètes de 1000.
  it("CreateCheckoutSession_ApplyLoyaltyPoints_UsesOnlyThousandPointSteps", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      creditBalance: 0,
      loyaltyPoints: 2500,
    } as any);

    const result = await createCheckoutSession(
      "user_1",
      "ramassage",
      false,
      true,
    );

    expect(result).toEqual({ url: "https://stripe.test/session_rewards" });
    expect(stripe.coupons.create).toHaveBeenCalledWith({
      amount_off: 200,
      currency: "cad",
      duration: "once",
      name: "Carte de points",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ coupon: "coupon_rewards" }],
        metadata: expect.objectContaining({
          originalTotal: "12",
          creditUsed: "0",
          loyaltyPointsUsed: "2000",
          loyaltyDiscount: "2",
          amountToPay: "10",
        }),
      }),
    );
  });

  // Vérifie que le crédit client et les points sont appliqués ensemble, mais gardés séparés dans les métadonnées Stripe.
  it("CreateCheckoutSession_ApplyCreditAndLoyaltyPoints_TracksBothSeparately", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      creditBalance: 5,
      loyaltyPoints: 3000,
    } as any);

    await createCheckoutSession("user_1", "ramassage", true, true);

    expect(stripe.coupons.create).toHaveBeenCalledWith({
      amount_off: 800,
      currency: "cad",
      duration: "once",
      name: "Crédit client et points",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          creditUsed: "5",
          loyaltyPointsUsed: "3000",
          loyaltyDiscount: "3",
          amountToPay: "4",
        }),
      }),
    );
  });

  // Vérifie que le checkout respecte le nombre de points demandé au lieu d'utiliser automatiquement le maximum.
  it("CreateCheckoutSession_ApplyLoyaltyPoints_UsesRequestedPointAmount", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      creditBalance: 0,
      loyaltyPoints: 5000,
    } as any);

    await createCheckoutSession("user_1", "ramassage", false, true, 2000);

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          loyaltyPointsUsed: "2000",
          loyaltyDiscount: "2",
          amountToPay: "10",
        }),
      }),
    );
  });
});
