import { Request, Response } from "express";
import * as salesService from "../services/sales.service";

/**
 * Helper pour extraire les dates des query params
 */
const getFilters = (req: Request): salesService.SalesFilter => {
  const { startDate, endDate } = req.query;
  return {
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  };
};

/**
 * Retourne les statistiques globales (CA, Nb commandes, etc.)
 */
export const getOverallStats = async (req: Request, res: Response) => {
  try {
    const filters = getFilters(req);
    const stats = await salesService.getOverallStats(filters);
    return res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        message: "Erreur lors de la récupération des statistiques globales",
      });
  }
};

/**
 * Retourne les meilleurs produits vendus
 */
export const getBestSellers = async (req: Request, res: Response) => {
  try {
    const filters = getFilters(req);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const stats = await salesService.getBestSellers(filters, limit);
    return res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        message: "Erreur lors de la récupération des meilleurs produits",
      });
  }
};

/**
 * Retourne la performance de chaque produit
 */
export const getProductPerformance = async (req: Request, res: Response) => {
  try {
    const filters = getFilters(req);
    const performance = await salesService.getProductPerformance(filters);
    return res.status(200).json(performance);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        message: "Erreur lors de la récupération des performances produits",
      });
  }
};

/**
 * Exporte les ventes (performance produits) en format CSV
 */
export const exportSalesCsv = async (req: Request, res: Response) => {
  try {
    const filters = getFilters(req);
    const csv = await salesService.generateSalesExportCsv(filters);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="performance-ventes-export.csv"',
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de l'export CSV" });
  }
};
