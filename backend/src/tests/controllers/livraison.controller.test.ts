import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { EventEmitter } from "events";
import type { Request } from "express";

jest.mock("../../services/livraison.service", () => ({
  completeCurrentLivraisonForLivreur: jest.fn(),
  getCurrentLivraisonForLivreur: jest.fn(),
  getLivraisonAvailability: jest.fn(),
  requestOldestLivraisonForLivreur: jest.fn(),
}));

jest.mock("../../services/orders.service", () => {
  class MockOrderRequestError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return { OrderRequestError: MockOrderRequestError };
});

jest.mock("../../services/orderEvents.service", () => ({
  ORDER_DELIVERY_CHANGED: "order-delivery-changed",
  orderEvents: new EventEmitter(),
}));

jest.mock("../../services/livraisonNotifications.service", () => ({
  notifyDeliveryReadyEmailSubscribers: jest.fn(),
  subscribeToDeliveryReadyEmail: jest.fn(),
}));

import * as livraisonService from "../../services/livraison.service";
import {
  subscribeToDeliveryReadyEmail,
} from "../../services/livraisonNotifications.service";
import { OrderRequestError } from "../../services/orders.service";
import {
  ORDER_DELIVERY_CHANGED,
  orderEvents,
} from "../../services/orderEvents.service";
import {
  completeLivraison,
  getCurrentLivraison,
  getLivraisonStatus,
  requestLivraison,
  streamCurrentLivraison,
  streamLivraisonStatus,
  subscribeToLivraisonReadyNotification,
} from "../../controllers/livraison.controller";

type MockReq = {
  session?: any;
  body?: any;
  params?: Record<string, string>;
};

const makeReqRes = (reqOverrides?: MockReq) => {
  const closeHandlers: Array<() => void> = [];
  const req = {
    session: {},
    body: {},
    params: {},
    on: jest.fn((event: string, handler: () => void) => {
      if (event === "close") closeHandlers.push(handler);
      return req;
    }),
    ...reqOverrides,
  } as unknown as Request & { on: jest.Mock };

  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.flushHeaders = jest.fn();
  res.write = jest.fn();
  res.end = jest.fn();

  return { req, res, close: () => closeHandlers.forEach((handler) => handler()) };
};

