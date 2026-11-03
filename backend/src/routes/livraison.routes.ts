import { Router } from "express";
import { isEmploye } from "../guards/roleGuard";
import {
  completeLivraison,
  getCurrentLivraison,
  getLivraisonStatus,
  requestLivraison,
  subscribeToLivraisonReadyNotification,
  streamCurrentLivraison,
  streamLivraisonStatus,
} from "../controllers/livraison.controller";

const router = Router();

router.get("/status", isEmploye, getLivraisonStatus);
router.get("/status/stream", isEmploye, streamLivraisonStatus);
router.get("/current", isEmploye, getCurrentLivraison);
router.get("/current/stream", isEmploye, streamCurrentLivraison);
router.post("/request", isEmploye, requestLivraison);
router.post("/complete", isEmploye, completeLivraison);
router.post(
  "/notifications/ready",
  isEmploye,
  subscribeToLivraisonReadyNotification,
);

export default router;
