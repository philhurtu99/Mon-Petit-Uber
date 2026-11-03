import React, { useEffect, useState } from "react";
import { Edit2, Trash2, Plus } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./AdminInventory.css";
import AddProductModal from "../../components/admin/Add/AddProductModal";
import EditProductModal from "../../components/admin/Edit/EditProductModal";
import DeleteProductModal from "../../components/admin/Delete/DeleteProductModal";
import EditCategoryModal from "../../components/admin/Edit/EditCategoryModal";
import AddCategoryModal from "../../components/admin/Add/AddCategoryModal";
import ConfirmationModal from "../../components/Notifications-Success/ConfirmationModal";
import CategorySuccessModal from "../../components/Notifications-Success/CategorySuccessModal";
import CategoryErrorModal from "../../components/Notifications-Error/CategoryErrorModal";
import {
  mapBackendError,
  applyError,
} from "../../components/Notifications-Error/errorMapper";
import { API_URL } from "../../config";
import { FilterSearch } from "../../components/filterSearch";
import { categoryService } from "../../services/categoryService";
import { productService } from "../../services/productService";
import type { Product, Category } from "../../models";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

// ── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Détermine si une couleur hex est foncée
 * Utilise la luminance perçue (WCAG)
 */
const isDarkColor = (hex: string): boolean => {
  // Supprimer le # s'il existe
  const color = hex.replace("#", "");

  // Convertir en RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculer la luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Si la luminance est < 0.5, c'est une couleur foncée
  return luminance < 0.5;
};

