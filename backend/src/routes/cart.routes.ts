import { Router, type RequestHandler } from "express";
import {
  addToCartController,
  getCartController,
  removeOneFromCartController,
  removeItemFromCartController,
  clearCartController,
  getCartWithPromotionsController,
} from "../controllers/cart.controller";

const router = Router();

router.post("/addToCart", addToCartController as unknown as RequestHandler);
router.get("/", getCartController as unknown as RequestHandler);
router.get("/getCart", getCartController as unknown as RequestHandler);
router.get(
  "/cartWithPromotions",
  getCartWithPromotionsController as unknown as RequestHandler,
);
router.post(
  "/removeOne",
  removeOneFromCartController as unknown as RequestHandler,
);
router.delete(
  "/removeItem/:productId",
  removeItemFromCartController as unknown as RequestHandler,
);
router.post("/clear", clearCartController as unknown as RequestHandler);

export default router;
