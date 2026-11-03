import { Router } from "express";
import { getAll, getById, remove, update, create } from "../controllers/faq.controller";
import { isAdmin } from "../guards/roleGuard";
import { createFaq } from "../services/faq.service";



const router = Router();

// public : lecture
router.get("/getAll", getAll);
router.get("/:id", getById)

// Amin uniquement : écriture
router.post("/getAll", getAll);
router.put("/:id", isAdmin, update);
router.delete("/:id", isAdmin, remove)
router.post("/create", isAdmin, create );
export default router;