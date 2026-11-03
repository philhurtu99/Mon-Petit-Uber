import { useEffect, useRef } from "react";
import { API_URL } from "../../../config";
import type { Step } from "../../../models";

type VideoStepProps = {
  steps?: Step[];
  videoSrc: string;
  autoPlay?: boolean;
  startTime?: number;
  endTime?: number;
};

/**
 * Component permettant d'affichier un video et associer les temps dans la vidéo
 * @param steps liste de step (texte et temps) qui seront associé avec la vidéo 
 * ex.
 *  const steps: Step[] = [
    { label: "Recherche ou filtre ", time: 0 },
    { label: "Sélectionne des produits ", time: 15 },
    { label: "Ajoute au panier ", time: 35 },
    { label: "Change de page ", time: 55 }
  ];
 * @param videoSrc chemin de la video 
 * @returns 
 */
export default function VideoStep({steps=[], videoSrc, autoPlay = false}: VideoStepProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // la video se relance si la vidéo change
  useEffect(() => {
    if (!autoPlay) return;

    // Quand la source vidéo change ou au montage du composant
    if (videoRef.current) {
      // On tente de lancer la lecture automatiquement
      // (certains navigateurs peuvent bloquer → d'où le catch vide)
      videoRef.current.play().catch(() => {});
    }
  }, [videoSrc, autoPlay]); 
  
  const goTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const src = `/Videos/help/${videoSrc}`;

  return (
    <div>
      <video 
        ref={videoRef}          // On lie la ref à la balise vidéo
        src={src}               // Source de la vidéo
        muted                   // Nécessaire pour autoriser l'autoplay
        playsInline             // Évite le plein écran sur mobile
        preload="auto"          // Charge la vidéo dès que possible
        style={{ width: '100%' }} // Prend toute la largeur du parent
        controls
        autoPlay={autoPlay}
      />
    
       {/* On parcourt le tableau "steps" */}
      {steps.map((step, i) => (
        <p
          key={i}
          onClick={() => goTo(step.time)} 
          style={{ cursor: "pointer" }}
        >
          <strong>{i + 1}.</strong> {step.label} {/* label des étapes */}
        </p>
      ))}
    </div>
  );
}