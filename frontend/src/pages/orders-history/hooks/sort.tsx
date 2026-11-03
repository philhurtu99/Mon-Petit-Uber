import { useState } from "react";

type SortDirection = "asc" | "desc";

/**
 * Hook personnalisé pour gérer le tri d’un tableau.
 *
 * Fournit :
 * - l’état du tri (clé + direction)
 * - une fonction pour changer la colonne triée et alterner asc/desc
 * - une fonction utilitaire pour afficher l’icône de tri dans l’UI
 *
 * Permet de rendre un tableau triable de manière réutilisable et indépendante
 * pour chaque instance de tableau.
 *
 * @param defaultKey Clé de tri initiale (colonne par défaut)
 * @returns sortConfig, handleSort, getSortIcon
 */
export const useTableSort = (defaultKey: string) => {

  // Contient la colonne triée et la direction du tri (asc/desc).
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: defaultKey,
    direction: "desc",
  });

  // Met à jour le tri du tableau (colonne + direction asc/desc).
  // Inverse la direction si la même colonne est sélectionnée.
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  // Retourne l’icône de tri associée à une colonne du tableau.
  // Affiche :
  // - ▲ lorsque la colonne est triée en ordre ascendant
  // - ▼ lorsque la colonne est triée en ordre descendant
  // - ↕ lorsque la colonne n’est pas active
  const getSortIcon = (key: string) => {
    return (
      <span className="sort-icon">
        {sortConfig.key === key
          ? sortConfig.direction === "asc"
            ? "▲"
            : "▼"
          : "↕"}
      </span>
    );
  };

  return {
    sortConfig,
    handleSort,
    getSortIcon,
  };
};