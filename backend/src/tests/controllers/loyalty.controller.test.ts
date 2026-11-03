import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";
import { EventEmitter } from "events";

jest.mock("../../services/loyaltyEvents.service", () => {
  const { EventEmitter } = require("events");

  return {
    loyaltyEvents: new EventEmitter(),
    USER_LOYALTY_POINTS_CHANGED: "user-loyalty-points-changed",
    notifyUserLoyaltyPointsChanged: jest.fn(),
  };
});

import {
  getLoyaltyPoints,
  streamLoyaltyPoints,
} from "../../controllers/user.controller";
import {
  loyaltyEvents,
  USER_LOYALTY_POINTS_CHANGED,
} from "../../services/loyaltyEvents.service";

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn(() => res as Response) as any;
  res.json = jest.fn(() => res as Response) as any;
  return res as Response;
};

describe("LoyaltyControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Vérifie que le controller retourne le solde de points actuel au frontend.
  it("GetLoyaltyPoints_ReturnsCurrentPoints", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ loyaltyPoints: 3200 } as any);
    const req = { user: { id: "user_1" } } as unknown as Request;
    const res = makeRes();

    await getLoyaltyPoints(req, res);

    expect(res.json).toHaveBeenCalledWith({ loyaltyPoints: 3200 });
  });

  // Vérifie que le controller retourne 404 si l'utilisateur demandé est introuvable.
  it("GetLoyaltyPoints_WhenUserMissing_Returns404", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const req = { user: { id: "user_1" } } as unknown as Request;
    const res = makeRes();

    await getLoyaltyPoints(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Utilisateur introuvable",
    });
  });

  // Vérifie que le stream SSE envoie le solde initial puis les mises à jour de points du bon utilisateur.
  it("StreamLoyaltyPoints_WhenPointsChange_PushesUpdatedPoints", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ loyaltyPoints: 1000 } as any)
      .mockResolvedValueOnce({ loyaltyPoints: 1250 } as any);

    const req = new EventEmitter() as unknown as Request;
    (req as any).user = { id: "user_1" };

    const res = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as unknown as Response;

    await streamLoyaltyPoints(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/event-stream",
    );
    expect(res.write).toHaveBeenCalledWith("event: loyalty-points\n");
    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ loyaltyPoints: 1000 })}\n\n`,
    );

    loyaltyEvents.emit(USER_LOYALTY_POINTS_CHANGED, "other_user");
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);

    loyaltyEvents.emit(USER_LOYALTY_POINTS_CHANGED, "user_1");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ loyaltyPoints: 1250 })}\n\n`,
    );

    req.emit("close");
    expect(res.end).toHaveBeenCalled();
  });
});
