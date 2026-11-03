import { Router } from "express";
import { isAdmin } from "../guards/roleGuard";
import { getAll, getById, getAllForUser } from "../controllers/transactions.controller";

const router = Router();

router.get("/getAll", getAll);
router.get("/getById/:id", getById);
router.get("/getAllForUser/:id", getAllForUser);

export default router;
