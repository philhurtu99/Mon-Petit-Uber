import "dotenv/config";
import { getRequiredEnv } from "./src/utils/env";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./src/routes/auth.routes";
import session from "express-session";
import path from "path";
import ProductRoutes from "./src/routes/products.routes";
import faqRoutes from "./src/routes/faq.routes";
import categoryRoutes from "./src/routes/category.routes";
import cartRoutes from "./src/routes/cart.routes";
import promotionRoutes from "./src/routes/promotion.routes";
import { runSeed } from "./prisma/seed";
import userRoutes from "./src/routes/user.routes";
import passport from "passport";
import "./src/config/passport.config";
import transactionRoutes from "./src/routes/transaction.routes";
import checkoutRoutes from "./src/routes/checkout.routes";
import ordersRoutes from "./src/routes/orders.routes";
import preparateurRoutes from "./src/routes/preparateur.routes";
import livraisonRoutes from "./src/routes/livraison.routes";
import productReview from "./src/routes/productReview.routes";
import { handleWebhook } from "./src/controllers/checkout.controller";
import botRoutes from "./src/routes/bot.routes";
import invoiceRoutes from "./src/routes/invoice.routes";
import mobileNotificationsRoutes from "./src/routes/mobileNotifications.routes";
import { scheduleExistingOrderExpirations } from "./src/services/orderExpiration.service";
import adminClientRoutes from "./src/routes/adminClient.route";
import salesRoutes from "./src/routes/sales.routes";
import employeeReview from "./src/routes/employeeReview.routes";
import configRoutes from "./src/routes/config.routes";
import restrictedWordRoutes from "./src/routes/restrictedWord.routes";
import livreurDashboard from "./src/routes/livreurDashboard.routes";


console.log("ENV FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("NODE_ENV:", process.env.NODE_ENV);

const app = express();
app.set("trust proxy", true);
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));
// Stripe requires the raw request body to verify webhook signatures.
app.post(
  "/api/checkout/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: getRequiredEnv("SESSION_SECRET"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);
app.use(passport.initialize());

app.get("/", (req, res) => res.send("API working"));
app.get("/api/bonjour", (req, res) =>
  res.json({ mensaje: "¡Bonjour Leonor!" }),
);

app.post("/api/admin/seed", async (req, res) => {
  try {
    await runSeed();
    res.status(200).json({ message: "Seed exécuté via API !" });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors du seed" });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", ProductRoutes);
app.use("/api/faq", faqRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/promotion", promotionRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/orders", invoiceRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/preparateur", preparateurRoutes);
app.use("/api/livraison", livraisonRoutes);
app.use("/api/notifications", mobileNotificationsRoutes);
app.use("/api/admin/clients", adminClientRoutes);
app.use("/api/admin/restricted-words", restrictedWordRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/config", configRoutes);
app.use("/api/productReview", productReview);
app.use("/api/employeeReview", employeeReview);
app.use("/api/livreurDashboard", livreurDashboard);

scheduleExistingOrderExpirations().catch((error) => {
  console.error("Erreur scheduling expirations commandes:", error);
});

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`),
);
