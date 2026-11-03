import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { EventEmitter } from "events";
import type { Request } from "express";

jest.mock("../../services/preparateur.service", () => ({
  getPreparationBoard: jest.fn(),
  getOrdersToPrepare: jest.fn(),
  getReadyOrders: jest.fn(),
  markOrderReadyByPreparateur: jest.fn(),
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
  ORDER_PREPARATION_CHANGED: "order-preparation-changed",
  orderEvents: new EventEmitter(),
}));

import * as preparateurService from "../../services/preparateur.service";
import { OrderRequestError } from "../../services/orders.service";
import {
  ORDER_PREPARATION_CHANGED,
  orderEvents,
} from "../../services/orderEvents.service";
import {
  getPreparationOrders,
  getReadyPreparationOrders,
  markOrderReady,
  streamPreparationOrders,
} from "../../controllers/preparateur.controller";

type MockReq = {
  session?: any;
  params?: Record<string, string>;
};

const makeReqRes = (reqOverrides?: MockReq) => {
  const closeHandlers: Array<() => void> = [];
  const req = {
    session: {},
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

describe("PreparateurControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orderEvents.removeAllListeners(ORDER_PREPARATION_CHANGED);
  });

  it("GetPreparationOrders_ReturnsOrders", async () => {
    const orders = [{ id: 1 }];
    (preparateurService.getOrdersToPrepare as jest.Mock<any>).mockResolvedValue(
      orders,
    );
    const { req, res } = makeReqRes();

    await getPreparationOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("GetPreparationOrders_ServiceThrows_Returns500", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (preparateurService.getOrdersToPrepare as jest.Mock<any>).mockRejectedValue(
      new Error("DB down"),
    );
    const { req, res } = makeReqRes();

    await getPreparationOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Erreur lors de la récupération des commandes à préparer",
    });
    consoleSpy.mockRestore();
  });

  it("GetReadyPreparationOrders_ReturnsReadyOrders", async () => {
    const orders = [{ id: 2, etat: "READY_FOR_PICKUP" }];
    (preparateurService.getReadyOrders as jest.Mock<any>).mockResolvedValue(
      orders,
    );
    const { req, res } = makeReqRes();

    await getReadyPreparationOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("MarkOrderReady_UsesSessionUserIdAndReturnsDeliveryMessage", async () => {
    const order = { id: 5, type: "LIVRAISON" };
    (
      preparateurService.markOrderReadyByPreparateur as jest.Mock<any>
    ).mockResolvedValue(order);
    const { req, res } = makeReqRes({
      session: { userId: "emp_1" },
      params: { id: "5" },
    });

    await markOrderReady(req, res);

    expect(preparateurService.markOrderReadyByPreparateur).toHaveBeenCalledWith(
      5,
      "emp_1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Commande prête pour livraison",
      order,
    });
  });

  it("MarkOrderReady_UsesSessionUserObjectIdAndReturnsPickupMessage", async () => {
    const order = { id: 6, type: "PICKUP" };
    (
      preparateurService.markOrderReadyByPreparateur as jest.Mock<any>
    ).mockResolvedValue(order);
    const { req, res } = makeReqRes({
      session: { user: { id: "emp_2" } },
      params: { id: "6" },
    });

    await markOrderReady(req, res);

    expect(preparateurService.markOrderReadyByPreparateur).toHaveBeenCalledWith(
      6,
      "emp_2",
    );
    expect(res.json).toHaveBeenCalledWith({
      message: "Commande prête pour ramassage",
      order,
    });
  });

  it("MarkOrderReady_OrderRequestError_ReturnsErrorStatus", async () => {
    (
      preparateurService.markOrderReadyByPreparateur as jest.Mock<any>
    ).mockRejectedValue(new OrderRequestError(409, "Plus vieille d'abord"));
    const { req, res } = makeReqRes({
      session: { userId: "emp_1" },
      params: { id: "7" },
    });

    await markOrderReady(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Plus vieille d'abord" });
  });

  it("MarkOrderReady_UnexpectedError_Returns500", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (
      preparateurService.markOrderReadyByPreparateur as jest.Mock<any>
    ).mockRejectedValue(new Error("Boom"));
    const { req, res } = makeReqRes({ params: { id: "8" } });

    await markOrderReady(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Erreur serveur" });
    consoleSpy.mockRestore();
  });

  it("StreamPreparationOrders_WritesInitialBoardAndRegistersEventListener", async () => {
    jest.useFakeTimers();
    (preparateurService.getPreparationBoard as jest.Mock<any>).mockResolvedValue({
      toPrepare: [{ id: 1 }],
      ready: [],
    });
    const { req, res, close } = makeReqRes();

    await streamPreparationOrders(req, res);
    await Promise.resolve();

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/event-stream",
    );
    expect(res.write).toHaveBeenCalledWith("retry: 5000\n\n");
    expect(res.write).toHaveBeenCalledWith("event: orders\n");
    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ toPrepare: [{ id: 1 }], ready: [] })}\n\n`,
    );
    expect(orderEvents.listenerCount(ORDER_PREPARATION_CHANGED)).toBe(1);

    close();
    expect(orderEvents.listenerCount(ORDER_PREPARATION_CHANGED)).toBe(0);
    expect(res.end).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
