import React from "react";
import mascotte from "../../assets/mascotte_questionnement.png";
import "./error-modal.css";

interface CategoryErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const CategoryErrorModal: React.FC<CategoryErrorModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay-error" onClick={onClose}>
      <div
        className="modal-content modal-error-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <div className="modal-error-content">
          <img
            src={mascotte}
            alt="Mascotte"
            className="modal-error-mascotte"
          />
          <h2>{title}</h2>
          <p>{message}</p>
          <button onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryErrorModal;
