import { Router } from "express";
import type {} from "../types/express";
import {
  register,
  verifyEmail,
  login,
  getSession,
  logout,
  forgotPassword,
  resetPassword,
  verifyTwoFactor,
  sendTwoFactorCodeToUser,
} from "../controllers/auth.controller";
import multer from "multer";
import path from "path";
import passport from "passport";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profiles/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.post("/register", upload.single("profilePicture"), register);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/verify-2fa", verifyTwoFactor);
router.get("/getSession", getSession);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  async (req, res) => {
    const user = req.user as any;

    // Si la 2FA est activée, on redirige vers une page qui demande le code
    // au lieu d'ouvrir la session directement.
    if (user.twoFactorEnabled && user.twoFactorMethod) {
      const sent = await sendTwoFactorCodeToUser({
        id: user.id,
        email: user.email,
        phone: user.phone ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
        twoFactorMethod: user.twoFactorMethod,
      });

      if (!sent) {
        return res.redirect(
          `${process.env.FRONTEND_URL || "http://localhost:5173"}/?error=2fa_send_failed`,
        );
      }

      // Redirection vers le frontend avec un paramètre pour ouvrir le modal 2FA
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/?twoFactor=${user.id}&method=${user.twoFactorMethod}`,
      );
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      profilePicture: user.profilePicture ?? null,
      role: user.role,
      profanityFilterEnabled: user.profanityFilterEnabled,
    };

    (req.session as any).user = safeUser;
    (req.session as any).userId = user.id;

    req.session.save((err) => {
      if (err) console.error("SESSION SAVE ERROR:", err);
      res.redirect(process.env.FRONTEND_URL || "http://localhost:5173");
    });
  },
);

export default router;
