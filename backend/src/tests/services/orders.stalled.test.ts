import { prismaMock } from "../prismaMock";
import {
  switchOrderToTakeout,
  cancelStalledOrder,
  OrderRequestError,
} from "../../services/orders.service";
import { STALLED_ORDER_TIMEOUT_MS } from "../../config/order.config";
import { jest } from "@jest/globals";

// Mock des notifications
jest.mock("../../services/orderEvents.service", () => ({
  notifyOrderDeliveryChanged: jest.fn(),
  notifyOrderPreparationChanged: jest.fn(),
}));
jest.mock("../../services/creditEvents.service", () => ({
  notifyUserCreditChanged: jest.fn(),
}));
jest.mock("../../services/loyaltyEvents.service", () => ({
  notifyUserLoyaltyPointsChanged: jest.fn(),
}));

describe("OrdersStalledServiceTests", () => {
  const userId = "user-123";
  const commandeId = 1;

  describe("switchOrderToTakeout", () => {
    /**
     * Teste que le passage en takeout échoue si la commande n'existe pas.
     */
    it("SwitchOrderToTakeout_WhenOrderNotFound_Throws404", async () => {
      prismaMock.commande.findUnique.mockResolvedValue(null);

      await expect(
        switchOrderToTakeout(commandeId, userId),
      ).rejects.toMatchObject({
        status: 404,
        message: "Commande introuvable",
      });
    });

    /**
     * Teste que le passage en takeout échoue si l'utilisateur n'est pas le propriétaire.
     */
    it("SwitchOrderToTakeout_WhenNotOwner_Throws403", async () => {
      prismaMock.commande.findUnique.mockResolvedValue({
        id: commandeId,
        transaction: { userId: "other-user" },
      } as any);

      await expect(
        switchOrderToTakeout(commandeId, userId),
      ).rejects.toMatchObject({
        status: 403,
        message: "Non autorisé",
      });
    });

    /**
     * Teste que le passage en takeout réussit quand les conditions sont remplies.
     */
    it("SwitchOrderToTakeout_WhenValid_UpdatesOrder", async () => {
      prismaMock.commande.findUnique.mockResolvedValue({
        id: commandeId,
        etat: "READY_FOR_DELIVERY",
        transaction: { userId },
      } as any);

      prismaMock.commande.update.mockResolvedValue({
        id: commandeId,
        type: "PICKUP",
      } as any);

      const result = await switchOrderToTakeout(commandeId, userId);

      expect(prismaMock.commande.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: commandeId },
          data: { type: "PICKUP", etat: "READY_FOR_PICKUP" },
        }),
      );
      expect(result.type).toBe("PICKUP");
    });
  });

  describe("cancelStalledOrder", () => {
    /**
     * Teste que l'annulation échoue si le délai de 15 minutes n'est pas respecté.
     */
    it("CancelStalledOrder_WhenTooEarly_Throws400", async () => {
      const readyAt = new Date(Date.now() - 1000); // 1 seconde ago (toujours trop tôt)
      prismaMock.commande.findUnique.mockResolvedValue({
        id: commandeId,
        etat: "READY_FOR_DELIVERY",
        readyForPickupAt: readyAt,
        transaction: {
          userId,
          items: [],
        },
      } as any);

      await expect(
        cancelStalledOrder(commandeId, userId),
      ).rejects.toMatchObject({
        status: 400,
        message: "Veuillez attendre 15 minutes avant d'annuler",
      });
    });

    /**
     * Teste que l'annulation échoue si la commande contient des produits cuisinés.
     */
    it("CancelStalledOrder_WhenHasCookedItems_Throws400", async () => {
      const readyAt = new Date(Date.now() - (STALLED_ORDER_TIMEOUT_MS + 1000));
      prismaMock.commande.findUnique.mockResolvedValue({
        id: commandeId,
        etat: "READY_FOR_DELIVERY",
        readyForPickupAt: readyAt,
        transaction: {
          userId,
          items: [{ product: { isCooked: true } }],
        },
      } as any);

      await expect(
        cancelStalledOrder(commandeId, userId),
      ).rejects.toMatchObject({
        status: 400,
        message:
          "Cette commande contient des produits cuisinés et ne peut être annulée",
      });
    });

    /**
     * Teste que l'annulation réussit et effectue le remboursement si tout est valide.
     */
    it("CancelStalledOrder_WhenValid_CancelsAndRefunds", async () => {
      const readyAt = new Date(Date.now() - (STALLED_ORDER_TIMEOUT_MS + 1000));
      const mockOrder = {
        id: commandeId,
        etat: "READY_FOR_DELIVERY",
        readyForPickupAt: readyAt,
        transaction: {
          userId,
          total: 20,
          loyaltyDiscount: 2,
          loyaltyPointsUsed: 100,
          items: [{ productId: 1, quantity: 2, product: { isCooked: false } }],
        },
      };

      prismaMock.commande.findUnique.mockResolvedValue(mockOrder as any);
      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        loyaltyPoints: 50,
      } as any);

      // Simulation de la transaction Prisma
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      const result = await cancelStalledOrder(commandeId, userId);

      expect(result).toBe(true);
      expect(prismaMock.commande.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: commandeId },
          data: expect.objectContaining({ etat: "ANNULEE" }),
        }),
      );
      // Vérification du remboursement du crédit (20 - 2 = 18)
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            creditBalance: { increment: 18 },
          }),
        }),
      );
    });
  });
});
