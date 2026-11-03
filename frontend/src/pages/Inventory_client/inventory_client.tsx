import "./inventory_client.css";
import ProductCard from "../../components/card/card";
import { useEffect, useState } from "react";
import PaginationControls from "../../components/pagination/pagination";
import { Box } from "@mui/material";
import { DEFAULT_PAGE, DEFAULT_ROWS_PER_PAGE, API_URL } from "../../config";
import { useCart } from "../../contexts/cartContext";
import { toCartProduct } from "../../services/cartLocalService";
import AddIcon from "@mui/icons-material/Add";
import { FilterSearch } from "../../components/filterSearch";
import { useParams, useSearchParams } from "react-router-dom";
import type { Promotion } from "../../services/promotionService";
import { promotionService } from "../../services/promotionService";
import type { Product } from "../../models";
import { productService } from "../../services/productService";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

export default function InventoryClient() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [promotionsMap, setPromotionsMap] = useState<
    Record<number, Promotion[]>
  >({});
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const { addOne } = useCart();
  const [available, setAvailable] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const { helpProps } = useHelpSystem();

  // calcul des produits par page
  const paginatedProducts = displayedProducts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // 🔹 Charger produits
  useEffect(() => {
    // si on a un id ==> rechercher le produit correspondant au id
    if (id != undefined) {
      productService
        .getById(id)
        .then((data) => {
          setAvailable(data.stock != 0);

          setProducts([data]);
          setDisplayedProducts([data]);
        })
        .catch(console.error);
    } else {
      // si Id undefine ==> aller chercher tous les produits
      productService
        .getAll()
        .then((data) => {
          setProducts(data);
          setDisplayedProducts(data);
        })
        .catch(console.error);
    }
  }, [id]);

  useEffect(() => {
    const productParams = searchParams.getAll("product");
    if (productParams.length > 0 && products.length > 0) {
      const selectedIds = productParams.map((id) => parseInt(id));
      setSelectedProducts(products.filter((p) => selectedIds.includes(p.id)));
    }
  }, [searchParams, products]);

  // 🔹 Préselection
  useEffect(() => {
    const params = searchParams.getAll("product");
    if (params.length && products.length) {
      const ids = params.map((id) => parseInt(id));
      setSelectedProducts(products.filter((p) => ids.includes(p.id)));
    }
  }, [searchParams, products]);

  // 🔥 Charger promotions UNE SEULE FOIS
  useEffect(() => {
    if (!products.length) return;

    const loadPromos = async () => {
      const map: Record<number, Promotion[]> = {};

      await Promise.all(
        products.map(async (p) => {
          try {
            const promos = await promotionService.getPromotionsForProduct(p.id);
            if (promos.length) map[p.id] = promos;
          } catch (err) {
            console.error("Erreur promo", p.id, err);
          }
        }),
      );
      setPromotionsMap(map);
    };

    loadPromos();
  }, [products]);

  // Ajout au panier des produits selectionnés
  const handleAddToCart = async () => {
    if (selectedProducts.length === 0 || isAddingToCart) return;

    setIsAddingToCart(true);
    try {
      // On lance tous les ajouts en parallèle pour plus de rapidité
      await Promise.all(
        selectedProducts.map((product) =>
          addOne(product.id, toCartProduct(product)),
        ),
      );

      setSelectedProducts([]);

      // Petit feedback visuel ou dispatch d'événement si nécessaire
      window.dispatchEvent(new CustomEvent("cart:updated"));
    } catch (e) {
      console.error("Erreur lors de l'ajout au panier:", e);
      alert(
        e instanceof Error ? e.message : "Erreur lors de l'ajout au panier",
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Box className="inventoryClient__wrapper">
      <div className="inventoryClient__header">
        <div>
          <h2 className="inventoryClient__title">Nos produits</h2>
        </div>
        <button
          className="btn-primary inventoryClient__buttonAdd"
          onClick={handleAddToCart}
          disabled={selectedProducts.length === 0 || isAddingToCart}
          {...helpProps("addToCart")}
        >
          <AddIcon fontSize="small" />
          <span>
            {isAddingToCart ? "Ajout en cours..." : "Ajouter au panier"}
            {!isAddingToCart &&
              selectedProducts.length > 0 &&
              ` (${selectedProducts.length})`}
          </span>
        </button>
      </div>

      <div
        className="inventory-alignment-container"
        {...helpProps("searchFilter")}
      >
        <FilterSearch
          products={products}
          displayedProducts={displayedProducts}
          setDisplayedProducts={setDisplayedProducts}
          isForClient={true}
          showUnavailable={!available}
        />

        {paginatedProducts.length === 0 ? (
          <div className="inventoryClient__no-products">
            <p>Aucun produit trouvé</p>
            <p className="inventoryClient__no-products-hint">
              Essayez de modifier votre recherche ou vos filtres
            </p>
          </div>
        ) : (
          /* Grid CSS natif — beaucoup plus fiable que MUI Grid pour le responsive */
          <div className="inventoryClient__grid" {...helpProps("list")}>
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selectedProducts={selectedProducts}
                setSelectedProducts={setSelectedProducts}
                promotions={promotionsMap[product.id] || []}
              />
            ))}
          </div>
        )}
      </div>

      {displayedProducts.length > 0 && (
        <PaginationControls
          page={page}
          rowsPerPage={rowsPerPage}
          total={displayedProducts.length}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      )}
    </Box>
  );
}
