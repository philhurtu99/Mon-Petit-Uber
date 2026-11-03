import { useEffect } from "react";
import { useHelp } from "../../../contexts/helpContext";

/**
 * Hook permettant de faire défiler automatiquement le panneau d’aide
 * vers l’élément actuellement sélectionné dans le contexte d’aide.
 *
 * Le scroll est limité au conteneur `.help-container`
 * afin d’éviter de déplacer la page principale.
 *
 * L’élément ciblé est recherché via l’attribut `data-help`
 * correspondant à la valeur courante du contexte `help`.
 *
 * Le défilement est animé et centre l’élément dans la zone visible
 * du panneau d’aide.
 */
export function useHelpScroll() {
  const { help } = useHelp();

  useEffect(() => {
  if (!help) return;

  const el = document.querySelector(`[data-help="${help}"]`);
  const container = document.querySelector(".help-container");

  if (!el || !container) return;

  const containerRect = container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  const offset = elRect.top - containerRect.top;

  container.scrollTo({
    top: container.scrollTop + offset - (container.clientHeight * 0.2),
    behavior: "smooth",
  });

}, [help]);
}