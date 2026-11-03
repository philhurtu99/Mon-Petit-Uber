import React from "react";
import { X, Trash2 } from "lucide-react";
import "./DeleteConfirm.css";

interface DeleteConfirmProps {
  isOpen: boolean;
  itemName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({
  isOpen,
  itemName,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-delete" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmer la Suppression</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="delete-warning-icon">
            <Trash2 size={48} />
          </div>
          <p className="delete-message">
            Êtes-vous sûr de vouloir supprimer <strong>{itemName}</strong> ?
          </p>
          <p className="delete-submessage">
            Cette action est irréversible et supprimera tous les données associées.
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            <Trash2 size={18} />
            <span>{isLoading ? "Suppression..." : "Supprimer"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirm;
