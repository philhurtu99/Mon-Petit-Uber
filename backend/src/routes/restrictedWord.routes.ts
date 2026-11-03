import { Router } from "express";
import { isAdmin } from "../guards/roleGuard";
import {
  create,
  getAllRestrictedWords,
  remove,
  testAiDetection,
  update,
} from "../controllers/restrictedWord.controller";

const router = Router();

router.get("/", isAdmin, getAllRestrictedWords);
router.post("/test-ai", isAdmin, testAiDetection);
router.post("/", isAdmin, create);
router.put("/:id", isAdmin, update);
router.delete("/:id", isAdmin, remove);

export default router;
