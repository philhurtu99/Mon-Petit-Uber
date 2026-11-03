import { useEffect, useRef, useState } from "react";

type UseResizablePanelProps = {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onResize?: (width: number) => void;
};

 /**
   * Gestion du redimensionnement horizontal du panneau d’aide.
   * Permet de modifier dynamiquement la largeur en fonction de la position
   * de la souris lors d’un drag.
   * La largeur est limitée entre 250px et 800px pour éviter des valeurs extrêmes.
   * Les events mousemove et mouseup sont écoutés globalement sur la fenêtre
   * et correctement nettoyés lors du démontage du composant.
   */
export function useResizablePanel({
  initialWidth = 400,
  minWidth = 400,
  maxWidth = 800,
  onResize,
}: UseResizablePanelProps = {}) {

  const [width, setWidth] = useState(initialWidth);

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;

      const delta =  startX.current - e.clientX;
      const newWidth = startWidth.current + delta;

      const clampedWidth = 
        Math.min(
          Math.max(newWidth, minWidth),
          maxWidth
      );

      setWidth(clampedWidth);
      onResize?.(clampedWidth);
    };

    const stopResize = () => {
      isResizing.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResize);
    };

  }, [minWidth, maxWidth]);

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;

    startX.current = e.clientX;
    startWidth.current = width;
  };

  return {
    width,
    startResize,
  };
}