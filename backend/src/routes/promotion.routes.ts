import { Router } from "express";
import * as promotionController from "../controllers/promotion.controller";

const router = Router();

// Create a new promotion
router.post("/create", promotionController.create);

// Get all promotions
router.get("/getAll", promotionController.getAll);

// Get active promotions only
router.get("/active", promotionController.getActive);

// Get promotions for a specific product
router.get("/product/:productId", promotionController.getByProduct);

// Get promotion by ID
router.get("/:id", promotionController.getById);

// Update promotion
router.put("/:id", promotionController.update);

// Delete promotion
router.delete("/:id", promotionController.remove);

export default router;