// ── Product Card Component ──────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isHighlighted?: boolean;
  isSelectionMode?: boolean;
  onSelectForPromotion?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  isHighlighted = false,
  isSelectionMode = false,
  onSelectForPromotion,
}) => {
  const stockStatus =
    product.stock > 50 ? "high" : product.stock > 20 ? "medium" : "low";

  return (
    <article
      className={`product-card stock-${stockStatus} ${product.idle ? "product-inactive" : ""} ${isHighlighted ? "product-highlighted" : ""}`}
    >
      {/* Product image container */}
      <div className="product-image">
        <img
          src={
            product.imageUrl?.startsWith("http")
              ? product.imageUrl
              : `${API_URL}${product.imageUrl}?t=${Date.now()}`
          }
          alt={product.name}
          style={{ opacity: product.idle ? 0.5 : 1 }}
        />

        {product.idle && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.4)",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              borderRadius: "4px",
            }}
          >
            INACTIF
          </div>
        )}
        <div className="stock-badge">
          <span className={`stock-indicator ${stockStatus}`}></span>
          <span className="stock-text">{product.stock} unités</span>
        </div>
      </div>

      {/* Card body */}
      <div className="product-body">
        {/* Header with name and category */}
        <div className="product-header">
          <h2 className="product-name">{product.name}</h2>
          <span
            className="category-badge"
            style={{ backgroundColor: product.categoryColor }}
          >
            {product.category}
          </span>
        </div>

        {/* Product details */}
        <div className="product-details">
          <div className="detail-row">
            <span className="detail-label">Prix :</span>
            <span className="detail-value price">
              {(product.sale ?? 0) > 0 ? (
                <>
                  <span
                    style={{
                      textDecoration: "line-through",
                      color: "#888",
                      fontSize: "0.9em",
                      marginRight: "8px",
                    }}
                  >
                    {product.price} $
                  </span>
                  <span style={{ color: "#88c057", fontWeight: "bold" }}>
                    {product.finalPrice ?? product.price} $
                  </span>
                  <span
                    style={{
                      marginLeft: "8px",
                      backgroundColor: "#ffebee",
                      color: "#d32f2f",
                      padding: "2px 6px",
                      borderRadius: "12px",
                      fontSize: "0.75em",
                      fontWeight: "bold",
                    }}
                  >
                    -{product.sale}%
                  </span>
                </>
              ) : (
                `${product.price} $`
              )}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Stock :</span>
            <span className={`detail-value stock stock-${stockStatus}`}>
              {product.stock}
            </span>
          </div>
          <div className="detail-row description-row">
            <span className="detail-label">Description :</span>
            <span className="detail-value description-text">
              {product.description}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="product-actions">
          {isSelectionMode ? (
            <button
              className="action-btn select-btn"
              onClick={() => onSelectForPromotion?.(product)}
              aria-label={`Sélectionner ${product.name}`}
              title="Sélectionner ce produit pour la promotion"
            >
              <Plus size={18} />
              <span>Sélectionner</span>
            </button>
          ) : (
            <>
              <button
                className="action-btn edit-btn"
                onClick={() => onEdit(product.id)}
                aria-label={`Modifier ${product.name}`}
                title="Modifier le produit"
              >
                <Edit2 size={18} />
                <span>Éditer</span>
              </button>
              <button
                className="action-btn delete-btn"
                onClick={() => onDelete(product.id)}
                aria-label={`Supprimer ${product.name}`}
                title="Supprimer le produit"
              >
                <Trash2 size={18} />
                <span>Supprimer</span>
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

// ── Main Inventory Management Component ──────────────────────────────────────────

const InventoryManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [backendCategories, setBackendCategories] = useState<Category[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [highlightedProductIds, setHighlightedProductIds] = useState<
    Set<number>
  >(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"target" | "bonus" | null>(
    null,
  );

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const { helpProps } = useHelpSystem();

  // Récupérer les IDs de produits à mettre en évidence depuis les query params
  useEffect(() => {
    const productIds = searchParams.getAll("product").map((id) => parseInt(id));
    setHighlightedProductIds(new Set(productIds));

    // Vérifier si on est en mode sélection
    const selMode = searchParams.get("selectionMode");
    const mode = searchParams.get("mode") as "target" | "bonus" | null;
    setIsSelectionMode(selMode === "promotion");
    setSelectionMode(mode);
  }, [searchParams]);

  // Category modal states
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] =
    useState<Category | null>(null);

  // Success modal state
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    productService
      .getAll()
      .then((data) => setProducts(data))
      .catch((err) => console.error("Error:", err));
  }, []);

  useEffect(() => {
    categoryService
      .getAll()
      .then((data) => setBackendCategories(data))
      .catch((err) => console.error("Error loading categories:", err));
  }, []);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading?: boolean;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Handle add product
  const handleAddProduct = () => {
    setIsAddModalOpen(true);
  };

  const handleAddProductConfirm = (
    newProduct: FormData,
    setNameError: (msg: string) => void,
    setPriceError: (msg: string) => void,
    setStockError: (msg: string) => void,
    setSaleError: (msg: string) => void,
  ) => {
    productService.create(newProduct).then(({ status, data }) => {
      if (status === 409 || status === 400) {
        const errorMapping = mapBackendError(data.message);
        applyError(
          errorMapping,
          setNameError,
          setPriceError,
          setStockError,
          setSaleError,
        );
        return;
      }
      //refresh list
      setIsAddModalOpen(false);
      setSelectedProduct(null);
      productService.getAll().then((data) => setProducts(data));
    });
  };

  // Handle edit product
  const handleEdit = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      setSelectedProduct(product);
      setIsEditModalOpen(true);
    }
  };

  const handleEditProductConfirm = (
    updatedProduct: FormData,
    setNameError: (msg: string) => void,
    setPriceError: (msg: string) => void,
    setStockError: (msg: string) => void,
    setSaleError: (msg: string) => void,
  ) => {
    const id = selectedProduct!.id;
    productService.update(id, updatedProduct).then(({ status, data }) => {
      if (status === 409 || status === 400) {
        const errorMapping = mapBackendError(data.message);
        applyError(
          errorMapping,
          setNameError,
          setPriceError,
          setStockError,
          setSaleError,
        );
        return;
      }
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      productService.getAll().then((data) => setProducts(data));
    });
  };

  // Handle delete product
  const handleDeleteClick = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      setSelectedProduct(product);
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteProductConfirm = () => {
    if (selectedProduct) {
      productService
        .remove(selectedProduct.id)
        .then(({ status, data }) => {
          if (status === 200 || status === 204) {
            productService.getAll().then((data) => setProducts(data));

            // Show success modal
            setSuccessModal({
              isOpen: true,
              title: "Produit supprimé !",
              message: `Le produit "${selectedProduct.name}" a été supprimé avec succès.`,
            });

            // Auto-close after 3 seconds
            setTimeout(() => {
              setSuccessModal((prev) => ({ ...prev, isOpen: false }));
            }, 3000);
          } else {
            const errorMessage =
              data.message ||
              "Une erreur s'est produite lors de la suppression du produit.";
            setErrorModal({
              isOpen: true,
              title: "Erreur lors de la suppression",
              message: errorMessage,
            });

            // Auto-close after 4 seconds
            setTimeout(() => {
              setErrorModal((prev) => ({ ...prev, isOpen: false }));
            }, 4000);
          }
        })
        .catch((err) => {
          console.error("Erreur suppression produit:", err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Une erreur inattendue s'est produite.";
          setErrorModal({
            isOpen: true,
            title: "Erreur système",
            message: errorMessage,
          });

          // Auto-close after 4 seconds
          setTimeout(() => {
            setErrorModal((prev) => ({ ...prev, isOpen: false }));
          }, 4000);
        })
        .finally(() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        });
    }
  };

  // Handle edit category
  const handleEditCategory = (category: Category) => {
    setSelectedCategoryForEdit(category);
    setIsEditCategoryModalOpen(true);
  };

  const handleEditCategoryConfirm = async (updatedCategory: Category) => {
    try {
      const { status, data } = await categoryService.update(updatedCategory);

      if (status === 200 || status === 204) {
        // Update backend categories list
        setBackendCategories(
          backendCategories.map((cat) =>
            cat.id === updatedCategory.id ? updatedCategory : cat,
          ),
        );
        setIsEditCategoryModalOpen(false);
        setSelectedCategoryForEdit(null);

        // Show success modal
        setSuccessModal({
          isOpen: true,
          title: "Catégorie modifiée !",
          message: `La catégorie "${updatedCategory.name}" a été modifiée avec succès.`,
        });

        // Auto-close after 3 seconds
        setTimeout(() => {
          setSuccessModal((prev) => ({ ...prev, isOpen: false }));
        }, 3000);
      } else {
        // Use backend error message
        const errorMessage =
          data.message ||
          "Une erreur s'est produite lors de la modification de la catégorie.";
        setErrorModal({
          isOpen: true,
          title: "Erreur lors de la modification",
          message: errorMessage,
        });

        // Auto-close after 4 seconds
        setTimeout(() => {
          setErrorModal((prev) => ({ ...prev, isOpen: false }));
        }, 4000);
      }
    } catch (error) {
      console.error("Erreur:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue s'est produite.";
      setErrorModal({
        isOpen: true,
        title: "Erreur système",
        message: errorMessage,
      });

      // Auto-close after 4 seconds
      setTimeout(() => {
        setErrorModal((prev) => ({ ...prev, isOpen: false }));
      }, 4000);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    const category = backendCategories.find((cat) => cat.id === categoryId);
    if (!category) {
      return;
    }

    // Show confirmation modal
    setConfirmationModal({
      isOpen: true,
      title: "Supprimer la catégorie",
      message: `Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ? Cette action ne peut pas être annulée.`,
      isDangerous: true,
      onConfirm: async () => {
        setConfirmationModal((prev) => ({ ...prev, isLoading: true }));
        try {
          const { status, data } = await categoryService.remove(categoryId);
          console.log("Delete response:", status, data);
          if (status === 200 || status === 204) {
            console.log("Category deleted successfully");
            // Supprimer la catégorie de la liste locale
            setBackendCategories((prevCategories) =>
              prevCategories.filter((cat) => cat.id !== categoryId),
            );
            setIsEditCategoryModalOpen(false);
            setSelectedCategoryForEdit(null);
            setSelectedCategory(null);
            setConfirmationModal((prev) => ({
              ...prev,
              isOpen: false,
              isLoading: false,
            }));

            // Show success modal
            setSuccessModal({
              isOpen: true,
              title: "Catégorie supprimée !",
              message: `La catégorie "${category.name}" a été supprimée avec succès.`,
            });

            // Auto-close after 3 seconds
            setTimeout(() => {
              setSuccessModal((prev) => ({ ...prev, isOpen: false }));
            }, 3000);
          } else {
            console.error("Erreur lors de la suppression de la catégorie");
            const errorMessage =
              data.message ||
              "Une erreur s'est produite lors de la suppression de la catégorie.";
            setConfirmationModal((prev) => ({
              ...prev,
              isOpen: false,
              isLoading: false,
            }));
            setErrorModal({
              isOpen: true,
              title: "Erreur lors de la suppression",
              message: errorMessage,
            });

            // Auto-close after 4 seconds
            setTimeout(() => {
              setErrorModal((prev) => ({ ...prev, isOpen: false }));
            }, 4000);
          }
        } catch (error) {
          console.error("Erreur:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Une erreur inattendue s'est produite.";
          setConfirmationModal((prev) => ({
            ...prev,
            isOpen: false,
            isLoading: false,
          }));
          setErrorModal({
            isOpen: true,
            title: "Erreur système",
            message: errorMessage,
          });

          // Auto-close after 4 seconds
          setTimeout(() => {
            setErrorModal((prev) => ({ ...prev, isOpen: false }));
          }, 4000);
        }
      },
    });
  };

  // Handle add category
  const handleAddCategoryConfirm = async (name: string, color: string) => {
    try {
      const { status, data } = await categoryService.create(name, color);

      if (status === 201 || status === 200) {
        // Ajouter la nouvelle catégorie à la liste
        setBackendCategories([...backendCategories, data.category]);
        setIsAddCategoryModalOpen(false);

        // Show success modal
        setSuccessModal({
          isOpen: true,
          title: "Catégorie créée !",
          message: `La catégorie "${name}" a été créée avec succès.`,
        });

        // Auto-close after 3 seconds
        setTimeout(() => {
          setSuccessModal((prev) => ({ ...prev, isOpen: false }));
        }, 3000);
      } else {
        // Use backend error message
        const errorMessage =
          data.message ||
          "Une erreur s'est produite lors de la création de la catégorie.";
        setErrorModal({
          isOpen: true,
          title: "Erreur lors de la création",
          message: errorMessage,
        });

        // Auto-close after 4 seconds
        setTimeout(() => {
          setErrorModal((prev) => ({ ...prev, isOpen: false }));
        }, 4000);
      }
    } catch (error) {
      console.error("Erreur:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue s'est produite.";
      setErrorModal({
        isOpen: true,
        title: "Erreur système",
        message: errorMessage,
      });

      // Auto-close after 4 seconds
      setTimeout(() => {
        setErrorModal((prev) => ({ ...prev, isOpen: false }));
      }, 4000);
    }
  };

  // Fonction pour sélectionner un produit en mode sélection
  const handleSelectProductForPromotion = (product: Product) => {
    if (isSelectionMode && selectionMode) {
      navigate(
        `/admin/promotions?selectedProduct=${product.id}&mode=${selectionMode}`,
        { replace: true },
      );
    }
  };

  return (
    <div className="inventory-wrapper">
      {/* Main Content */}
      <div className="inventory-main">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Gestion d'Inventaire</h2>
            <p className="page-subtitle">
              Gérez vos produits et stocks facilement
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn-primary"
              onClick={() => setIsAddCategoryModalOpen(true)}
              {...helpProps("addCategory")}
            >
              <Plus size={20} />
              <span>Ajouter Catégorie</span>
            </button>
            <button
              className="btn-primary"
              onClick={handleAddProduct}
              {...helpProps("addProduct")}
            >
              <Plus size={20} />
              <span>Ajouter Produit</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Section */}
        <div {...helpProps("searchFilter")}>
          <FilterSearch
            products={products}
            displayedProducts={displayedProducts}
            setDisplayedProducts={setDisplayedProducts}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            isForClient={false}
            showUnavailable={true}
          />
        </div>

        {/* Product Grid */}
        <section className="products-grid" {...helpProps("list")}>
          {displayedProducts.length > 0 ? (
            displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                isHighlighted={highlightedProductIds.has(product.id)}
                isSelectionMode={isSelectionMode}
                onSelectForPromotion={handleSelectProductForPromotion}
              />
            ))
          ) : (
            <div className="no-products">
              <p>Aucun produit trouvé</p>
              <p className="no-products-hint">
                Essayez de modifier votre recherche ou vos filtres
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProductConfirm}
        categories={backendCategories}
      />
      <EditProductModal
        isOpen={isEditModalOpen}
        product={selectedProduct}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={handleEditProductConfirm}
      />
      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        productName={selectedProduct?.name || ""}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleDeleteProductConfirm}
      />
      <EditCategoryModal
        isOpen={isEditCategoryModalOpen}
        category={selectedCategoryForEdit}
        onClose={() => {
          setIsEditCategoryModalOpen(false);
          setSelectedCategoryForEdit(null);
        }}
        onSave={handleEditCategoryConfirm}
      />
      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        onSave={handleAddCategoryConfirm}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        isDangerous={confirmationModal.isDangerous}
        isLoading={confirmationModal.isLoading}
        onConfirm={confirmationModal.onConfirm}
        onCancel={() =>
          setConfirmationModal((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Success Modal for Category */}
      <CategorySuccessModal
        isOpen={successModal.isOpen}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Error Modal for Category */}
      <CategoryErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default InventoryManagement;
