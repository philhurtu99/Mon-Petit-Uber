import { Router } from "express";
import { isAdmin } from "../guards/roleGuard";
import {
  getAllAdminClients,
  getAdminClientById,
  getAdminClientHabitsById,
  exportAdminClientsJson,
  exportAdminClientsCsv,
  updateAdminClientLoyaltyPoints,
} from "../controllers/adminClient.controller";

const router = Router();

router.get("/", isAdmin, getAllAdminClients);
router.get("/export/json", isAdmin, exportAdminClientsJson);
router.get("/export/csv", isAdmin, exportAdminClientsCsv);
router.get("/:id/habits", isAdmin, getAdminClientHabitsById);
router.patch("/:id/loyalty-points", isAdmin, updateAdminClientLoyaltyPoints);
router.get("/:id", isAdmin, getAdminClientById);

export default router;
