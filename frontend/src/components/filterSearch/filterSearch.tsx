import React, { useEffect, useMemo, useState } from "react";
import { Edit2, Search, Trash2 } from "lucide-react";
import "./filterSearch.css";
import {
  type StatusType,
  type SortOrderType,
  STATUS,
  SORT_ORDER,
  API_URL,
  AVAILABILITY,
  type AvailabilityType,
} from "../../config";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import type { Product } from "../../models";
import { useSearchParams } from "react-router-dom";

interface Category {
  id: number;
  name: string;
  color: string;
}

const noopCategoryAction = () => {};

export interface filterSearchProps {
  products: Product[];
  displayedProducts: Product[];
  setDisplayedProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (id: number) => void;
  isForClient: boolean;
  showUnavailable: boolean;
}

export function FilterSearch({
  products,
  setDisplayedProducts,
  onEditCategory = noopCategoryAction,
  onDeleteCategory = noopCategoryAction,
  isForClient,
  showUnavailable  
}: filterSearchProps) {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrderType>(
    SORT_ORDER.CROISSANT,
  );
  const [statusFilter, setStatusFilter] = useState<StatusType>(STATUS.ACTIVE);
  const [backendCategories, setBackendCategories] = useState<Category[]>([]);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] =
    useState<Category | null>(null);
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityType>(AVAILABILITY.AVAILABLE);

  const selectedCategoryData = backendCategories.find(
    (c) => c.name === selectedCategory,
  );

  // verifier si le drapeau 'showUnavailable' est activé ou pas
  useEffect(() => {
    setAvailabilityFilter(
      showUnavailable ? AVAILABILITY.UNAVILABLE : AVAILABILITY.AVAILABLE
    );
  }, [showUnavailable]);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query !== null) {
      setSearchTerm(query);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch(API_URL + "/api/category/getAll")
      .then((res) => res.json())
      .then((data) => setBackendCategories(data))
      .catch((err) => console.error("Error loading categories:", err));
  }, []);

  // Filter products based on search, category, and status
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategory || product.category === selectedCategory;
      const matchesStatus =
        (isForClient &&
          (availabilityFilter === AVAILABILITY.ALL ||
            (availabilityFilter === AVAILABILITY.AVAILABLE &&
              product.stock > 0) ||
            (availabilityFilter === AVAILABILITY.UNAVILABLE &&
              product.stock == 0))) ||
        (!isForClient &&
          (statusFilter === STATUS.ALL ||
            (statusFilter === STATUS.ACTIVE && !product.idle) ||
            (statusFilter === STATUS.INACTIVE && product.idle)));

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [
    products,
    searchTerm,
    selectedCategory,
    isForClient,
    statusFilter,
    availabilityFilter,
  ]);

  // Sort (alphabetical) après filtrage
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      return sortOrder === SORT_ORDER.CROISSANT ? cmp : -cmp;
    });
  }, [filteredProducts, sortOrder]);

  // mémoriser les produits filtrés à afficher
  useEffect(() => {
    setDisplayedProducts(sortedProducts);
  }, [setDisplayedProducts, sortedProducts]);

  return (
    <div className="filterSearch__wrapper">
      {/* Recherche toujours visible */}
      <div className="filterSearch__search-container">
        <Search style={{ marginRight: "8px", color: "#8DC640" }} />
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filterSearch__search-input"
        />
      </div>

      <Accordion
        className="filterSearch__accordion"
        disableGutters
        elevation={0}
        sx={{
          backgroundColor: "transparent !important",
          color: "#F2F3D9",
          boxShadow: "none",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "#8DC640" }} />}
          sx={{
            padding: "0 10px",
            minHeight: "48px",
            backgroundColor: "transparent !important",
          }}
        >
          <div className="filterSearch__accordion-label">
            <FilterListIcon style={{ marginRight: "10px", color: "#8DC640" }} />
            <span>Filtres et catégories</span>
          </div>
        </AccordionSummary>

        <AccordionDetails
          sx={{
            padding: "10px",
            backgroundColor: "transparent !important", // Suppression du fond mat
          }}
        >
          <div className="filterSearch__filters-section">
            <div className="filterSearch__filter-buttons filterSearch__line row">
              <label className="filterSearch__label col-3">Catégories</label>
              <div className={isForClient ? "col-10" : "col-8"}>
                <button
                  className={`filterSearch__filter-btn ${!selectedCategory ? "active" : ""}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  Tous ({products.length})
                </button>
                {backendCategories.map((category) => (
                  <button
                    key={category.id}
                    className={`filterSearch__filter-btn ${selectedCategory === category.name ? "active" : ""}`}
                    onClick={() => setSelectedCategory(category.name)}
                    style={{
                      backgroundColor:
                        selectedCategory === category.name
                          ? category.color
                          : "transparent",
                      borderColor: category.color,
                      color:
                        selectedCategory === category.name
                          ? isDarkColor(category.color)
                            ? "#ffffff"
                            : "#000000"
                          : "inherit",
                    }}
                  >
                    {category.name} (
                    {
                      products.filter((p) => p.category === category.name)
                        .length
                    }
                    )
                  </button>
                ))}
              </div>

              {!isForClient && selectedCategory && selectedCategoryData && (
                <div className="filterSearch__edition col-2">
                  <button
                    className="filter-btn filterSearch__edit_category"
                    onClick={() => onEditCategory(selectedCategoryData)}
                    style={{
                      backgroundColor: selectedCategoryData.color,
                      borderColor: selectedCategoryData.color,
                      color: isDarkColor(selectedCategoryData.color)
                        ? "#ffffff"
                        : "#000000",
                    }}
                  >
                    <Edit2 size={14} /> <span>Éditer</span>
                  </button>

                  <button
                    className="filter-btn filterSearch__delete_category"
                    onClick={() => {
                      onDeleteCategory(selectedCategoryData.id);
                      setSelectedCategory(null);
                    }}
                  >
                    <Trash2 size={14} /> <span>Supprimer</span>
                  </button>
                </div>
              )}
            </div>

            <div className="filterSearch__filter-buttons row">
              <label className="filterSearch__label col-3">
                {isForClient ? "Disponibilité" : "Statut"}
              </label>
              <div className="col-9">
                {isForClient ? (
                  /* VUE CLIENT */
                  <>
                    <button
                      className={`filterSearch__filter-btn ${availabilityFilter === AVAILABILITY.ALL ? "active" : ""}`}
                      onClick={() => setAvailabilityFilter(AVAILABILITY.ALL)}
                    >
                      Tous
                    </button>
                    <button
                      className={`filterSearch__filter-btn ${availabilityFilter === AVAILABILITY.AVAILABLE ? "active" : ""}`}
                      onClick={() =>
                        setAvailabilityFilter(AVAILABILITY.AVAILABLE)
                      }
                    >
                      ✓ En stock
                    </button>
                    <button
                      className={`filterSearch__filter-btn ${availabilityFilter === AVAILABILITY.UNAVILABLE ? "active" : ""}`}
                      onClick={() =>
                        setAvailabilityFilter(AVAILABILITY.UNAVILABLE)
                      }
                      style={{
                        border:
                          availabilityFilter === AVAILABILITY.UNAVILABLE
                            ? "none"
                            : "",
                        backgroundColor:
                          availabilityFilter === AVAILABILITY.UNAVILABLE
                            ? "#f44336"
                            : "",
                      }}
                    >
                      ✕ Rupture
                    </button>
                  </>
                ) : (
                  /* VUE ADMIN */
                  <>
                    <button
                      className={`filterSearch__filter-btn ${statusFilter === STATUS.ALL ? "active" : ""}`}
                      onClick={() => setStatusFilter(STATUS.ALL)}
                      style={{
                        backgroundColor:
                          statusFilter === STATUS.ALL
                            ? "#3b82f6"
                            : "transparent",
                      }}
                    >
                      Tous les statuts
                    </button>
                    <button
                      className={`filterSearch__filter-btn ${statusFilter === STATUS.ACTIVE ? "active" : ""}`}
                      onClick={() => setStatusFilter(STATUS.ACTIVE)}
                      style={{
                        backgroundColor:
                          statusFilter === STATUS.ACTIVE ? "" : "transparent",
                      }}
                    >
                      ✓ Actifs
                    </button>
                    <button
                      className={`filterSearch__filter-btn ${statusFilter === STATUS.INACTIVE ? "active" : ""}`}
                      onClick={() => setStatusFilter(STATUS.INACTIVE)}
                      style={{
                        backgroundColor:
                          statusFilter === STATUS.INACTIVE
                            ? "#ef4444"
                            : "transparent",
                        border: statusFilter === STATUS.INACTIVE ? "none" : "",
                      }}
                    >
                      ✕ Inactifs
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="filterSearch__sort-row row">
              <label className="filterSearch__label col-3">Trier par</label>
              <div className="col-9">
                <select
                  className="filterSearch__sort-select"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as SortOrderType)
                  }
                >
                  <option value={SORT_ORDER.CROISSANT}>Nom (A → Z)</option>
                  <option value={SORT_ORDER.DECROISSANT}>Nom (Z → A)</option>
                </select>
              </div>
            </div>
          </div>
        </AccordionDetails>
      </Accordion>

      <div className="filterSearch__results-info">
        <p>{filteredProducts.length} produit(s) trouvé(s)</p>
      </div>
    </div>
  );
}

// ── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Détermine si une couleur hex est foncée
 * Utilise la luminance perçue (WCAG)
 */
export const isDarkColor = (hex: string): boolean => {
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
