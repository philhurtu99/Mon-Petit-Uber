import { useHelp } from "../../../contexts/helpContext";
import { useHelpScroll } from "./useHelpScroll";
import { useHoverHelp } from "./useHoverHelp";

/**
 * Hook centralisant le système d’aide contextuelle.
 *
 * Combine :
 * - la gestion de l’aide au survol (`useHoverHelp`)
 * - le défilement automatique vers la section d’aide active (`useHelpScroll`)
 * - l’accès à l’état courant de l’aide via le contexte global
 *
 * Retourne l’aide actuellement active ainsi qu’une fonction utilitaire
 * permettant d’attacher facilement les comportements d’aide
 * aux composants interactifs.
 */
export function useHelpSystem() {
  const { setHelp, help } = useHelp();

  const { helpProps } = useHoverHelp(setHelp);

  useHelpScroll();

  return {
    help,
    helpProps,
  };
}