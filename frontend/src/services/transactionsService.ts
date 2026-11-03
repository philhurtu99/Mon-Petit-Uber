import { API_URL } from "../config";
import type { DateRange, TransactionDTO } from "../models";

/** ---------------------------------------------------------------------------
 * Fonction permettant d'envoyer une requete pour avoir les transactions d'un utilisateur donné
 * @param userId id de l'utilisateur pour lequel on veut ces transactions
 --------------------------------------------------------------------------- */
export async function fetchGetAllForUser(userId: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/transactions/getAllForUser/${userId}`,
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json(); // on retourne les données
  } catch (err) {
    console.error("Error:", err);
    throw err; // pour gérer l'erreur
  }
}

/** ---------------------------------------------------------------------------
 * Fonction permettant de filtrer les transactions avec le mot clé et la date (range)
 * @param transactions transactions a filtrer
 * @param searchTerm terme a rechercher
 * @param dateRange filtre avec les dates
 * @returns les transactions filtrées
 --------------------------------------------------------------------------- */
export function filtrerTransactions(
  transactions: TransactionDTO[],
  searchTerm: string,
  dateRange: DateRange,
) {
  const normalize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[[\u0300-\u036f]]/g, "")
      .toLowerCase();

  return transactions.filter((transaction) => {
    const txDate = new Date(transaction.purchaseDate);

    const matchesNamesSearch =
      !searchTerm ||
      transaction.items.some((item) =>
        normalize(item.name || "").includes(normalize(searchTerm)),
      );

    const matchesDatesFilter = (() => {
      if (!dateRange) return true;

      // Début et fin de la plage en UTC
      const from = new Date(dateRange.from);
      from.setUTCHours(0, 0, 0, 0);
      const to = new Date(dateRange.to);
      to.setUTCHours(23, 59, 59, 999);

      return txDate >= from && txDate <= to;
    })();

    return matchesNamesSearch && matchesDatesFilter;
  });
}

/** ---------------------------------------------------------------------------
 * Formate une date en chaîne lisible 
 *
 * Format retourné :
 * YYYY-MM-DD (HHhMM)
 *
 * Exemple :
 * 2026-05-21 (14h30)
 *
 * Fonctionnement :
 * - Retourne "-" si la date est absente ou invalide.
 * - Convertit la valeur reçue en objet Date.
 *
 * @param date - Date à formater (Date, string ISO, timestamp, etc.)
 * @returns La date formatée ou "-" si aucune date. 
 --------------------------------------------------------------------------- */
export const formatDatePourFiltre = (date: any) => {
  if (!date) return "-";

  const d = new Date(date);
  
  // Afficher la date/heure telle qu'enregistrée dans la BDD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} (${hh}h${min})`;
};
