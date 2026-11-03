import { Router } from "express";
import { isAdmin, isEmploye, isLogged } from "../guards/roleGuard";
import {
  getAllLivraison,
  getAllPickup,
  requestNextLivraison,
  triggerReady,
  getActiveOrder,
  streamActiveOrderEvents,
  confirmCode,
  cancelActiveOrder,
  switchToTakeoutController,
  cancelStalledController,
  getAllFinished,
  getAllActive,
} from "../controllers/orders.controller";

const router = Router();

router.get("/getAllPickup", isEmploye, getAllPickup);
router.get("/getAllLivraison", isEmploye, getAllLivraison);
router.post("/:id/ready", isEmploye, triggerReady);
router.post("/livraison/request", isEmploye, requestNextLivraison);
router.get("/active", isLogged, getActiveOrder);
router.get("/active/stream", isLogged, streamActiveOrderEvents);
router.post("/:id/cancel", isLogged, cancelActiveOrder);
router.post("/:id/switch-to-takeout", isLogged, switchToTakeoutController);
router.post("/:id/cancel-stalled", isLogged, cancelStalledController);
router.post("/:id/confirm-code", isEmploye, confirmCode);
router.get("/allFinished", isAdmin, getAllFinished);
router.get("/allActives", isAdmin, getAllActive);

export default router;
