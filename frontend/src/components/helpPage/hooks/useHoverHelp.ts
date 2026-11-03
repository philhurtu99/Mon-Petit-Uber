import { useRef } from "react";

/**
 * Hook permettant de gérer l’affichage différé d’une aide contextuelle
 * lors du survol d’un élément.
 *
 * Lorsqu’un élément est survolé, un délai est appliqué avant
 * d’afficher l’aide afin d’éviter les activations accidentelles
 * pendant les déplacements rapides de la souris.
 *
 * Si la souris quitte l’élément avant la fin du délai,
 * l’affichage est annulé.
 *
 * Le hook expose également une fonction utilitaire `helpProps`
 * permettant d’attacher facilement les événements de survol
 * à un élément React.
 */
export function useHoverHelp(setHelp: (id: string | null) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (id: string) => {
    timerRef.current = setTimeout(() => {
      setHelp(id);
    }, 500);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHelp(null);
  };

  const helpProps = (id: string) => ({
    onMouseEnter: () => show(id),
  });

  return { show, hide, helpProps };
}