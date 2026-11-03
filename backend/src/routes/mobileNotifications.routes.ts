import { Router } from "express";
import { isAdmin, isLogged } from "../guards/roleGuard";
import {
  getVapidPublicKey,
  sendNotificationToUser,
  sendTestNotification,
  subscribeToMobileNotifications,
  unsubscribeFromMobileNotifications,
} from "../controllers/mobileNotifications.controller";

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", isLogged, subscribeToMobileNotifications);
router.delete("/subscribe", isLogged, unsubscribeFromMobileNotifications);
router.post("/test", isLogged, sendTestNotification);
router.post("/send", isAdmin, sendNotificationToUser);

export default router;
