import { Router } from "express";
import { searchBotAnswers } from "../controllers/bot.controller";

const router = Router();

router.get("/questions", searchBotAnswers);

export default router;
