import { Request, Response } from "express";
import {  getLivreurDashboard,} from "../services/livreurDashboard.service";


/**
 * Retourne le dashboard du livreur
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.id;

    if (!employeeId)
      return res.status(401).json({ message: "Non authentifié" });

    const data = await getLivreurDashboard(employeeId);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};