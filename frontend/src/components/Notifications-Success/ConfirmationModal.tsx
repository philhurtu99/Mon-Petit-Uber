import React from "react";
import { X, AlertTriangle } from "lucide-react";
import "../admin/forms.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDangerous?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-delete" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isDangerous && <AlertTriangle size={24} style={{ color: "#ef4444" }} />}
            {title}
          </h2>
          <button className="modal-close-btn" onClick={onCancel} disabled={isLoading}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <p>{message}</p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={isDangerous ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "En cours..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
