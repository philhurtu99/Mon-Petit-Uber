import { Router, Request, Response, NextFunction } from "express";
import {
  getCreditBalance,
  getLoyaltyPoints,
  streamLoyaltyPoints,
  streamCreditBalance,
  updateProfile,
  updateProfanityFilter,
  toggleTwoFactor,
  getTwoFactor,
  getMarketing,
  updateMarketing,
} from "../controllers/user.controller";
import multer from "multer";
import path from "path";

const router = Router();

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).session?.user;
  if (!user) return res.status(401).json({ message: "Non autorisé" });
  (req as any).user = user;
  next();
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/profiles/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
router.get("/credit", requireAuth, getCreditBalance);
router.get("/credit/stream", requireAuth, streamCreditBalance);
router.get("/loyalty-points", requireAuth, getLoyaltyPoints);
router.get("/loyalty-points/stream", requireAuth, streamLoyaltyPoints);
router.patch("/updateProfile", requireAuth, upload.single("profilePicture"), updateProfile);
router.patch("/profanity-filter", requireAuth, updateProfanityFilter);

// Routes 2FA et marketing
router.get("/two-factor", requireAuth, getTwoFactor);
router.patch("/two-factor", requireAuth, toggleTwoFactor);

// Routes Marketing
router.get("/marketing", requireAuth, getMarketing);
router.patch("/marketing", requireAuth, updateMarketing);

export default router;
