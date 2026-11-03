import { Router } from "express";
import {
  getLocauxConfig,
  getLoyaltyConfig,
} from "../controllers/config.controller";

const router = Router();

router.get("/loyalty", getLoyaltyConfig);
router.get("/locaux", getLocauxConfig);

export default router;
