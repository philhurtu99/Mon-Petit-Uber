import { Request, Response } from "express";
import {
  getAdminClients,
  getAdminClientDetails,
  getAdminClientHabits,
  getAdminClientsExportJson,
  getAdminClientsExportCsv,
  adjustAdminClientLoyaltyPoints,
  LoyaltyPointsLimitError,
  HabitPeriod,
} from "../services/adminClient.service";
import { notifyUserLoyaltyPointsChanged } from "../services/loyaltyEvents.service";
import { LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS } from "../config/loyalty.config";
import { roundAdminLoyaltyPointsDelta } from "../utils/loyaltyPoints";

/** ---------------------------------------------------------------------
 * Retourne tous les clients pour le dashboard admin
 * @param req - Requête HTTP
 * @param res - Réponse avec la liste des clients
 * @returns 200 avec les clients, 500 en cas d'erreur
 ---------------------------------------------------------------------*/
export const getAllAdminClients = async (_req: Request, res: Response) => {
  try {
    const clients = await getAdminClients();
    return res.status(200).json(clients);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des clients",
    });
  }
};

/** ---------------------------------------------------------------------
 * Retourne la fiche complète d'un client
 * @param req - Requête contenant l'ID du client
 * @param res - Réponse avec les détails du client
 * @returns 200 avec le client, 404 si introuvable, 500 en cas d'erreur
 ---------------------------------------------------------------------*/
export const getAdminClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!id) {
      return res.status(400).json({ message: "ID client manquant" });
    }

    const client = await getAdminClientDetails(id);

    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    return res.status(200).json(client);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la récupération du client",
    });
  }
};

/** ---------------------------------------------------------------------
 * Retourne les habitudes d'achat d'un client par jour ou par mois
 * @param req - Requête contenant l'ID du client et la période
 * @param res - Réponse avec les habitudes d'achat
 * @returns 200 avec les habitudes, 404 si client introuvable, 500 en cas d'erreur
 ---------------------------------------------------------------------*/
export const getAdminClientHabitsById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const period = String(req.query.period || "month") as HabitPeriod;

    if (!id) {
      return res.status(400).json({ message: "ID client manquant" });
    }

    if (period !== "day" && period !== "month") {
      return res.status(400).json({
        message: "Période invalide. Utilisez 'day' ou 'month'.",
      });
    }

    const habits = await getAdminClientHabits(id, period);

    if (!habits) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    return res.status(200).json(habits);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des habitudes d'achat",
    });
  }
};

// Met à jour les points de fidélité d'un client administrateur.
export const updateAdminClientLoyaltyPoints = async (
  req: Request,
  res: Response,
) => {
  try {
    // Récupère l'ID du client et le delta de points à appliquer.
    // Applique le delta de points au client et notifie l'utilisateur.
    // Les delta de point signifient le nombre de points à ajouter ou retirer.
    const { id } = req.params as { id: string };
    const rawPointsDelta = Number((req.body as any)?.pointsDelta);
    const pointsDelta = roundAdminLoyaltyPointsDelta(rawPointsDelta);

    if (!id) {
      return res.status(400).json({ message: "ID client manquant" });
    }

    // Vérifie que le delta de points est valide et donne une tranche de points non nulle.
    if (!Number.isFinite(rawPointsDelta) || pointsDelta === 0) {
      return res.status(400).json({
        message: `Le nombre de points doit être au moins ${LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS} ou -${LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS}, par tranche de ${LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS}.`,
      });
    }

    // Applique le delta de points au client et notifie l'utilisateur.
    const result = await adjustAdminClientLoyaltyPoints(id, pointsDelta);

    // Vérifie que le client existe et que les points ont été mis à jour.
    if (!result) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Notifie l'utilisateur que les points ont été mis à jour.
    notifyUserLoyaltyPointsChanged(result.id);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof LoyaltyPointsLimitError) {
      return res.status(400).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de la mise à jour des points",
    });
  }
};

/** ---------------------------------------------------------------------
 * Exporte les fiches clients en JSON
 * @param req - Requête HTTP
 * @param res - Réponse avec un fichier JSON
 * @returns fichier JSON, 500 en cas d'erreur
 ---------------------------------------------------------------------*/
export const exportAdminClientsJson = async (_req: Request, res: Response) => {
  try {
    const clients = await getAdminClientsExportJson();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="clients-export.json"',
    );

    return res.status(200).send(JSON.stringify(clients, null, 2));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de l'export JSON des clients",
    });
  }
};

/** ---------------------------------------------------------------------
 * Exporte les fiches clients en CSV
 * @param req - Requête HTTP
 * @param res - Réponse avec un fichier CSV
 * @returns fichier CSV, 500 en cas d'erreur
 ---------------------------------------------------------------------*/
export const exportAdminClientsCsv = async (_req: Request, res: Response) => {
  try {
    const csv = await getAdminClientsExportCsv();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="clients-export.csv"',
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur lors de l'export CSV des clients",
    });
  }
};
