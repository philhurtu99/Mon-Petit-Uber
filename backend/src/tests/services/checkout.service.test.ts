import { createCheckoutSession } from "../../services/checkout.service";
import { getCartWithPromotions } from "../../services/cart.service";
import stripe from "../../config/stripe.config";

// Mock du service panier pour contrôler les données renvoyées au checkout
jest.mock("../../services/cart.service", () => ({
  getCartWithPromotions: jest.fn(),
}));

// Mock de Stripe pour éviter tout appel réel à l'API Stripe
jest.mock("../../config/stripe.config", () => ({
  __esModule: true,
  default: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}));

describe("CheckoutServiceTests", () => {
  beforeEach(() => {
    // Réinitialise tous les mocks avant chaque test
    jest.clearAllMocks();
  });

  // Teste le service de création de session Stripe lorsque le panier est vide
  it("CreateCheckoutSession_CartIsEmpty_ThrowsPanierVide", async () => {
    // Simule un panier vide
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 0,
      total: 0,
      totalSavings: 0,
      items: [],
      bonuses: [],
    });

    // Vérifie que le service refuse de créer une session Stripe
    await expect(createCheckoutSession("user_1", "livraison")).rejects.toThrow(
      "Panier Vide",
    );
  });

  // Teste le service de création de session Stripe lorsque le mode est "livraison"
  it("CreateCheckoutSession_ModeIsLivraison_ReturnsStripeUrl", async () => {
    // Simule un panier valide avec un produit
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 2,
      total: 7,
      totalSavings: 0,
      items: [
        {
          productId: 10,
          productName: "Pommes",
          quantity: 2,
          unitPrice: 3.5,
          originalTotal: 7,
          finalTotal: 7,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [],
    });

    // Simule la réponse de Stripe après création de session
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_123",
    });

    const result = await createCheckoutSession("user_1", "livraison");

    // Vérifie que l'URL Stripe est bien renvoyée
    expect(result).toEqual({ url: "https://stripe.test/session_123" });
  });

  // Teste le service de création de session Stripe lorsque le mode est "ramassage"
  it("CreateCheckoutSession_ModeIsRamassage_ReturnsStripeUrl", async () => {
    // Simule un panier valide avec un produit
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 1,
      total: 4.29,
      totalSavings: 0,
      items: [
        {
          productId: 11,
          productName: "Lait",
          quantity: 1,
          unitPrice: 4.29,
          originalTotal: 4.29,
          finalTotal: 4.29,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [],
    });

    // Simule l'URL de session retournée par Stripe
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_456",
    });

    const result = await createCheckoutSession("user_1", "ramassage");

    // Vérifie le retour du service
    expect(result).toEqual({ url: "https://stripe.test/session_456" });
  });

  // Teste le service de création de session Stripe lorsque le total final est converti en cents
  it("CreateCheckoutSession_UsesFinalTotalInLineItems", async () => {
    // Simule un article avec un prix promotionnel
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 3,
      total: 12.87,
      totalSavings: 2.1,
      items: [
        {
          productId: 11,
          productName: "Lait",
          quantity: 3,
          unitPrice: 4.29,
          originalTotal: 14.97,
          finalTotal: 12.87,
          savings: 2.1,
          appliedPromotions: ["Promo"],
        },
      ],
      bonuses: [],
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_789",
    });

    await createCheckoutSession("user_1", "ramassage");

    // Vérifie que Stripe reçoit bien le total final calculé avec les promotions
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            quantity: 1,
            price_data: expect.objectContaining({
              unit_amount: 1287,
            }),
          }),
        ]),
      }),
    );
  });

  // Teste que Stripe ne recharge pas les unités gratuites d'une promotion "2 pour 1"
  it("CreateCheckoutSession_BuyTwoForOne_ChargesFinalTotalOnly", async () => {
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 2,
      total: 10,
      totalSavings: 10,
      items: [
        {
          productId: 1,
          productName: "Pizza",
          quantity: 2,
          unitPrice: 10,
          originalTotal: 20,
          finalTotal: 10,
          savings: 10,
          appliedPromotions: ["2 pour 1"],
        },
      ],
      bonuses: [],
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_promo",
    });

    await createCheckoutSession("user_1", "ramassage");

    const stripeArg = (stripe.checkout.sessions.create as jest.Mock).mock
      .calls[0][0];

    expect(stripeArg.line_items).toEqual([
      expect.objectContaining({
        quantity: 1,
        price_data: expect.objectContaining({
          product_data: { name: "Pizza x2" },
          unit_amount: 1000,
        }),
      }),
    ]);
  });

  // Teste que les articles bonus gratuits sont envoyés à Stripe à 0 $
  it("CreateCheckoutSession_FreeBonus_AddsZeroDollarLineItem", async () => {
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 1,
      total: 10,
      totalSavings: 5,
      items: [
        {
          productId: 1,
          productName: "Sandwich",
          quantity: 1,
          unitPrice: 10,
          originalTotal: 10,
          finalTotal: 10,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [
        {
          bonusProductId: 2,
          bonusProductName: "Boisson",
          bonusQuantity: 1,
          triggerProductId: 1,
          triggerProductName: "Sandwich",
          promotionName: "Boisson gratuite",
        },
      ],
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_bonus",
    });

    await createCheckoutSession("user_1", "ramassage");

    const stripeArg = (stripe.checkout.sessions.create as jest.Mock).mock
      .calls[0][0];

    expect(stripeArg.line_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: 1,
          price_data: expect.objectContaining({
            product_data: { name: "Boisson (gratuit)" },
            unit_amount: 0,
          }),
        }),
      ]),
    );
  });

  // Teste le service de création de session Stripe lorsque le mode est "ramassage" et le panier n'est pas vide
  it("CreateCheckoutSession_ModeIsRamassage_DoesNotAddDeliveryFeeLine", async () => {
    // Simule un panier valide
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
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

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_pickup",
    });

    await createCheckoutSession("user_1", "ramassage");

    const stripeArg = (stripe.checkout.sessions.create as jest.Mock).mock
      .calls[0][0];

    // Vérifie qu'aucune ligne de livraison n'est ajoutée en mode ramassage
    expect(
      stripeArg.line_items.some(
        (item: any) =>
          item.price_data.product_data.name === "Frais de livraison",
      ),
    ).toBe(false);
  });

  // Teste le service de création de session Stripe lorsque les métadonnées utilisateur sont définies
  it("CreateCheckoutSession_SetsMetadataUserId", async () => {
    // Simule un panier valide
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 1,
      total: 2.5,
      totalSavings: 0,
      items: [
        {
          productId: 1,
          productName: "Banane",
          quantity: 1,
          unitPrice: 2.5,
          originalTotal: 2.5,
          finalTotal: 2.5,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [],
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_meta_user",
    });

    await createCheckoutSession("user_123", "livraison");

    // Vérifie que l'identifiant utilisateur est mis dans les metadata Stripe
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          userId: "user_123",
        }),
      }),
    );
  });

  // Teste le service de création de session Stripe lorsque le mode de fulfillment est défini dans les metadata
  it("CreateCheckoutSession_SetsMetadataFulfillmentMode", async () => {
    // Simule un panier valide
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 1,
      total: 2.5,
      totalSavings: 0,
      items: [
        {
          productId: 1,
          productName: "Banane",
          quantity: 1,
          unitPrice: 2.5,
          originalTotal: 2.5,
          finalTotal: 2.5,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [],
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_meta_mode",
    });

    await createCheckoutSession("user_123", "ramassage");

    // Vérifie que le mode de fulfillment est envoyé à Stripe
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          fulfillmentMode: "ramassage",
        }),
      }),
    );
  });

  // Teste le service de création de session Stripe lorsque l'URL de succès est définie
  it("CreateCheckoutSession_SetsSuccessUrl", async () => {
    // Simule un panier valide
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 1,
      total: 5,
      totalSavings: 0,
      items: [
        {
          productId: 1,
          productName: "Jus",
          quantity: 1,
          unitPrice: 5,
          originalTotal: 5,
          finalTotal: 5,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [],
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_success",
    });

    await createCheckoutSession("user_1", "livraison");

    const stripeArg = (stripe.checkout.sessions.create as jest.Mock).mock
      .calls[0][0];

    // Vérifie que l'URL de succès Stripe contient bien le session_id
    expect(stripeArg.success_url).toContain(
      "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
  });

  // Teste le service de création de session Stripe lorsque l'URL de cancel est définie
  it("CreateCheckoutSession_SetsCancelUrl", async () => {
    // Simule un panier valide
    (getCartWithPromotions as jest.Mock).mockResolvedValue({
      cartId: 1,
      count: 1,
      total: 5,
      totalSavings: 0,
      items: [
        {
          productId: 1,
          productName: "Jus",
          quantity: 1,
          unitPrice: 5,
          originalTotal: 5,
          finalTotal: 5,
          savings: 0,
          appliedPromotions: [],
        },
      ],
      bonuses: [],
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      url: "https://stripe.test/session_cancel",
    });

    await createCheckoutSession("user_1", "livraison");

    const stripeArg = (stripe.checkout.sessions.create as jest.Mock).mock
      .calls[0][0];

    // Vérifie que l'URL d'annulation est correctement construite
    expect(stripeArg.cancel_url).toContain("/checkout/cancel");
  });
});
