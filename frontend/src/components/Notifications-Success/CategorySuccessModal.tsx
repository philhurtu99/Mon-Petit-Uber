import React from "react";
import confetti from "canvas-confetti";
import mascotte from "../../assets/Mascotte-PouceEnHaut.png";
import "./success-modal.css";

interface CategorySuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const CategorySuccessModal: React.FC<CategorySuccessModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
}) => {
  if (!isOpen) return null;

  // Déclencher le confetti
  React.useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 0,
        spread: 80,
        origin: { y: 0.6 },
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  return (
    <div className="modal-overlay modal-overlay-success" onClick={onClose}>
      <div
        className="modal-content modal-success-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>
        <div className="modal-success">
          <img
            src={mascotte}
            alt="Mascotte"
            className="modal-success-mascotte"
          />
          <h2>{title}</h2>
          <p>{message}</p>
          <button onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default CategorySuccessModal;
