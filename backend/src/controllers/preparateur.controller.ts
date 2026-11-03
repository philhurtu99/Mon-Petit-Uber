import { Request, Response } from "express";
import {
  getPreparationBoard,
  getOrdersToPrepare,
  getReadyOrders,
  markOrderReadyByPreparateur,
} from "../services/preparateur.service";
import { OrderRequestError } from "../services/orders.service";
import {
  ORDER_DELIVERY_CHANGED,
  ORDER_PREPARATION_CHANGED,
  orderEvents,
} from "../services/orderEvents.service";

function getPreparateurId(req: Request) {
  return (
    ((req.session as any)?.userId as string | undefined) ??
    ((req.session as any)?.user?.id as string | undefined)
  );
}

export const getPreparationOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await getOrdersToPrepare();
    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des commandes à préparer",
    });
  }
};

export const getReadyPreparationOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await getReadyOrders();
    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des commandes prêtes",
    });
  }
};

export const streamPreparationOrders = async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write("retry: 5000\n\n");

  let lastPayload = "";
  let closed = false;

  const sendOrders = async () => {
    if (closed) return;

    try {
      const board = await getPreparationBoard();
      const payload = JSON.stringify(board);

      if (closed) return;

      if (payload !== lastPayload) {
        lastPayload = payload;
        res.write(`event: orders\n`);
        res.write(`data: ${payload}\n\n`);
      }
    } catch (error) {
      if (closed) return;

      console.error(error);
      res.write(`event: error\n`);
      res.write(
        `data: ${JSON.stringify({
          message: "Erreur lors de la récupération des commandes à préparer",
        })}\n\n`,
      );
    }
  };

  void sendOrders();
  const heartbeatId = setInterval(() => {
    if (!closed) {
      res.write(": heartbeat\n\n");
    }
  }, 30000);

  orderEvents.on(ORDER_PREPARATION_CHANGED, sendOrders);
  orderEvents.on(ORDER_DELIVERY_CHANGED, sendOrders);

  _req.on("close", () => {
    closed = true;
    clearInterval(heartbeatId);
    orderEvents.off(ORDER_PREPARATION_CHANGED, sendOrders);
    orderEvents.off(ORDER_DELIVERY_CHANGED, sendOrders);
    res.end();
  });
};

export const markOrderReady = async (req: Request, res: Response) => {
  try {
    const preparateurId = getPreparateurId(req);
    const order = await markOrderReadyByPreparateur(
      Number(req.params.id),
      preparateurId ?? "",
    );

    return res.status(200).json({
      message:
        order.type === "LIVRAISON"
          ? "Commande prête pour livraison"
          : "Commande prête pour ramassage",
      order,
    });
  } catch (error: any) {
    if (error instanceof OrderRequestError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
