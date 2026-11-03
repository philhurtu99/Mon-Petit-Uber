import { Router } from "express";
import * as salesController from "../controllers/sales.controller";
import { isAdmin } from "../guards/roleGuard";

const router = Router();

// Toutes les routes de ventes sont réservées aux admins
router.use(isAdmin);

router.get("/stats", salesController.getOverallStats);
router.get("/best-sellers", salesController.getBestSellers);
router.get("/performance", salesController.getProductPerformance);
router.get("/export/csv", salesController.exportSalesCsv);

export default router;
