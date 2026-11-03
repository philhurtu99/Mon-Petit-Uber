import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import{create, update, remove, getByProduct, getStats, flag, updateAsAdmin, toggleActive, getAllFlagged} from "../controllers/productReview.controller";
import { isAdmin } from "../guards/roleGuard";

const router = Router();

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ message: "Non autorisé" });
  (req as any).user = user;
  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reviews/");
  },
  filename: (req, file, cb) => {
  const ext = file.mimetype === 'image/jpeg' ? '.jpg'
             : file.mimetype === 'image/png' ? '.png'
             : file.mimetype === 'image/webp' ? '.webp'
             : '.jpg';
  const productId = req.params.productId ?? req.params.id;
  cb(null, `review_p${productId}_${Date.now()}_${Math.round(Math.random() * 1000)}${ext}`);
}
});

const upload = multer({ storage });

router.post("/createReview/:productId",requireAuth, upload.array("images", 3), create);
router.post("/stats/:productId", getStats);
router.put("/updateReview/:id",requireAuth, upload.array("images", 3), update);
router.delete("/removeReview/:id",isAdmin, remove);
router.get("/product/:productId", getByProduct);

// Routes de modération
router.post("/flag/:id", requireAuth, flag); // Signaler un avis
router.put("/updateAsAdmin/:id", isAdmin, updateAsAdmin); // Modifier un avis (admin)
router.put("/toggleActive/:id", isAdmin, toggleActive); // Activer/Désactiver un avis (admin)
router.get("/flagged/all", isAdmin, getAllFlagged); // Récupérer tous les avis signalés (admin)

export default router;
