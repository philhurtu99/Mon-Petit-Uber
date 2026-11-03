import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import "../forms.css";
import { API_URL } from "../../../config";
import HelpModal from "../../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../../helpPage/hooks/useHelpSystem";

interface Product {
  id: number;
  name: string;
  price: number;
}

interface Promotion {
  id: number;
  name: string;
  description?: string;
  type: "BUY_X_GET_Y" | "FREE_ITEM";
  targetProductId: number;
  bonusProductId?: number;
  quantity?: number;
  bonusQuantity?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targetProduct?: Product;
  bonusProduct?: Product;
}

interface EditPromotionModalProps {
  isOpen: boolean;
  promotion: Promotion | null;
  onClose: () => void;
  onSave: (
    payload: {
      name: string;
      description?: string | null;
      type: "BUY_X_GET_Y" | "FREE_ITEM";
      targetProductId: number;
      bonusProductId?: number | null;
      quantity?: number | null;
      bonusQuantity: number;
      startDate?: string | null;
      endDate: string;
      isActive: boolean;
    },
    setNameError: (msg: string) => void,
    setEndDateError: (msg: string) => void,
  ) => void;
}

const EditPromotionModal: React.FC<EditPromotionModalProps> = ({
  isOpen,
  promotion,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Promotion | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [endDateError, setEndDateError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();

  // Charger les produits disponibles
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/getAll`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des produits:", error);
      }
    };

    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  // Initialiser les données du formulaire quand la promotion change
  useEffect(() => {
    if (promotion) {
      setFormData({ ...promotion });
      setNameError(null);
      setEndDateError(null);
    }
  }, [promotion]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!formData) return;

    const { name, value, type } = e.target;

    // Checkbox
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => (prev ? { ...prev, [name]: checked } : null));
      return;
    }

    // Parse numeric fields
    if (["targetProductId", "bonusProductId", "quantity", "bonusQuantity"].includes(name)) {
      const numValue = value ? parseInt(value) : undefined;
      setFormData((prev) =>
        prev ? { ...prev, [name]: numValue } : null
      );
    } else {
      setFormData((prev) =>
        prev ? { ...prev, [name]: value } : null
      );
    }

    // Clear errors when user modifies
    if (name === "name") setNameError(null);
    if (name === "endDate") setEndDateError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    // Validation basique
    if (!formData.name.trim()) {
      setNameError("Le nom de la promotion est requis");
      return;
    }

    if (!formData.endDate) {
      setEndDateError("La date de fin est requise");
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      type: formData.type,
      targetProductId: formData.targetProductId,
      bonusProductId: formData.bonusProductId || null,
      quantity: formData.quantity || null,
      bonusQuantity: formData.bonusQuantity || 1,
      startDate: formData.startDate || null,
      endDate: formData.endDate,
      isActive: formData.isActive,
    };

    onSave(payload, setNameError, setEndDateError);
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Éditer la Promotion</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Nom de la promotion *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: 2 pour 1"
              required
              {...helpProps("name")} 
            />
            {nameError && (
              <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{nameError}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              placeholder="Détails de la promotion..."
              rows={3}
              {...helpProps("description")} 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Type de promotion *</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                {...helpProps("type")} 
              >
                <option value="BUY_X_GET_Y">X pour Y</option>
                <option value="FREE_ITEM">Autre article gratuit</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="targetProductId">Produit cible *</label>
              <select
                id="targetProductId"
                name="targetProductId"
                value={formData.targetProductId}
                onChange={handleChange}
                required
                {...helpProps("targetProduct")} 
              >
                <option value="">-- Sélectionner un produit --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.type === "BUY_X_GET_Y" && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity">Quantité à acheter *</label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity || ""}
                  onChange={handleChange}
                  min="1"
                  placeholder="Ex: 3"
                  required
                  {...helpProps("xForY")} 
                />
              </div>

              <div className="form-group">
                <label htmlFor="bonusQuantity">Quantité à payer *</label>
                <input
                  type="number"
                  id="bonusQuantity"
                  name="bonusQuantity"
                  value={formData.bonusQuantity || 1}
                  onChange={handleChange}
                  min="1"
                  placeholder="Ex: 1"
                  required
                  {...helpProps("xForY")} 
                />
              </div>
            </div>
          )}

          {formData.type === "FREE_ITEM" && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity">Quantité requise <span style={{ color: "red" }}>*</span></label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity || ""}
                  onChange={handleChange}
                  min="1"
                  placeholder="Ex: 3 (pour '3 achetés 1 offert')"
                  required
                  {...helpProps("free")} 
                />
              </div>

              <div className="form-group">
                <label htmlFor="bonusProductId">Produit bonus *</label>
                <select
                  id="bonusProductId"
                  name="bonusProductId"
                  value={formData.bonusProductId || ""}
                  onChange={handleChange}
                  required
                  {...helpProps("bonus")} 
                >
                  <option value="">-- Sélectionner un produit --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {formData.type === "FREE_ITEM" && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bonusQuantity">Quantité bonus</label>
                <input
                  type="number"
                  id="bonusQuantity"
                  name="bonusQuantity"
                  value={formData.bonusQuantity || 1}
                  onChange={handleChange}
                  min="1"
                  placeholder="1"
                   {...helpProps("free")} 
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Date de début</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate || ""}
                onChange={handleChange}
                 {...helpProps("dates")} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">Date de fin *</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                {...helpProps("dates")} 
              />
              {endDateError && (
                <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{endDateError}</p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                {...helpProps("active")} 
              />
              <span>Promotion active</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} />
              <span>Enregistrer</span>
            </button>
          </div>
        </form>

        <HelpModal page="editPromotion" 
          isOpen={isHelpOpen==true} 
          onOpen={()=>setIsHelpOpen(true)} 
          onClose={()=>setIsHelpOpen(false)}
        /> 
      </div>
    </div>
  );
};

export default EditPromotionModal;
