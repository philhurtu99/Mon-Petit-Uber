import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request } from "express";

jest.mock("../../services/orders.service", () => {
  class MockOrderRequestError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    OrderRequestError: MockOrderRequestError,
    switchOrderToTakeout: jest.fn(),
    cancelStalledOrder: jest.fn(),
  };
});

import * as ordersService from "../../services/orders.service";
import {
  switchToTakeoutController,
  cancelStalledController,
} from "../../controllers/orders.controller";

type MockReq = {
  session?: any;
  params?: Record<string, string>;
};

const makeReqRes = (reqOverrides?: MockReq) => {
  const req = {
    session: { user: { id: "user-123" } },
    params: {},
    ...reqOverrides,
  } as unknown as Request;

  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);

  return { req, res };
};

describe("OrdersStalledControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("switchToTakeoutController", () => {
    /**
     * Teste que le contrôleur retourne une erreur 401 si l'utilisateur n'est pas connecté.
     */
    it("SwitchToTakeout_WhenNotAuthenticated_Returns401", async () => {
      const { req, res } = makeReqRes({ session: {} }); // Pas de user id

      await switchToTakeoutController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Non authentifié" });
    });

    /**
     * Teste que le contrôleur appelle le service et retourne le résultat avec un code 200.
     */
    it("SwitchToTakeout_WhenValid_Returns200", async () => {
      const mockOrder = { id: 1, type: "PICKUP" };
      (ordersService.switchOrderToTakeout as jest.Mock<any>).mockResolvedValue(mockOrder);

      const { req, res } = makeReqRes({ params: { id: "1" } });

      await switchToTakeoutController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Commande passée en ramassage (Takeout)",
        order: mockOrder,
      }));
    });
  });

  describe("cancelStalledController", () => {
    /**
     * Teste que le contrôleur retourne une erreur si le service lève une OrderRequestError.
     */
    it("CancelStalled_WhenServiceThrows_ReturnsErrorStatus", async () => {
      const error = new (ordersService.OrderRequestError as any)(400, "Trop tôt");
      (ordersService.cancelStalledOrder as jest.Mock<any>).mockRejectedValue(error);

      const { req, res } = makeReqRes({ params: { id: "1" } });

      await cancelStalledController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Trop tôt" });
    });

    /**
     * Teste que le contrôleur retourne un succès 200 après annulation.
     */
    it("CancelStalled_WhenValid_Returns200", async () => {
      (ordersService.cancelStalledOrder as jest.Mock<any>).mockResolvedValue(true);

      const { req, res } = makeReqRes({ params: { id: "1" } });

      await cancelStalledController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Commande annulée avec succès" });
    });
  });
});
