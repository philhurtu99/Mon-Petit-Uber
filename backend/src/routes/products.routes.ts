import { Router } from "express";
import { isAdmin } from "../guards/roleGuard";
import { create, getAll, getById, remove, update, updateProductDiscountController } from "../controllers/products.controller";
import multer from "multer";
import path from "path";
import { updateProduct } from "../services/product.service";
import { NextFunction } from "express-serve-static-core";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/products/");
  },
  filename: (req, file, cb) => {
    const productName = req.body.name
      ? req.body.name.trim().replace(/\s+/g, "_").toLowerCase()
      : Date.now().toString();

    const ext = path.extname(file.originalname);
    cb(null, productName + ext);
  },
});
const upload = multer({ storage });

router.post("/create", isAdmin, upload.single("imageUrl"), create);


router.post("/:id/discount" ,updateProductDiscountController);  
// TODO : Ajouter vérification isAdmin quand le système d'auth sera prêt
router.get("/getAll", getAll);
router.get("/getById/:id", getById);
router.delete("/remove/:id", isAdmin, remove);
router.put("/update/:id", isAdmin, upload.single("imageUrl"), update);

export default router;
