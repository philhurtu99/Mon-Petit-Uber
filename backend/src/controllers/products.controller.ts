import { Request, Response } from "express";
import {
  createProduct,
  getProductbyId,
  getAllProducts,
  updateProduct,
  deleteProduct,
  updateProductDiscount,
} from "../services/product.service";

/**
 * Crée un nouveau produit
 */
export const create = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      sale,
      idle,
      stock,
      categoryId,
      isCooked,
    } = req.body;

    let imageUrl: string | null = null;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    const parsedPrice = parseFloat(price);
    const parsedSale =
      sale !== undefined && sale !== "" ? parseInt(sale) : null;

    const newProduct = await createProduct({
      name,
      description,
      imageUrl,
      price: parsedPrice,
      sale: parsedSale,
      idle: idle === "true",
      isCooked: isCooked === "true",
      stock: parseInt(stock),
      categoryId: parseInt(categoryId),
    });
    return res
      .status(201)
      .json({ message: "produit créé", product: newProduct });
  } catch (error: any) {
    if (error.message === "Un produit avec ce nom existe déjà")
      return res.status(409).json({ message: error.message });
    if (error.message) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * retourne tous les produits
 */
export const getAll = async (req: Request, res: Response) => {
  try {
    const products = await getAllProducts();
    return res.status(200).json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "erreur" });
  }
};

/**
 * retourne un produit par son ID
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await getProductbyId(Number(id));
    if (!product)
      return res.status(404).json({ message: "produit non trouvé" });
    return res.status(200).json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "erreur" });
  }
};

/**
 * retourne un produit par son ID et met à jour ses données
 */
export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await getProductbyId(Number(id));
    if (!product)
      return res.status(404).json({ message: "produit non trouvé" });

    let imageUrl = product.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    const parsedPrice = parseFloat(req.body.price);
    const parsedSale =
      req.body.sale !== undefined && req.body.sale !== ""
        ? parseInt(req.body.sale)
        : null;

    const updated = await updateProduct(Number(id), {
      name: req.body.name,
      description: req.body.description,
      imageUrl,
      price: parsedPrice,
      sale: parsedSale,
      idle: req.body.idle === "true",
      isCooked: req.body.isCooked === "true",
      stock: parseInt(req.body.stock),
      categoryId: parseInt(req.body.categoryId),
    });

    return res
      .status(200)
      .json({ message: "mise a jour du produit faite", product: updated });
  } catch (error: any) {
    if (error.message === "Un produit avec ce nom existe déjà")
      return res.status(409).json({ message: error.message });
    if (error.message) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Erreur" });
  }
};

/**
 * Supprime un produit par son ID
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await getProductbyId(Number(id));
    if (!product)
      return res.status(404).json({ message: "produit non trouvé" });

    await deleteProduct(Number(id));
    return res.status(200).json({ message: "Producto effacé" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur" });
  }
};

/**
 * Modifier le rabais d'un produit par son ID
 */
export const updateProductDiscountController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { discountPercent } = req.body;

    const updated = await updateProductDiscount(Number(id), discountPercent);

    return res.status(200).json({
      message: "Rabais mis à jour avec succès",
      product: updated,
    });
  } catch (error: any) {
    if (error.message === "Produit non trouvé")
      return res.status(404).json({ message: "Produit non trouvé" });
    if (error.message) return res.status(400).json({ message: error.message });

    console.error(error);
    return res.status(500).json({ message: "Erreur" });
  }
};
