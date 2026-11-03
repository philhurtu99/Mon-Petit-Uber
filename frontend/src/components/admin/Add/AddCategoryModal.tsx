import React, { useState } from "react";
import { X, Save } from "lucide-react";
import "../forms.css";
import HelpModal from "../../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../../helpPage/hooks/useHelpSystem";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#000000");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    onSave(name, color);
    setName("");
    setColor("#000000");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setColor("#000000");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajouter une Catégorie</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Nom de la catégorie *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fruits"
              required
              {...helpProps("name")} 
            />
          </div>

          <div className="form-group">
            <label htmlFor="color">Couleur *</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="color"
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required
                style={{ width: "60px", height: "40px", cursor: "pointer" }}
                {...helpProps("color")} 
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#000000"
                style={{ flex: 1 }}
               {...helpProps("color")} 
              />
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: color,
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
          </div>

          <div className="modal-footer" {...helpProps("actions")}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
            >
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} />
              <span>Ajouter</span>
            </button>
          </div>
        </form>

        <HelpModal page="addCategory" 
          isOpen={isHelpOpen==true} 
          onOpen={()=>setIsHelpOpen(true)} 
          onClose={()=>setIsHelpOpen(false)}
        /> 

      </div>
    </div>
  );
};

export default AddCategoryModal;
