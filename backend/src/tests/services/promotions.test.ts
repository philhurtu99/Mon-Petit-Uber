import { prismaMock } from "../prismaMock";
import {
  calculateCartTotal,
  getPromotionalBonuses,
} from "../../services/promotion.service";
import { describe, expect, it } from "@jest/globals";

describe("PromotionServiceTests", () => {

    //---------------------------------------------------------------
    // Teste calculateCartTotal quand le panier est vide
    it("calculateCartTotal_WhenCartIsEmpty", async () => {

        // Arrange
        const cart: any[] = [];

        // Act
        const result = await calculateCartTotal(cart);

        // Assert
        expect(result.total).toBe(0);
        expect(result.items).toEqual([]);
        expect(result.bonuses).toEqual([]);
    });

    //---------------------------------------------------------------
    // Teste calculateCartTotal sans promotions
    it("calculateCartTotal_WhenNoPromotions", async () => {

        // Arrange
        prismaMock.product.findMany.mockResolvedValue([
            { id: 1, name: "Burger", price: 10 } as any
        ]);

        prismaMock.promotion.findMany.mockResolvedValue([]);

        const cart = [
            { productId: 1, quantity: 2 }
        ];

        // Act
        const result = await calculateCartTotal(cart);

        // Assert
        expect(result.total).toBe(20);
        expect(result.totalSavings).toBe(0);
    });

    //---------------------------------------------------------------
    // Teste calculateCartTotal avec BUY_X_GET_Y (3 pour 1)
    it("calculateCartTotal_WhenBuyXGetYApplied", async () => {

        // Arrange
        prismaMock.product.findMany.mockResolvedValue([
            { id: 1, name: "Burger", price: 10 } as any
        ]);

        prismaMock.promotion.findMany.mockResolvedValue([
            {
                id: 1,
                name: "3 pour 1",
                type: "BUY_X_GET_Y",
                targetProductId: 1,
                quantity: 3,
                bonusQuantity: 1,
                isActive: true,
                startDate: null,
                endDate: new Date(Date.now() + 10000),
            } as any
        ]);

        const cart = [
            { productId: 1, quantity: 3 }
        ];

        // Act
        const result = await calculateCartTotal(cart);

        // Assert
        expect(result.total).toBe(10);
        expect(result.totalSavings).toBe(20);
        expect(result.items[0]!.appliedPromotions.length).toBe(1);
    });

    //---------------------------------------------------------------
    // Teste getPromotionalBonuses quand panier vide
 it("getPromotionalBonuses_WhenCartIsEmpty", async () => {

    // Arrange
    prismaMock.promotion.findMany.mockResolvedValue([]);

    const cart: any[] = [];

    // Act
    const result = await getPromotionalBonuses(cart);

    // Assert
    expect(result).toEqual([]);
});

    //---------------------------------------------------------------
    // Teste getPromotionalBonuses avec FREE_ITEM
    it("getPromotionalBonuses_WhenFreeItemApplied", async () => {

        // Arrange
        prismaMock.promotion.findMany.mockResolvedValue([
            {
                id: 1,
                name: "Cadeau gratuit",
                type: "FREE_ITEM",
                targetProductId: 1,
                bonusProductId: 2,
                bonusQuantity: 1,
                quantity: null,
                isActive: true,
                startDate: null,
                endDate: new Date(Date.now() + 10000),
                targetProduct: { id: 1, name: "Produit A" },
                bonusProduct: { id: 2, name: "Cadeau", imageUrl: null },
            } as any
        ]);

        const cart = [
            { productId: 1, quantity: 1 }
        ];

        // Act
        const result = await getPromotionalBonuses(cart);

        // Assert
        expect(result.length).toBe(1);
        expect(result[0]!.bonusProductId).toBe(2);
        expect(result[0]!.bonusQuantity).toBe(1);
    });

    //---------------------------------------------------------------
    // Teste getPromotionalBonuses avec FREE_ITEM et quantité requise non atteinte
    it("getPromotionalBonuses_WhenFreeItemRequiredQuantityNotReached", async () => {

        // Arrange
        prismaMock.promotion.findMany.mockResolvedValue([
            {
                id: 1,
                name: "Cadeau gratuit",
                type: "FREE_ITEM",
                targetProductId: 1,
                bonusProductId: 2,
                bonusQuantity: 1,
                quantity: 3,
                isActive: true,
                startDate: null,
                endDate: new Date(Date.now() + 10000),
                targetProduct: { id: 1, name: "Produit A" },
                bonusProduct: { id: 2, name: "Cadeau", imageUrl: null },
            } as any
        ]);

        const cart = [
            { productId: 1, quantity: 1 }
        ];

        // Act
        const result = await getPromotionalBonuses(cart);

        // Assert
        expect(result).toEqual([]);
    });

    //---------------------------------------------------------------
    // Teste getPromotionalBonuses avec FREE_ITEM et quantité requise atteinte plusieurs fois
    it("getPromotionalBonuses_WhenFreeItemRequiredQuantityReachedMultipleTimes", async () => {

        // Arrange
        prismaMock.promotion.findMany.mockResolvedValue([
            {
                id: 1,
                name: "Cadeau gratuit",
                type: "FREE_ITEM",
                targetProductId: 1,
                bonusProductId: 2,
                bonusQuantity: 1,
                quantity: 3,
                isActive: true,
                startDate: null,
                endDate: new Date(Date.now() + 10000),
                targetProduct: { id: 1, name: "Produit A" },
                bonusProduct: { id: 2, name: "Cadeau", imageUrl: null },
            } as any
        ]);

        const cart = [
            { productId: 1, quantity: 6 }
        ];

        // Act
        const result = await getPromotionalBonuses(cart);

        // Assert
        expect(result.length).toBe(1);
        expect(result[0]!.bonusQuantity).toBe(2);
    });

    //---------------------------------------------------------------
    // Teste getPromotionalBonuses avec BUY_X_GET_Y multiple
    it("getPromotionalBonuses_WhenBuyXGetYMultiple", async () => {

        // Arrange
        prismaMock.promotion.findMany.mockResolvedValue([
            {
                id: 1,
                name: "1 acheté 1 offert",
                type: "BUY_X_GET_Y",
                targetProductId: 1,
                bonusProductId: 2,
                quantity: 2,
                bonusQuantity: 1,
                isActive: true,
                startDate: null,
                endDate: new Date(Date.now() + 10000),
                targetProduct: { id: 1, name: "Produit A" },
                bonusProduct: { id: 2, name: "Cadeau", imageUrl: null },
            } as any
        ]);

        const cart = [
            { productId: 1, quantity: 4 } // 2 fois la promo
        ];

        // Act
        const result = await getPromotionalBonuses(cart);

        // Assert
        expect(result[0]!.bonusQuantity).toBe(2);
    });
});
