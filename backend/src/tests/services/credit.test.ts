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
import { getUserCreditBalance } from "../../services/user.service";

describe("CreditServiceTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie que le service lit uniquement le creditBalance depuis la DB.
  it("GetUserCreditBalance_ReturnsCreditBalance", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ creditBalance: 25 } as any);

    const result = await getUserCreditBalance("user_1");

    expect(result).toBe(25);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { creditBalance: true },
    });
  });

  // Vérifie que le checkout applique le crédit comme coupon Stripe.
  it("CreateCheckoutSession_ApplyCredit_CreatesStripeCoupon", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ creditBalance: 25 } as any);
    (getCartWithPromotions as unknown as jest.Mock<any>).mockResolvedValue({
      cartId: 1,
      count: 1,
      total: 10,
      totalSavings: 0,
      items: [
        {
          productId: 1,
          productName: "Pain",
          quantity: 1,
          unitPrice: 10,
          originalTotal: 10,
          finalTotal: 10,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [],
    });
    (stripe.coupons.create as unknown as jest.Mock<any>).mockResolvedValue({
      id: "coupon_credit_10",
    });
    (stripe.checkout.sessions.create as unknown as jest.Mock<any>).mockResolvedValue({
      url: "https://stripe.test/session_credit",
    });

    const result = await createCheckoutSession("user_1", "ramassage", true);

    expect(result).toEqual({ url: "https://stripe.test/session_credit" });
    expect(stripe.coupons.create).toHaveBeenCalledWith({
      amount_off: 1000,
      currency: "cad",
      duration: "once",
      name: "Solde crédit",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ coupon: "coupon_credit_10" }],
        metadata: expect.objectContaining({
          originalTotal: "10",
          creditUsed: "10",
          loyaltyPointsUsed: "0",
          loyaltyDiscount: "0",
          amountToPay: "0",
        }),
      }),
    );
  });

  // Vérifie que le checkout ne crée pas de coupon si applyCredit est false.
  it("CreateCheckoutSession_ApplyCreditFalse_DoesNotCreateStripeCoupon", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ creditBalance: 25 } as any);
    (getCartWithPromotions as unknown as jest.Mock<any>).mockResolvedValue({
      cartId: 1,
      count: 1,
      total: 10,
      totalSavings: 0,
      items: [
        {
          productId: 1,
          productName: "Pain",
          quantity: 1,
          unitPrice: 10,
          originalTotal: 10,
          finalTotal: 10,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [],
    });
    (stripe.checkout.sessions.create as unknown as jest.Mock<any>).mockResolvedValue({
      url: "https://stripe.test/session_no_credit",
    });

    await createCheckoutSession("user_1", "ramassage", false);

    const sessionParams = (stripe.checkout.sessions.create as jest.Mock).mock
      .calls[0]![0] as any;

    expect(stripe.coupons.create).not.toHaveBeenCalled();
    expect(sessionParams.discounts).toBeUndefined();
    expect(sessionParams.metadata).toEqual(
      expect.objectContaining({
        creditUsed: "0",
        loyaltyPointsUsed: "0",
        loyaltyDiscount: "0",
        amountToPay: "10",
      }),
    );
  });
});
