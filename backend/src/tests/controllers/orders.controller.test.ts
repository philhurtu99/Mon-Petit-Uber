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
    getAllLivraisonOrders: jest.fn(),
    getAllPickupOrders: jest.fn(),
    OrderRequestError: MockOrderRequestError,
    triggerReadyForPickup: jest.fn(),
    getActiveOrderByUser: jest.fn(),
    cancelActiveOrderByUser: jest.fn(),
    confirmOrderCode: jest.fn(),
    getAllFinishedOrders: jest.fn(),
    getAllActiveOrders: jest.fn(),
  };
});

jest.mock("../../services/livraison.service", () => ({
  getLivraisonsAvailableForAssignment: jest.fn(),
  requestLivraisonOrder: jest.fn(),
}));

import * as ordersService from "../../services/orders.service";
import * as livraisonService from "../../services/livraison.service";
import { ORDER_EXPIRATION_MS } from "../../config/order.config";
import { getAllActiveOrders, getAllFinishedOrders, OrderRequestError } from "../../services/orders.service";
import {
  getAllLivraison,
  getAllPickup,
  getAvailableLivraison,
  requestLivraisonById,
  requestNextLivraison,
  triggerReady,
  getActiveOrder,
  streamActiveOrderEvents,
  cancelActiveOrder,
  confirmCode,
  getAllActive,
  getAllFinished,
} from "../../controllers/orders.controller";
import {
  orderEvents,
  USER_ORDER_EXPIRED,
} from "../../services/orderEvents.service";

type MockReq = {
  session?: any;
  body?: any;
  params?: Record<string, string>;
};

const makeReqRes = (reqOverrides?: MockReq) => {
  const req = {
    session: {},
    body: {},
    params: {},
    ...reqOverrides,
  } as unknown as Request;

  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);

  return { req, res };
};

