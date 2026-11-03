import{create, getAll} from "../controllers/employeeReview.controller";
import { Router, Request, Response, NextFunction } from "express";
import { isAdmin } from "../guards/roleGuard";

const router = Router();

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ message: "Non autorisé" });
  (req as any).user = user;
  next();
};

router.post("/createReview/:commandeId", requireAuth, create);
router.get("/employeReviews",isAdmin, getAll);

export default router;