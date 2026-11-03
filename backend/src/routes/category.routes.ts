import { Router } from "express";
import { create, getAll, remove, update } from "../controllers/category.controller";

const router = Router();

router.post("/create", create);
router.get("/getAll", getAll);
router.put("/:id", update);
router.delete("/:id", remove);
export default router;