describe("OrdersControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GetAllPickup_ReturnsOrders", async () => {
    const orders = [{ id: 1, type: "PICKUP" }];
    (ordersService.getAllPickupOrders as jest.Mock<any>).mockResolvedValue(
      orders,
    );
    const { req, res } = makeReqRes();

    await getAllPickup(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("GetAllLivraison_ReturnsOrders", async () => {
    const orders = [{ id: 2, type: "LIVRAISON" }];
    (ordersService.getAllLivraisonOrders as jest.Mock<any>).mockResolvedValue(
      orders,
    );
    const { req, res } = makeReqRes();

    await getAllLivraison(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("GetAvailableLivraison_ReturnsOrders", async () => {
    const orders = [{ id: 3, type: "LIVRAISON" }];
    (
      livraisonService.getLivraisonsAvailableForAssignment as jest.Mock<any>
    ).mockResolvedValue(orders);
    const { req, res } = makeReqRes();

    await getAvailableLivraison(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("RequestNextLivraison_UsesSessionLivreurId", async () => {
    const order = { id: 4 };
    (livraisonService.requestLivraisonOrder as jest.Mock<any>).mockResolvedValue(
      order,
    );
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
    });

    await requestNextLivraison(req, res);

    expect(livraisonService.requestLivraisonOrder).toHaveBeenCalledWith("livreur_1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Commande assignée au livreur",
      order,
    });
  });

  it("RequestNextLivraison_FallsBackToBodyLivreurId", async () => {
    const order = { id: 5 };
    (livraisonService.requestLivraisonOrder as jest.Mock<any>).mockResolvedValue(
      order,
    );
    const { req, res } = makeReqRes({
      body: { livreurId: "livreur_body" },
    });

    await requestNextLivraison(req, res);

    expect(livraisonService.requestLivraisonOrder).toHaveBeenCalledWith("livreur_body");
  });

  it("RequestNextLivraison_NoAvailableOrder_Returns404", async () => {
    (livraisonService.requestLivraisonOrder as jest.Mock<any>).mockResolvedValue(
      null,
    );
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
    });

    await requestNextLivraison(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Aucune commande livraison disponible",
    });
  });

  it("RequestLivraisonById_UsesRouteId", async () => {
    const order = { id: 6 };
    (livraisonService.requestLivraisonOrder as jest.Mock<any>).mockResolvedValue(
      order,
    );
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
      params: { id: "6" },
    });

    await requestLivraisonById(req, res);

    expect(livraisonService.requestLivraisonOrder).toHaveBeenCalledWith(
      "livreur_1",
      6,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("TriggerReady_UsesSessionPreparateurId", async () => {
    const order = { id: 7 };
    (ordersService.triggerReadyForPickup as jest.Mock<any>).mockResolvedValue(
      order,
    );
    const { req, res } = makeReqRes({
      session: { userId: "emp_1" },
      params: { id: "7" },
    });

    await triggerReady(req, res);

    expect(ordersService.triggerReadyForPickup).toHaveBeenCalledWith(
      7,
      "emp_1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Commande prête pour pickup",
      order,
    });
  });

  it("TriggerReady_FallsBackToBodyPreparateurId", async () => {
    const order = { id: 8 };
    (ordersService.triggerReadyForPickup as jest.Mock<any>).mockResolvedValue(
      order,
    );
    const { req, res } = makeReqRes({
      body: { preparateurId: "emp_body" },
      params: { id: "8" },
    });

    await triggerReady(req, res);

    expect(ordersService.triggerReadyForPickup).toHaveBeenCalledWith(
      8,
      "emp_body",
    );
  });

  it("Controller_OrderRequestError_ReturnsMappedStatus", async () => {
    (livraisonService.requestLivraisonOrder as jest.Mock<any>).mockRejectedValue(
      new OrderRequestError(409, "Commande non disponible"),
    );
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
    });

    await requestNextLivraison(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Commande non disponible",
    });
  });

  it("Controller_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (ordersService.getAllPickupOrders as jest.Mock<any>).mockRejectedValue(
      new Error("DB down"),
    );
    const { req, res } = makeReqRes();

    await getAllPickup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Erreur lors de la récupération des commandes pickup",
    });
    consoleSpy.mockRestore();
  });


  // Vérifie que la commande active est retournée avec un statut 200 pour un utilisateur authentifié

  it("GetActiveCommande_WhenAuthenticated_ReturnsCommande", async () => {
    const commande = { id: 1, etat: "EN_PREPARATION" };
    (
      ordersService.getActiveOrderByUser as jest.Mock<any>
    ).mockResolvedValue(commande);
    const { req, res } = makeReqRes({
      session: { user: { id: "user_1" } },
    });

    await getActiveOrder(req, res);

    expect(ordersService.getActiveOrderByUser).toHaveBeenCalledWith(
      "user_1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ...commande,
      preparationTimerLimitMs: ORDER_EXPIRATION_MS,
    });
  });


  // Vérifie qu'une erreur 401 est retournée si la session ne contient pas d'utilisateur

  it("GetActiveCommande_WhenNotAuthenticated_Returns401", async () => {
    const { req, res } = makeReqRes({ session: {} });

    await getActiveOrder(req, res);

    expect(ordersService.getActiveOrderByUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Non authentifié" });
  });


  // Vérifie qu'une erreur 404 est retournée si aucune commande active n'existe pour l'utilisateur

  it("GetActiveCommande_WhenNoActiveOrder_Returns404", async () => {
    (
      ordersService.getActiveOrderByUser as jest.Mock<any>
    ).mockResolvedValue(null);
    const { req, res } = makeReqRes({
      session: { user: { id: "user_1" } },
    });

    await getActiveOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Aucune commande active" });
  });


  // Vérifie qu'une erreur 500 est retournée en cas d'erreur inattendue du service

  it("GetActiveCommande_WhenUnexpectedError_Returns500", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    (
      ordersService.getActiveOrderByUser as jest.Mock<any>
    ).mockRejectedValue(new Error("DB down"));
    const { req, res } = makeReqRes({
      session: { user: { id: "user_1" } },
    });

    await getActiveOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });

  it("StreamActiveOrderEvents_WhenOrderExpiresForUser_WritesExpirationEvent", async () => {
    let closeHandler: (() => void) | undefined;
    const req: any = {
      session: { user: { id: "user_1" } },
      on: jest.fn((event: string, handler: () => void) => {
        if (event === "close") closeHandler = handler;
        return req;
      }),
    };
    const res: any = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    await streamActiveOrderEvents(req, res);

    orderEvents.emit(USER_ORDER_EXPIRED, {
      userId: "user_1",
      orderId: 12,
    });

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/event-stream",
    );
    expect(res.write).toHaveBeenCalledWith("event: order-expired\n");
    expect(res.write).toHaveBeenCalledWith(
      expect.stringContaining(
        "Délais de commande expiré, transaction remboursée par crédit",
      ),
    );

    closeHandler?.();
    expect(res.end).toHaveBeenCalled();
  });

  it("CancelActiveOrder_WhenAuthenticated_Returns200", async () => {
    (ordersService.cancelActiveOrderByUser as jest.Mock<any>).mockResolvedValue(
      7,
    );
    const { req, res } = makeReqRes({
      session: { user: { id: "user_1" } },
      params: { id: "7" },
    });

    await cancelActiveOrder(req, res);

    expect(ordersService.cancelActiveOrderByUser).toHaveBeenCalledWith(
      7,
      "user_1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Commande annulée" });
  });

  it("CancelActiveOrder_WhenNotAuthenticated_Returns401", async () => {
    const { req, res } = makeReqRes({
      session: {},
      params: { id: "7" },
    });

    await cancelActiveOrder(req, res);

    expect(ordersService.cancelActiveOrderByUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Non authentifié" });
  });

  it("CancelActiveOrder_WhenInvalidId_Returns400", async () => {
    const { req, res } = makeReqRes({
      session: { user: { id: "user_1" } },
      params: { id: "0" },
    });

    await cancelActiveOrder(req, res);

    expect(ordersService.cancelActiveOrderByUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Commande invalide" });
  });

  it("CancelActiveOrder_WhenOrderRequestError_ReturnsMappedStatus", async () => {
    (ordersService.cancelActiveOrderByUser as jest.Mock<any>).mockRejectedValue(
      new OrderRequestError(409, "Cette commande ne peut plus être annulée."),
    );
    const { req, res } = makeReqRes({
      session: { user: { id: "user_1" } },
      params: { id: "7" },
    });

    await cancelActiveOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Cette commande ne peut plus être annulée.",
    });
  });


  // Vérifie que la commande confirmée est retournée avec un statut 200 si le code est valide

  it("ConfirmCode_WhenCodeIsValid_Returns200", async () => {
    const commande = { id: 7, etat: "COMPLETEE" };
    (ordersService.confirmOrderCode as jest.Mock<any>).mockResolvedValue(
      commande,
    );
    const { req, res } = makeReqRes({
      params: { id: "7" },
      body: { code: "ABC123" },
    });

    await confirmCode(req, res);

    expect(ordersService.confirmOrderCode).toHaveBeenCalledWith(7, "ABC123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Commande confirmée",
      commande,
    });
  });


  // Vérifie qu'une erreur 400 est retournée si le code est absent du body

  it("ConfirmCode_WhenCodeMissing_Returns400", async () => {
    const { req, res } = makeReqRes({
      params: { id: "7" },
      body: {},
    });

    await confirmCode(req, res);

    expect(ordersService.confirmOrderCode).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Code requis" });
  });


  // Vérifie que le statut HTTP de l'OrderRequestError est correctement transmis au client

  it("ConfirmCode_WhenOrderRequestError_ReturnsMappedStatus", async () => {
    (ordersService.confirmOrderCode as jest.Mock<any>).mockRejectedValue(
      new OrderRequestError(409, "Cette commande n'est pas prête pour ramassage"),
    );
    const { req, res } = makeReqRes({
      params: { id: "7" },
      body: { code: "ABC123" },
    });

    await confirmCode(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Cette commande n'est pas prête pour ramassage",
    });
  });


  // Vérifie qu'une erreur 400 est retournée si le code fourni est incorrect

  it("ConfirmCode_WhenCodeIsWrong_Returns400", async () => {
    (ordersService.confirmOrderCode as jest.Mock<any>).mockRejectedValue(
      new OrderRequestError(400, "Code incorrect"),
    );
    const { req, res } = makeReqRes({
      params: { id: "7" },
      body: { code: "WRONG" },
    });

    await confirmCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Code incorrect" });
  });


  // Vérifie qu'une erreur 500 est retournée en cas d'erreur inattendue du service

  it("ConfirmCode_WhenUnexpectedError_Returns500", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    (ordersService.confirmOrderCode as jest.Mock<any>).mockRejectedValue(
      new Error("DB down"),
    );
    const { req, res } = makeReqRes({
      params: { id: "7" },
      body: { code: "ABC123" },
    });

    await confirmCode(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });

  //--------------------------------------------------------------------------
  //                      getAllFinished
  //--------------------------------------------------------------------------
  describe("getAllFinished", () => {
    //--------------------------------------------------------------------------
    it("getAllFinished -- should return active orders with status 200", async () => {
      const mockOrders = [{id: 1, etat: "EN_COURS",} ];

     mockedGetAllFinishedOrders.mockResolvedValue(mockOrders as any);

      const { req, res } = makeReqRes();

      await getAllFinished(req, res);

      expect(mockedGetAllFinishedOrders).toHaveBeenCalledTimes(1);

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    //--------------------------------------------------------------------------
    it("getAllFinished -- should return 500 when service throws", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockedGetAllFinishedOrders.mockRejectedValue(new Error("Database error"));

      const { req, res } = makeReqRes();

      await getAllFinished(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message:
          "Erreur lors de la récupération des commandes terminées",
      });

      consoleSpy.mockRestore();
    });
  });

  //--------------------------------------------------------------------------
  //                      getAllActive
  //--------------------------------------------------------------------------
  describe("getAllActive", () => {
    //--------------------------------------------------------------------------
    it("getAllActive -- should return active orders with status 200", async () => {
      const mockOrders = [{id: 1, etat: "EN_COURS",} ];

     mockedGetAllActiveOrders.mockResolvedValue(mockOrders as any);

      const { req, res } = makeReqRes();

      await getAllActive(req, res);

      expect(mockedGetAllActiveOrders).toHaveBeenCalledTimes(1);

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    //--------------------------------------------------------------------------
    it("getAllActive -- should return 500 when service throws", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockedGetAllActiveOrders.mockRejectedValue(new Error("Database error"));

      const { req, res } = makeReqRes();

      await getAllActive(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message:
          "Erreur lors de la récupération des commandes actives",
      });

      consoleSpy.mockRestore();
    });
  });
});

//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
const mockedGetAllActiveOrders = getAllActiveOrders as jest.MockedFunction<typeof getAllActiveOrders>;
const mockedGetAllFinishedOrders = getAllFinishedOrders as jest.MockedFunction<typeof getAllFinishedOrders>;