import { Router } from "express";
import { isPreparateur } from "../guards/roleGuard";
import {
  getPreparationOrders,
  getReadyPreparationOrders,
  markOrderReady,
  streamPreparationOrders,
} from "../controllers/preparateur.controller";

const router = Router();

router.get("/orders/to-prepare", isPreparateur, getPreparationOrders);
router.get("/orders/ready", isPreparateur, getReadyPreparationOrders);
router.get("/orders/to-prepare/stream", isPreparateur, streamPreparationOrders);
router.post("/orders/:id/ready", isPreparateur, markOrderReady);

export default router;
