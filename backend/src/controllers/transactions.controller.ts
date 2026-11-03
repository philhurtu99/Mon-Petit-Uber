import { Request, Response } from "express";
import { getAllTransactions, getTransactionById, getTransactionByUser } from "../services/transaction.service";

/** ---------------------------------------------------------------------
 * retourne tous les transactions
 * @param req - Requête HTTP
 * @param res - Réponse avec tous les transactions
 * @returns 200 avec tous les transactions, 500 en cas d'erreur
 ---------------------------------------------------------------------*/
export const getAll = async (req: Request, res: Response) => {
  try {
    const transactions = await getAllTransactions();
    return res.status(200).json(transactions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la récupération des transactions" });
  }
};


/** ---------------------------------------------------------------------
 * retourne une transaction par son ID
 * @param req - Requête contenant l'ID de la transaction
 * @param res - Réponse avec la transaction trouvée
 * @returns 200 avec la transaction trouvée, 404 si non trouvé, 500 en cas d'erreur
 ---------------------------------------------------------------------*/
export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transaction = await getTransactionById(Number(id));
    if (!transaction)
      return res.status(404).json({ message: "Transaction non trouvée" });
    return res.status(200).json(transaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la récupération de la transaction" });
  }
};


/** ---------------------------------------------------------------------
 * retourne tous les transactions d'un utilisateur donné
 * @param req - Requête HTTP
 * @param res - Réponse avec tous les transactions
 * @returns 200 avec tous les transactions, 500 en cas d'erreur
 *  -------------------------------------------------------------------------------------*/
export const getAllForUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ message: "ID utilisateur manquant" });

    const transactions = await getTransactionByUser(String(userId));
    if (!transactions)
      return res.status(404).json({ message: "Utilisateur non trouvées" });

    return res.status(200).json(transactions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la récupération des transactions de l'utilisateur" });
  }
};