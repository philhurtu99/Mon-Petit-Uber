import React, { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle, ShoppingCart, Plus, X, Edit2, Trash2, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LegendHelpPopup, type LegendItem } from "../../components/LegendHelpPopup";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import EditPromotionModal from "../../components/admin/Edit/EditPromotionModal";
import "./promotions.css";
import { promotionService, type Promotion, type CreatePromotionPayload, type Product, type UpdatePromotionPayload } from "../../services/promotionService";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

type FormDataType = {
  name: string;
  description: string;
  type: string;
  targetProductId: string;
  bonusProductId: string;
  quantity: string;
  bonusQuantity: string;
  startDate: string;
  endDate: string;
};

const PromotionsAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormDataType>(() => {
    const saved = localStorage.getItem("promotionFormData");
    if (saved) {
      try {
        const { formData } = JSON.parse(saved);
        return formData;
      } catch (e) {
        return {
          name: "",
          description: "",
          type: "BUY_X_GET_Y",
          targetProductId: "",
          bonusProductId: "",
          quantity: "",
          bonusQuantity: "1",
          startDate: "",
          endDate: "",
        };
      }
    }
    return {
      name: "",
      description: "",
      type: "BUY_X_GET_Y",
      targetProductId: "",
      bonusProductId: "",
      quantity: "",
      bonusQuantity: "1",
      startDate: "",
      endDate: "",
    };
  });

  const [targetProductName, setTargetProductName] = useState<string | null>(() => {
    const saved = localStorage.getItem("promotionFormData");
    if (saved) {
      try {
        const { targetProductName } = JSON.parse(saved);
        return targetProductName || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [bonusProductName, setBonusProductName] = useState<string | null>(() => {
    const saved = localStorage.getItem("promotionFormData");
    if (saved) {
      try {
        const { bonusProductName } = JSON.parse(saved);
        return bonusProductName || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [showLegend, setShowLegend] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<{ id: number; name: string } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [promotionToEdit, setPromotionToEdit] = useState<Promotion | null>(null);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol 
  const { helpProps } = useHelpSystem();

  // Configuration de la légende
  const legendItems: LegendItem[] = [
    {
      label: "Type de promotion",
      description: 'Choisissez entre "X pour Y" (ex: achetez 2, payez 1) ou "Autre article gratuit" (ex: acheter 1 produit reçoit un autre gratuit)',
      isRequired: true,
    },
    {
      label: "Produit cible",
      description: "Le produit principal sur lequel porte la promotion",
      isRequired: true,
    },
    {
      label: "Quantité à acheter (BUY_X_GET_Y)",
      description: "Le nombre d'articles que le client doit acheter (ex: achetez 3)",
      isRequired: true,
    },
    {
      label: "Quantité à payer (BUY_X_GET_Y)",
      description: "Le nombre d'articles que le client paiera (ex: pour 'achetez 3 payez 1', entrez 1)",
      isRequired: true,
    },
    {
      label: "Quantité requise (FREE_ITEM)",
      description: "Nombre d'articles à acheter pour recevoir le produit bonus gratuit (ex: 3 articles achetés = 1 offert)",
      isRequired: true,
    },
    {
      label: "Produit bonus",
      description: "L'article gratuit offert avec l'achat du produit cible",
      isRequired: true,
    },
    {
      label: "Date de fin",
      description: "La date d'expiration de la promotion (doit être future)",
      isRequired: true,
    },
  ];

  // Charger les promotions et produits
  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  // Mémoriser l'état du formulaire dans localStorage quand il change
  useEffect(() => {
    localStorage.setItem("promotionFormData", JSON.stringify({
      formData,
      targetProductName,
      bonusProductName
    }));
  }, [formData, targetProductName, bonusProductName]);

  // Récupérer le produit sélectionné depuis l'inventaire admin
  useEffect(() => {
    const selectedProductId = searchParams.get("selectedProduct");
    const mode = localStorage.getItem("promotionSelectionMode");
    
    if (selectedProductId && mode && products.length > 0) {
      const productId = parseInt(selectedProductId);
      const product = products.find(p => p.id === productId);
      
      if (product) {
        if (mode === "target") {
          setFormData(prev => ({ ...prev, targetProductId: productId.toString() }));
          setTargetProductName(product.name);
        } else if (mode === "bonus") {
          setFormData(prev => ({ ...prev, bonusProductId: productId.toString() }));
          setBonusProductName(product.name);
        }
        
        // Nettoyer le localStorage et les query params
        localStorage.removeItem("promotionSelectionMode");
        window.history.replaceState({}, document.title, "/admin/promotions");
      }
    }
  }, [searchParams, products]);

  const fetchPromotions = async () => {
    try {
      const data = await promotionService.getAllPromotions();
      setPromotions(data);
    } catch (err) {
      setError("Impossible de charger les promotions");
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await promotionService.getAllProducts();
      setProducts(data);
    } catch (err) {
      console.error("Erreur produits:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNavigateToInventory = (productIds: number[]) => {
    const validIds = productIds.filter(id => id > 0);
    if (validIds.length === 0) return;
    
    const params = new URLSearchParams();
    validIds.forEach(id => params.append("product", id.toString()));
    navigate(`/admin/inventory?${params.toString()}`);
  };

  const handleSelectTargetProduct = () => {
    localStorage.setItem("promotionSelectionMode", "target");
    navigate("/admin/inventory?selectionMode=promotion&mode=target");
  };

  const handleSelectBonusProduct = () => {
    localStorage.setItem("promotionSelectionMode", "bonus");
    navigate("/admin/inventory?selectionMode=promotion&mode=bonus");
  };

  const clearTargetProduct = () => {
    setFormData(prev => ({ ...prev, targetProductId: "" }));
    setTargetProductName(null);
  };

  const clearBonusProduct = () => {
    setFormData(prev => ({ ...prev, bonusProductId: "" }));
    setBonusProductName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: CreatePromotionPayload = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type as "BUY_X_GET_Y" | "FREE_ITEM",
        targetProductId: parseInt(formData.targetProductId),
        bonusProductId: formData.bonusProductId ? parseInt(formData.bonusProductId) : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        bonusQuantity: parseInt(formData.bonusQuantity),
        startDate: formData.startDate || null,
        endDate: formData.endDate,
      };

      await promotionService.createPromotion(payload);

      setSuccess("Promotion créée avec succès !");
      setFormData({
        name: "",
        description: "",
        type: "BUY_X_GET_Y",
        targetProductId: "",
        bonusProductId: "",
        quantity: "",
        bonusQuantity: "1",
        startDate: "",
        endDate: "",
      });

      // Recharger les promotions
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromotion = (promotionId: number, promotionName: string) => {
    setPromotionToDelete({ id: promotionId, name: promotionName });
    setDeleteModalOpen(true);
  };

  const confirmDeletePromotion = async () => {
    if (!promotionToDelete) return;

    try {
      setLoading(true);
      await promotionService.deletePromotion(promotionToDelete.id);
      setSuccess("Promotion supprimée avec succès !");
      setDeleteModalOpen(false);
      setPromotionToDelete(null);
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setPromotionToEdit(promotion);
    setEditModalOpen(true);
  };

  const handleSaveEditPromotion = async (
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
    setEndDateError: (msg: string) => void
  ) => {
    // Validation
    if (!payload.name.trim()) {
      setNameError("Le nom de la promotion est requis");
      return;
    }

    if (!payload.endDate) {
      setEndDateError("La date de fin est requise");
      return;
    }

    // Appel au service de mise à jour
    (async () => {
      try {
        setLoading(true);
        if (!promotionToEdit) return;

        const updatePayload: UpdatePromotionPayload = {
          name: payload.name,
          description: payload.description || null,
          type: payload.type,
          targetProductId: payload.targetProductId,
          bonusProductId: payload.bonusProductId || null,
          quantity: payload.quantity || null,
          bonusQuantity: payload.bonusQuantity,
          startDate: payload.startDate || null,
          endDate: payload.endDate,
          isActive: payload.isActive,
        };

        await promotionService.updatePromotion(promotionToEdit.id, updatePayload);
        setSuccess("Promotion modifiée avec succès !");
        setEditModalOpen(false);
        setPromotionToEdit(null);
        await fetchPromotions();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la modification");
      } finally {
        setLoading(false);
      }
    })();
  };

  // Filtrer et trier les promotions
  const filteredPromotions = promotions
    .filter((promo) => {
      const matchesSearch = promo.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === "ALL" || promo.type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      } else {
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      }
    });
      
  return (
    <div className="promotions">
      <h1>Gestion des Promotions</h1>

      {/* Composant d'aide réutilisable */}
      <LegendHelpPopup
        isOpen={showLegend}
        onClose={() => setShowLegend(false)}
        onToggle={() => setShowLegend(!showLegend)}
        title="Légende des champs"
        items={legendItems}
      />

      <div className="container">
        {/* Formulaire à gauche */}
        <div className="formSection">
          <h2>Créer une promotion</h2>

          {error && (
            <div className="alert alertError">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="alert alertSuccess">
              <CheckCircle size={20} />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="formGroup">
              <label>Nom de la promotion *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Ex: 2 pour 1"
                {...helpProps("name")} 
              />
            </div>

            <div className="formGroup">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Détails de la promotion"
                rows={3}
                {...helpProps("description")} 
              />
            </div>

            <div className="formGroup">
              <label>Type de promotion <span style={{ color: "red" }}>*</span></label>
              <select name="type" value={formData.type} onChange={handleInputChange} {...helpProps("type")} >
                <option value="BUY_X_GET_Y">X pour Y</option>
                <option value="FREE_ITEM">Autre article gratuit</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Produit cible <span style={{ color: "red" }}>*</span></label>
              <div className="productSelector" {...helpProps("targetProduct")} >
                {targetProductName ? (
                  <div className="selectedProduct">
                    <span>{targetProductName}</span>
                    <button type="button" onClick={clearTargetProduct} className="clearBtn" title="Effacer">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="noSelection">Aucun produit sélectionné</p>
                )}
                <button
                  type="button"
                  onClick={handleSelectTargetProduct}
                  className="selectProductBtn"
                >
                  <ShoppingCart size={16} />
                  {targetProductName ? "Changer de produit" : "Sélectionner un produit"}
                </button>
              </div>
            </div>

            {formData.type === "BUY_X_GET_Y" && (
              <>
                <div className="formGroup">
                  <label>Quantité à acheter <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Ex: 3"
                    {...helpProps("qtyPromotion")}
                  />
                </div>

                <div className="formGroup">
                  <label>Quantité à payer <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="number"
                    name="bonusQuantity"
                    value={formData.bonusQuantity}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Ex: 1"
                    {...helpProps("qtyPromotion")}
                  />
                </div>
              </>
            )}

            {formData.type === "FREE_ITEM" && (
              <>
                <div className="formGroup">
                  <label>Quantité requise <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Ex: 3 (pour '3 achetés 1 offert')"
                    required
                    {...helpProps("qtyPromotion")}
                  />
                </div>

                <div className="formGroup">
                  <label>Produit bonus <span style={{ color: "red" }}>*</span></label>
                  <div className="productSelector">
                    {bonusProductName ? (
                      <div className="selectedProduct">
                        <span>{bonusProductName}</span>
                        <button type="button" onClick={clearBonusProduct} className="clearBtn" title="Effacer">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <p className="noSelection">Aucun produit sélectionné</p>
                    )}
                    <button
                      type="button"
                      onClick={handleSelectBonusProduct}
                      className="selectProductBtn"
                    >
                      <ShoppingCart size={16} />
                      {bonusProductName ? "Changer de produit" : "Sélectionner un produit"}
                    </button>
                  </div>
                </div>

                <div className="formGroup">
                  <label>Quantité bonus</label>
                  <input
                    type="number"
                    name="bonusQuantity"
                    value={formData.bonusQuantity}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="1"
                    {...helpProps("qtyPromotion")}
                  />
                </div>
              </>
            )}

            <div className="formGroup">
              <label>Date de début</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                {...helpProps("dates")}
              />
            </div>

            <div className="formGroup">
              <label>Date de fin *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
                {...helpProps("dates")}
              />
            </div>

            <button type="submit" disabled={loading} className="submitBtn" {...helpProps("createPromotion")}>
              <Save size={20} />
              {loading ? "En cours..." : "Créer la promotion"}
            </button>
          </form>
        </div>

        {/* Liste à droite */}
        <div className="listSection">
          <h2>Promotions existantes ({filteredPromotions.length})</h2>

          {/* Barre de recherche et filtres */}
          <div className="searchFilterBar" {...helpProps("filters")}>
            <div className="searchBox">
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="searchInput"
                {...helpProps("filter")}
              />
            </div>

            <div className="filterBox">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filterSelect"
              >
                <option value="ALL">Tous les types</option>
                <option value="BUY_X_GET_Y">Achetez X payez Y</option>
                <option value="FREE_ITEM">Article gratuit</option>
              </select>
            </div>

            <div className="sortBox">
              <button
                type="button"
                className="sortBtn"
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                title={sortOrder === "newest" ? "Tri: Plus récentes" : "Tri: Plus anciennes"}
              >
                <Clock size={16} />
                {sortOrder === "newest" ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronUp size={16} />
                )}
              </button>
            </div>
          </div>

          {filteredPromotions.length === 0 ? (
            <p className="empty">{promotions.length === 0 ? "Aucune promotion pour le moment" : "Aucune promotion ne correspond à votre recherche"}</p>
          ) : (
            <div className="promotionsList" {...helpProps("promotions")}>
              {filteredPromotions.map((promo) => (
                <article key={promo.id} className={`promotionCard ${promo.type === "BUY_X_GET_Y" ? "cardBuyXGetY" : "cardFreeItem"}`}>
                  <div className="cardHeader">
                    <h3>{promo.name}</h3>
                    <div className="cardActions">
                      <button
                        type="button"
                        className="editBtn"
                        title="Éditer la promotion"
                        onClick={() => handleEditPromotion(promo)}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        type="button"
                        className="deleteBtn"
                        title="Supprimer la promotion"
                        onClick={() => handleDeletePromotion(promo.id, promo.name)}
                        disabled={loading}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {promo.description && <p className="description">{promo.description}</p>}
                  <div className="details">
                    <div>
                      <strong>Type:</strong> {promo.type === "BUY_X_GET_Y" ? "Achetez X, payez Y" : "Article gratuit"}
                    </div>
                    <div>
                      <strong>Produit:</strong> {promo.targetProduct?.name}
                    </div>
                    {promo.type === "FREE_ITEM" && promo.bonusProduct && (
                      <div>
                        <strong>Bonus:</strong> {promo.bonusProduct.name}
                      </div>
                    )}
                    <div>
                      <strong>Fin:</strong> {new Date(promo.endDate).toLocaleDateString("fr-FR")}
                    </div>
                    <div className={promo.isActive ? "active" : "inactive"}>
                      {promo.isActive ? "✓ Active" : "✗ Inactive"}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <DeleteConfirm
        isOpen={deleteModalOpen}
        itemName={promotionToDelete?.name || ""}
        onClose={() => {
          setDeleteModalOpen(false);
          setPromotionToDelete(null);
        }}
        onConfirm={confirmDeletePromotion}
        isLoading={loading}
      />

      {/* Modal d'édition de promotion */}
      <EditPromotionModal
        isOpen={editModalOpen}
        promotion={promotionToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setPromotionToEdit(null);
        }}
        onSave={handleSaveEditPromotion}
      />
    </div>
  );
};

export default PromotionsAdmin;
