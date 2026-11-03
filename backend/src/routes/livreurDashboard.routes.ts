import { Router } from "express";
import { isEmploye } from "../guards/roleGuard";
import { getDashboard, } from "../controllers/livreurDashboard.controller";

const router = Router();

router.get("/dashboard", isEmploye, getDashboard);

export default router;