describe("LivraisonControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orderEvents.removeAllListeners(ORDER_DELIVERY_CHANGED);
  });

  it("GetLivraisonStatus_ReturnsAvailability", async () => {
    const status = { available: true, count: 2 };
    (livraisonService.getLivraisonAvailability as jest.Mock<any>).mockResolvedValue(
      status,
    );
    const { req, res } = makeReqRes();

    await getLivraisonStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(status);
  });

  it("GetLivraisonStatus_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (livraisonService.getLivraisonAvailability as jest.Mock<any>).mockRejectedValue(
      new Error("DB down"),
    );
    const { req, res } = makeReqRes();

    await getLivraisonStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Erreur lors de la vérification des livraisons disponibles",
    });
    consoleSpy.mockRestore();
  });

  it("GetCurrentLivraison_UsesSessionUserId", async () => {
    const order = { id: 1, etat: "IN_DELIVERY" };
    (
      livraisonService.getCurrentLivraisonForLivreur as jest.Mock<any>
    ).mockResolvedValue(order);
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
    });

    await getCurrentLivraison(req, res);

    expect(livraisonService.getCurrentLivraisonForLivreur).toHaveBeenCalledWith(
      "livreur_1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ order });
  });

  it("GetCurrentLivraison_UsesSessionUserObjectId", async () => {
    (
      livraisonService.getCurrentLivraisonForLivreur as jest.Mock<any>
    ).mockResolvedValue(null);
    const { req, res } = makeReqRes({
      session: { user: { id: "livreur_2" } },
    });

    await getCurrentLivraison(req, res);

    expect(livraisonService.getCurrentLivraisonForLivreur).toHaveBeenCalledWith(
      "livreur_2",
    );
    expect(res.json).toHaveBeenCalledWith({ order: null });
  });

  it("GetCurrentLivraison_OrderRequestError_ReturnsErrorStatus", async () => {
    (
      livraisonService.getCurrentLivraisonForLivreur as jest.Mock<any>
    ).mockRejectedValue(new OrderRequestError(401, "Livreur non authentifié"));
    const { req, res } = makeReqRes();

    await getCurrentLivraison(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Livreur non authentifié",
    });
  });

  it("RequestLivraison_AssignsOldestLivraison", async () => {
    const order = { id: 5 };
    (
      livraisonService.requestOldestLivraisonForLivreur as jest.Mock<any>
    ).mockResolvedValue(order);
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
    });

    await requestLivraison(req, res);

    expect(livraisonService.requestOldestLivraisonForLivreur).toHaveBeenCalledWith(
      "livreur_1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Commande assignée au livreur",
      order,
    });
  });

  it("RequestLivraison_NoAvailableOrder_Returns404", async () => {
    (
      livraisonService.requestOldestLivraisonForLivreur as jest.Mock<any>
    ).mockResolvedValue(null);
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
    });

    await requestLivraison(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Aucune commande prête pour livraison disponible",
    });
  });

  it("RequestLivraison_OrderRequestError_ReturnsErrorStatus", async () => {
    (
      livraisonService.requestOldestLivraisonForLivreur as jest.Mock<any>
    ).mockRejectedValue(new OrderRequestError(409, "Déjà en livraison"));
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
    });

    await requestLivraison(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Déjà en livraison" });
  });

  it("CompleteLivraison_CompletesCurrentLivraison", async () => {
    const order = { id: 8, etat: "COMPLETEE" };
    (
      livraisonService.completeCurrentLivraisonForLivreur as jest.Mock<any>
    ).mockResolvedValue(order);
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
      body: { code: "4321" },
    });

    await completeLivraison(req, res);

    expect(livraisonService.completeCurrentLivraisonForLivreur).toHaveBeenCalledWith(
      "livreur_1",
      "4321",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Livraison terminée",
      order,
    });
  });

  it("CompleteLivraison_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (
      livraisonService.completeCurrentLivraisonForLivreur as jest.Mock<any>
    ).mockRejectedValue(new Error("Boom"));
    const { req, res } = makeReqRes({
      session: { userId: "livreur_1" },
      body: { code: "4321" },
    });

    await completeLivraison(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });

  it("SubscribeToLivraisonReadyNotification_Returns400WithoutEmail", async () => {
    const { req, res } = makeReqRes({
      session: { user: { id: "livreur_1" } },
    });

    await subscribeToLivraisonReadyNotification(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Impossible de trouver l'adresse courriel du livreur.",
    });
  });

  it("SubscribeToLivraisonReadyNotification_DoesNotSubscribeWhenAvailable", async () => {
    (livraisonService.getLivraisonAvailability as jest.Mock<any>).mockResolvedValue({
      available: true,
      count: 1,
    });
    const { req, res } = makeReqRes({
      session: {
        user: { id: "livreur_1", email: "livreur@test.com" },
      },
    });

    await subscribeToLivraisonReadyNotification(req, res);

    expect(subscribeToDeliveryReadyEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Une commande est déjà disponible pour livraison.",
      subscribed: false,
    });
  });

  it("SubscribeToLivraisonReadyNotification_SubscribesWithSessionUser", async () => {
    (livraisonService.getLivraisonAvailability as jest.Mock<any>).mockResolvedValue({
      available: false,
      count: 0,
    });
    (
      subscribeToDeliveryReadyEmail as jest.Mock<any>
    ).mockReturnValue({ alreadySubscribed: false });
    const { req, res } = makeReqRes({
      session: {
        user: {
          id: "livreur_1",
          email: "livreur@test.com",
          firstName: "Ada",
          lastName: "Lovelace",
        },
      },
    });

    await subscribeToLivraisonReadyNotification(req, res);

    expect(subscribeToDeliveryReadyEmail).toHaveBeenCalledWith({
      userId: "livreur_1",
      email: "livreur@test.com",
      name: "Ada Lovelace",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message:
        "Notification courriel activée pour 1 heure. Vous recevrez un courriel dès qu'une commande sera prête.",
      subscribed: true,
    });
  });

  it("SubscribeToLivraisonReadyNotification_ReturnsAlreadySubscribedMessage", async () => {
    (livraisonService.getLivraisonAvailability as jest.Mock<any>).mockResolvedValue({
      available: false,
      count: 0,
    });
    (
      subscribeToDeliveryReadyEmail as jest.Mock<any>
    ).mockReturnValue({ alreadySubscribed: true });
    const { req, res } = makeReqRes({
      session: {
        userId: "livreur_1",
        user: { email: "livreur@test.com" },
      },
    });

    await subscribeToLivraisonReadyNotification(req, res);

    expect(subscribeToDeliveryReadyEmail).toHaveBeenCalledWith({
      userId: "livreur_1",
      email: "livreur@test.com",
    });
    expect(res.json).toHaveBeenCalledWith({
      message: "La notification courriel est déjà activée pour 1 heure.",
      subscribed: true,
    });
  });

  it("StreamLivraisonStatus_WritesInitialStatusAndRegistersEventListener", async () => {
    jest.useFakeTimers();
    (livraisonService.getLivraisonAvailability as jest.Mock<any>).mockResolvedValue({
      available: true,
      count: 1,
    });
    const { req, res, close } = makeReqRes();

    await streamLivraisonStatus(req, res);
    await Promise.resolve();

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/event-stream",
    );
    expect(res.write).toHaveBeenCalledWith("retry: 5000\n\n");
    expect(res.write).toHaveBeenCalledWith("event: availability\n");
    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ available: true, count: 1 })}\n\n`,
    );
    expect(orderEvents.listenerCount(ORDER_DELIVERY_CHANGED)).toBe(1);

    close();
    expect(orderEvents.listenerCount(ORDER_DELIVERY_CHANGED)).toBe(0);
    expect(res.end).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("StreamCurrentLivraison_WritesInitialOrderAndRegistersEventListener", async () => {
    jest.useFakeTimers();
    const order = { id: 9 };
    (
      livraisonService.getCurrentLivraisonForLivreur as jest.Mock<any>
    ).mockResolvedValue(order);
    const { req, res, close } = makeReqRes({
      session: { user: { id: "livreur_1" } },
    });

    await streamCurrentLivraison(req, res);
    await Promise.resolve();

    expect(livraisonService.getCurrentLivraisonForLivreur).toHaveBeenCalledWith(
      "livreur_1",
    );
    expect(res.write).toHaveBeenCalledWith("event: current\n");
    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ order })}\n\n`,
    );
    expect(orderEvents.listenerCount(ORDER_DELIVERY_CHANGED)).toBe(1);

    close();
    expect(orderEvents.listenerCount(ORDER_DELIVERY_CHANGED)).toBe(0);
    expect(res.end).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
