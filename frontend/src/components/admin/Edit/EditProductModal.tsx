import React, { useState, useEffect, useRef } from "react";
import { X, Save, Upload } from "lucide-react";
import "../forms.css";
import { API_URL } from "../../../config";
import { Discount } from "@mui/icons-material";
import HelpModal from "../../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../../helpPage/hooks/useHelpSystem";

interface Product {
  id: number;
  name: string;
  category: string;
  categoryColor: string;
  categoryId: number;
  imageUrl: string;
  price: number;
  sale: number;
  finalPrice?: number;
  idle: boolean;
  isCooked: boolean;
  stock: number;
  description: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

interface EditProductModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (
    product: FormData,
    setNameError: (msg: string) => void,
    setPriceError: (msg: string) => void,
    setStockError: (msg: string) => void,
    setSaleError: (msg: string) => void,
  ) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  product,
  onClose,
  onSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Product | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [backendCategories, setBackendCategories] = useState<Category[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const { helpProps } = useHelpSystem();

  // Appel des catégories du backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/api/category/getAll`);
        if (response.ok) {
          const data = await response.json();
          setBackendCategories(data);
        } else {
          console.error("Erreur lors du chargement des catégories");
        }
      } catch (error) {
        console.error("Erreur:", error);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      setFormData({ ...product });
    }
  }, [product]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    if (!formData) return;

    const { name, value, type } = e.target;

    // checkbox
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => (prev ? { ...prev, [name]: checked } : null));
      return;
    }

    // price 2 decimals
    if (name === "price") {
      if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
        setFormData((prev) => (prev ? { ...prev, price: value as any } : null));
      }
      setPriceError(null);
      return;
    }
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            [name]:
              name === "stock" || name === "sale"
                ? parseInt(value) || 0
                : parseInt(value) || value,
          }
        : null,
    );
    setStockError(null);
    setSaleError(null);
    setNameError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) =>
          prev ? { ...prev, imageUrl: event.target?.result as string } : null,
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !formData.name.trim()) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("price", String(parseFloat(String(formData.price)) || 0));
    data.append("sale", String(formData.sale));
    data.append("idle", String(formData.idle));
    data.append("isCooked", String(formData.isCooked));
    data.append("stock", String(formData.stock));
    data.append("categoryId", String(formData.categoryId));

    if (imageFile) {
      data.append("imageUrl", imageFile);
    } else if (formData.imageUrl) {
      data.append("imageUrl", formData.imageUrl);
    }

    onSave(data, setNameError, setPriceError, setStockError, setSaleError);

    // Si on a modifié le rabais, appeler aussi l'API de rabais
    // if(product && formData.salePercent !== product.salePercent) {
    //   try {
    //     await fetch(`http://localhost:5000/api/products/${product.id}/discount`, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json'},
    //       body: JSON.stringify({ discountPercent: formData.salePercent })
    //     });
    //   } catch (error) {
    //     console.error('Erreur lors de la mise à jour du rabais : ', error)
    //   }
    // }
  };

  if (!isOpen || !formData) return null;
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Éditer le Produit</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Nom du produit *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Cheeseburger"
              required
              {...helpProps("name")}
            />
            {nameError && (
              <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                {nameError}
              </p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Catégorie *</label>
              <div className="category-select-wrapper">
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                  {...helpProps("category")}
                >
                  {backendCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {backendCategories.length > 0 && (
                  <div
                    className="category-color-indicator"
                    style={{
                      backgroundColor:
                        backendCategories.find(
                          (c) => c.id === formData.categoryId,
                        )?.color || "#e0e0e0",
                    }}
                  />
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="price">Prix ($) *</label>
              <input
                type="text"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Ex: 12.99"
                min="0.50"
                required
                {...helpProps("price")}
              />
              {priceError && (
                <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                  {priceError}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="stock">Stock *</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                required
                {...helpProps("stock")}
              />
              {stockError && (
                <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                  {stockError}
                </p>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sale">rabais (%) *</label>
              <input
                type="number"
                id="sale"
                name="sale"
                value={formData.sale}
                onChange={handleChange}
                placeholder="0"
                step="1"
                min="0"
                max="100"
                required
                {...helpProps("sale")}
              />
              {saleError && (
                <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                  {saleError}
                </p>
              )}
            </div>

            {/* Affichage du prix final calculé coté serveur*/}
            {formData.sale > 0 && (
              <div className="discount-calculation">
                <p>
                  <strong>Prix total final :</strong>{" "}
                  {(formData.price * (1 - formData.sale / 100))
                    .toFixed(2)
                    .replace(".", ",")}{" "}
                  $
                </p>
              </div>
            )}

            {/* Affichage de l'économie */}
            {formData.sale > 0 && (
              <div className="discount-savings">
                <p>
                  <strong>Économie:</strong> &
                  {((formData.price * formData.sale) / 100).toFixed(2)} (
                  {formData.sale}%)
                </p>
              </div>
            )}

            <div className="form-group">
              <label
                htmlFor="idle"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                Produit inactif
              </label>
              <input
                type="checkbox"
                id="idle"
                name="idle"
                checked={formData.idle}
                onChange={handleChange}
                {...helpProps("idle")}
              />
            </div>

            <div className="form-group">
              <label
                htmlFor="isCooked"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                Cuisiné / Cuit
                <span className="help-icon-wrapper">
                  <span className="help-icon-info">?</span>
                  <div className="tooltip-popup">
                    Si coché, la commande ne pourra pas être annulée une fois
                    préparée (perte de nourriture fraîche).
                  </div>
                </span>
              </label>
              <input
                type="checkbox"
                id="isCooked"
                name="isCooked"
                checked={formData.isCooked}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">URL de l'image</label>
            <input
              type="text"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              {...helpProps("image")}
            />
          </div>

          <div className="form-group">
            <label>Ou importer une image</label>
            <button
              type="button"
              className="btn-upload"
              onClick={triggerFileInput}
            >
              <Upload size={18} />
              <span>Choisir une image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
              aria-hidden="true"
            />
            {formData.imageUrl && (
              <div className="image-preview">
                <img
                  src={
                    formData.imageUrl?.startsWith("http") ||
                    formData.imageUrl?.startsWith("data:")
                      ? formData.imageUrl
                      : `${API_URL}${formData.imageUrl}`
                  }
                  alt="Aperçu"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "200px",
                    borderRadius: "8px",
                  }}
                />
                <button
                  type="button"
                  className="btn-remove-image"
                  onClick={() =>
                    setFormData((prev) =>
                      prev ? { ...prev, imageUrl: "" } : null,
                    )
                  }
                >
                  ✕ Supprimer
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Décrivez votre produit..."
              rows={4}
              {...helpProps("description")}
            />
          </div>

          <div className="modal-footer" {...helpProps("actions")}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} />
              <span>Enregistrer</span>
            </button>
          </div>
        </form>

        <HelpModal
          page="editProduct"
          isOpen={isHelpOpen == true}
          onOpen={() => setIsHelpOpen(true)}
          onClose={() => setIsHelpOpen(false)}
        />
      </div>
    </div>
  );
};

export default EditProductModal;
