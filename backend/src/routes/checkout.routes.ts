import { Router } from "express";
import {
  handleCreateSession,
  handleConfirmSession,
  handleCheckoutStatus,
} from "../controllers/checkout.controller";

const router = Router();

// Crée une session de checkout pour l'utilisateur
router.post("/create-session", handleCreateSession);
// Vérifie auprès de Stripe si la session a été payée (source de vérité)
router.get("/status", handleCheckoutStatus);
// Confirme la session après paiement — uniquement en dev (en prod, le webhook s'en charge)
if (process.env.NODE_ENV !== "production") {
  router.get("/confirm", handleConfirmSession);
}

export default router;
