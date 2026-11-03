import Cropper from "react-easy-crop";
import { useState, useCallback } from "react";

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onCropDone: (croppedFile: File) => void;
}

// Fonction utilitaire pour découper l'image selon la zone sélectionnée
const createCroppedImage = async (imageSrc: string, croppedAreaPixels: any): Promise<File> => {
  const image = await new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => resolve(img);
  });

  const canvas = document.createElement("canvas");
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob!], "avatar.jpg", { type: "image/jpeg" }));
    }, "image/jpeg");
  });
};

export function AvatarCropper({ imageSrc, onCancel, onCropDone }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Sauvegarde la zone de recadrage sélectionnée
  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Génère le fichier recadré et le retourne au composant parent
  const handleConfirm = async () => {
    const croppedFile = await createCroppedImage(imageSrc, croppedAreaPixels);
    onCropDone(croppedFile);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
      zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
    }}>
      {/* Zone de recadrage */}
      <div style={{ position: "relative", width: 300, height: 300, borderRadius: "50%", overflow: "hidden" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Contrôle du zoom */}
      <input
        type="range" min={1} max={3} step={0.1}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        style={{ margin: "20px 0", width: 200 }}
      />

      {/* Boutons confirmer / annuler */}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleConfirm} className="profile__btn-save">Confirmer</button>
        <button onClick={onCancel} className="profile__btn-cancel">Annuler</button>
      </div>
    </div>
  );
}