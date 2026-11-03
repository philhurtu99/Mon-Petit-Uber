import React, { useState, useRef, useEffect } from "react";
import { X, Save, Upload } from "lucide-react";
import "../forms.css";
import HelpModal from "../../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../../helpPage/hooks/useHelpSystem";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    product: FormData,
    setNameError: (msg: string) => void,
    setPriceError: (msg: string) => void,
    setStockError: (msg: string) => void,
    setSaleError: (msg: string) => void,
  ) => void;
  categories: Category[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  categories,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultCategoryId = categories.length > 0 ? categories[0].id : 1;
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: defaultCategoryId,
    imageUrl: "",
    price: "",
    sale: 0,
    stock: 0,
    idle: false,
    isCooked: false,
    description: "",
  });
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const { helpProps } = useHelpSystem();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        categoryId: defaultCategoryId,
        imageUrl: "",
        price: "",
        sale: 0,
        stock: 0,
        idle: false,
        isCooked: false,
        description: "",
      });
      setImageFile(null);
      setNameError(null);
      setPriceError(null);
      setStockError(null);
      setSaleError(null);
    }
  }, [isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    // Empêche d’écrire des décimales avec plus de deux chiffres après la virgule.
    if (name === "price") {
      if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
        setFormData((prev) => ({ ...prev, price: value }));
      }
      setPriceError(null);
      return;
    }
    //
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "stock" || name === "categoryId" || name === "sale"
            ? parseInt(value) || 0
            : value,
    }));
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
        setFormData((prev) => ({
          ...prev,
          imageUrl: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("price", String(parseFloat(formData.price) || 0));
    data.append("sale", String(formData.sale));
    data.append("idle", String(formData.idle));
    data.append("isCooked", String(formData.isCooked));
    data.append("stock", String(formData.stock));
    data.append("categoryId", String(formData.categoryId));

    if (imageFile) {
      data.append("imageUrl", imageFile);
    } else if (formData.imageUrl) {
      data.append("imageUrl", formData.imageUrl);
    } else {
      data.append(
        "imageUrl",
        "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
      );
    }

    onAdd(data, setNameError, setPriceError, setStockError, setSaleError);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajouter un Produit</h2>
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
              onChange={(e) => {
                handleChange(e);
                setNameError(null);
              }}
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
              <div
                className="category-select-wrapper"
                {...helpProps("category")}
              >
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                  className="category-select"
                >
                  {categories.map((cat: Category) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categories.length > 0 && (
                  <div
                    className="category-color-indicator"
                    style={{
                      backgroundColor:
                        categories.find((cat) => cat.id === formData.categoryId)
                          ?.color || "#e0e0e0",
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
                step="0.01"
                min="0"
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
              <label htmlFor="sale">rabais ($) *</label>
              <input
                type="number"
                id="sale"
                name="sale"
                value={formData.sale}
                onChange={handleChange}
                placeholder="0"
                step="1"
                min="0"
                max="90"
                required
                {...helpProps("sale")}
              />
              {saleError && (
                <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                  {saleError}
                </p>
              )}
            </div>

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

          <div className="form-group" {...helpProps("image")}>
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
                  src={formData.imageUrl}
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
                    setFormData((prev) => ({ ...prev, imageUrl: "" }))
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
              <span>Ajouter</span>
            </button>
          </div>
        </form>

        <HelpModal
          page="addProduct"
          isOpen={isHelpOpen == true}
          onOpen={() => setIsHelpOpen(true)}
          onClose={() => setIsHelpOpen(false)}
        />
      </div>
    </div>
  );
};

export default AddProductModal;
