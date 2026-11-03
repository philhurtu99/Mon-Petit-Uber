import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import "../forms.css";
import HelpModal from "../../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../../helpPage/hooks/useHelpSystem";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface EditCategoryModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (category: Category) => void;
}

const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  isOpen,
  category,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Category | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();

  useEffect(() => {
    if (category) {
      setFormData({ ...category });
    }
  }, [category]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!formData) return;

    const { name, value } = e.target;
    setFormData((prev) =>
      prev ? {
        ...prev,
        [name]: value,
      } : null
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !formData.name.trim()) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    onSave(formData);
    onClose();
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Éditer la Catégorie</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Nom de la catégorie *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Fruits"
              required
              {...helpProps("name")}
            />
          </div>

          <div className="form-group" {...helpProps("color")}>
            <label htmlFor="color">Couleur *</label>
            <div className="color-picker-wrapper">
              <input
                type="color"
                id="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                required
                className="color-picker-input"
              />
              <input
                type="text"
                value={formData.color}
                onChange={handleChange}
                name="color"
                placeholder="#000000"
                className="color-text-input"
              />
              <div
                className="color-preview"
                style={{
                  backgroundColor: formData.color,
                }}
              />
            </div>
          </div>

          <div className="modal-footer" {...helpProps("actions")}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} />
              <span>Enregistrer</span>
            </button>
          </div>
        </form>

        <HelpModal page="editCategory" 
          isOpen={isHelpOpen==true} 
          onOpen={()=>setIsHelpOpen(true)} 
          onClose={()=>setIsHelpOpen(false)}
        /> 
      </div>
    </div>
  );
};

export default EditCategoryModal;
