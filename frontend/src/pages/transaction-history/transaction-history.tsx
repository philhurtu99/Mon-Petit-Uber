import React, { useEffect, useMemo, useState } from "react";
import "./../../index.css";
import "./transaction-history.css";
import { API_URL, DEFAULT_PAGE, DEFAULT_ROWS_PER_PAGE } from "../../config";
import { useAuth } from "../../contexts/authContext";
import PaginationControls from "../../components/pagination/pagination";
import { ROWS_PER_PAGE_OPTIONS_TRANSACTIONS } from "../../config";
import { Search } from "lucide-react";
import DateFilterDropdown from "../../components/dateFilter/dateFilter";
import type {
  CommandeEtat,
  DateRange,
  TransactionDTO,
  TransactionItemDTO,
} from "../../models";
import {
  fetchGetAllForUser,
  filtrerTransactions,
  formatDatePourFiltre,
} from "../../services/transactionsService";
import { useNavigate } from "react-router-dom";
import { DownloadInvoiceButton } from "../../components/InvoiceButton/DownloadInvoiceButton";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";
import { ReviewFormModal } from "../../components/productReviewFormModal/productReviewFormModal";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { useCart } from "../../contexts/cartContext";

/**
 * Afficher la liste de transactions fait par l'utilisateur connecté
 * @returns lsite de transaction pour l'utilisateur connecté
 */
export function TransactionHistory() {
  // état de la liste des transactions récuperées de l'API
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);

  // état de l'utilisateur authentifié
  const { user } = useAuth();

  // état de l'accordion pour les transaction ou ils on plus de 2 items
  const [openAccordions, setOpenAccordions] = useState<{
    [key: number]: boolean;
  }>({});

  // états pour la pagination
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // états pour la barre de recherche et le filtre de date
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(null);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const [reviewModal, setReviewModal] = useState<{
    productId: number;
    productName: string;
    existingReview: {
      id: number;
      rating: number;
      comment: string | null;
      imagesUrl: string[];
    } | null;
  } | null>(null);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const { helpProps } = useHelpSystem();

  // activer la naviagation
  const navigate = useNavigate();

  const loadTransactions = () => {
    if (!user?.id) return;
    fetchGetAllForUser(user.id)
      .then((transactions) => setTransactions(transactions))
      .catch((err) => console.error("Error:", err));
  };

  useEffect(() => {
    loadTransactions();
  }, [user?.id]);

  // Filtrer les transactions selon les termes données
  const filteredProducts = useMemo(() => {
    return filtrerTransactions(transactions, searchTerm, dateRange);
  }, [transactions, searchTerm, dateRange]);

  // determiner le nombre de pages selon le nombre des transactions
  const paginatedProducts = filteredProducts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // lien vers le produit
  const handleNavigationtoProduct = async (productId: number) => {
    navigate(`/products/${productId}`);
  };

  // ouvrir l'accordéon pour afficher les produits restants
  const handleAccordionToggle = (index: number) => {
    setOpenAccordions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const { addMany } = useCart();

  const [reorderTransaction, setReorderTransaction] =
    useState<TransactionDTO | null>(null);

  const [reorderItems, setReorderItems] = useState<
    Array<TransactionItemDTO & { selected: boolean; reorderQuantity: number }>
  >([]);

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const openReorderModal = (transaction: TransactionDTO) => {
    setReorderTransaction(transaction);
    setReorderItems(
      transaction.items.map((item) => {
        const availableStock = Math.max(0, item.stock);

        return {
          ...item,
          selected: availableStock > 0,
          reorderQuantity:
            availableStock > 0
              ? Math.min(Math.max(1, item.quantity), availableStock)
              : 0,
        };
      }),
    );
    setReorderError(null);
  };

  const closeReorderModal = () => {
    setReorderTransaction(null);
    setReorderItems([]);
    setReorderError(null);
  };

  const toggleReorderItem = (productId: number) => {
    setReorderItems((items) =>
      items.map((item) =>
        item.id === productId && item.stock > 0
          ? { ...item, selected: !item.selected }
          : item,
      ),
    );
  };

  const updateReorderQuantity = (productId: number, delta: number) => {
    setReorderItems((items) =>
      items.map((item) =>
        item.id === productId
          ? item.stock > 0
            ? {
                ...item,
                reorderQuantity: Math.min(
                  item.stock,
                  Math.max(1, item.reorderQuantity + delta),
                ),
              }
            : item
          : item,
      ),
    );
  };

  const toggleAllReorderItems = () => {
    const availableItems = reorderItems.filter((item) => item.stock > 0);
    const allSelected =
      availableItems.length > 0 &&
      availableItems.every((item) => item.selected);

    setReorderItems((items) =>
      items.map((item) => ({
        ...item,
        selected: item.stock > 0 ? !allSelected : false,
      })),
    );
  };

  const handleAddTransactionToCart = async () => {
    const selectedItems = reorderItems.filter((item) => item.selected);

    if (selectedItems.length === 0) {
      setReorderError("Sélectionnez au moins un produit.");
      return;
    }

    const invalidStockItem = selectedItems.find((item) => item.stock <= 0);
    if (invalidStockItem) {
      setReorderError(`${invalidStockItem.name} est en rupture de stock.`);
      return;
    }

    const invalidQuantityItem = selectedItems.find(
      (item) =>
        item.reorderQuantity < 1 ||
        item.reorderQuantity > Math.max(0, item.stock),
    );
    if (invalidQuantityItem) {
      setReorderError(
        `${invalidQuantityItem.name}: maximum ${invalidQuantityItem.stock} disponible(s).`,
      );
      return;
    }

    try {
      setIsAddingToCart(true);
      setReorderError(null);

      await addMany(
        selectedItems.map((item) => ({
          productId: item.id,
          quantity: item.reorderQuantity,
        })),
      );

      closeReorderModal();
    } catch (error) {
      setReorderError(
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter au panier.",
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  // affichage des items de la transaction
  const transactionItems = (
    items: TransactionItemDTO[],
    commandeEtat?: CommandeEtat | null,
  ) => {
    return items.map((item, i) => {
      const imgSrc = item.imageUrl?.startsWith("http")
        ? item.imageUrl
        : `${API_URL}${item.imageUrl}`;

      return (
        <li key={i} className="transactions__row">
          <img
            src={imgSrc}
            alt={item.name}
            className="transactions__row-img"
            onClick={() => handleNavigationtoProduct(item.id)}
            {...helpProps("jumpToProduct")}
          />
          <span
            className="transactions__row-name"
            onClick={() => handleNavigationtoProduct(item.id)}
            {...helpProps("jumpToProduct")}
          >
            {item.name}
          </span>
          <div className="transactions__row-details">
            <span className="transactions__row-price">
              {item.price.toFixed(2)} $
            </span>
            <span className="transactions__row-qty">{item.quantity}</span>
            <span className="transactions__row-total">
              {item.lineTotal.toFixed(2)} $
            </span>
          </div>

          {commandeEtat === "COMPLETEE" && (
            <button
              className="transactions__review-btn"
              onClick={() =>
                setReviewModal({
                  productId: item.id,
                  productName: item.name,
                  existingReview: item.existingReview,
                })
              }
            >
              {item.existingReview ? "Modifier l'avis" : "Laisser un avis"}
            </button>
          )}
        </li>
      );
    });
  };

  // Afficher un message s'il n'y a pas aucun transaction
  if (transactions.length === 0) {
    return (
      <div className="transactions__wrapper">
        <div className="transactions__header">
          <div>
            <h1 className="transactions__title">
              Historique de mes transactions
            </h1>
            <p className="transactions__subtitle">Aucune transaction trouvée</p>
          </div>
        </div>
        <p className="transactions__empty">
          Vous n'avez pas encore effectué d'achat.
        </p>
      </div>
    );
  }

  return (
    <div className="transactions__wrapper">
      <div className="transactions__header">
        <div>
          <h1 className="transactions__title">
            Historique de mes transactions
          </h1>
          <p className="transactions__subtitle">
            {filteredProducts.length} transaction(s)
          </p>
        </div>
      </div>

      {/* --- barre de recherche --- */}
      <div className="transactions__search-wrapper row">
        <div className="transactions__search-container col-12 col-md-9">
          <Search style={{ marginRight: "8px", color: "#8DC640" }} />
          <input
            type="text"
            placeholder="Rechercher une transaction..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="transactions__search-input"
            {...helpProps("search")}
          />
        </div>
        <div className="col-12 col-md-3" {...helpProps("filterDate")}>
          <DateFilterDropdown onChange={setDateRange} />
        </div>
      </div>

      <div className="transactions__list">
        {/* --- Ligne d'en-tête sticky --- */}
        <div
          className="transactions__header-row"
          style={{
            position: "sticky",
            top: 70,
            zIndex: 2,
            background: "rgba(10,29,63,0.97)",
            boxShadow: "0 2px 8px 0 rgba(0,0,0,0.7)",
          }}
        >
          <span className="transactions__header-img"></span>
          <span className="transactions__header-name">Produit</span>
          <span className="transactions__header-price">Prix</span>
          <span className="transactions__header-qty">Qté</span>
          <span className="transactions__header-total">Total</span>
        </div>
        {paginatedProducts.map((t, ti) => {
          const showAccordion = t.items.length > 2;
          const firstItems = t.items.slice(0, 2);
          const restItems = t.items.slice(2);
          const isOpen = openAccordions[ti] || false;
          const isCancelled = t.commande?.etat === "ANNULEE";
          return (
            <li key={ti} className="transactions__row-wrapper">
              <div className="transactions__panel">
                <div className="transactions__card-header">
                  <div className="transactions__card-date-info">
                    {formatDatePourFiltre(t.purchaseDate)}

                    {isCancelled && (
                      <span className="transactions__cancelled-badge">
                        Annulé
                      </span>
                    )}
                  </div>
                  <div
                    className="transactions__card-actions"
                    {...helpProps("invoice")}
                  >
                    <button
                      type="button"
                      className="transactions__reorder-btn"
                      onClick={() => openReorderModal(t)}
                      aria-label="Ajouter cette transaction au panier"
                      title="Ajouter cette transaction au panier"
                    >
                      <ShoppingCart size={18} />
                      <Plus size={14} />
                    </button>
                    <DownloadInvoiceButton orderId={t.id} />
                    <div className="transactions__card-total">
                      Total: {t.total.toFixed(2)} $
                    </div>
                  </div>
                </div>
                <ul className="transactions__items-list">
                  {transactionItems(firstItems, t.commandeEtat)}

                  {/* si l'accordeon est fermé et qu'il y a plus de 2 produits, afficher le bouton pour ouvrir l'accordéon */}
                  {showAccordion && !isOpen && (
                    <li style={{ textAlign: "center", padding: 8 }}>
                      <button
                        style={{
                          background: "none",
                          color: "#8dc640",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                        onClick={() => handleAccordionToggle(ti)}
                        {...helpProps("accordion")}
                      >
                        + Voir {restItems.length} autre(s) produit(s)
                      </button>
                    </li>
                  )}

                  {/* affichier le reste des produits si l'accordéon est ouvert */}
                  {showAccordion &&
                    isOpen &&
                    transactionItems(restItems, t.commandeEtat)}

                  {/* si c'est ouvert, afficher le bouton pour réduire l'accordéon */}
                  {showAccordion && isOpen && (
                    <li style={{ textAlign: "center", padding: 8 }}>
                      <button
                        style={{
                          background: "none",
                          color: "#8dc640",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                        onClick={() => handleAccordionToggle(ti)}
                        {...helpProps("accordion")}
                      >
                        − Réduire
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </li>
          );
        })}
      </div>
      {filteredProducts.length > 0 && (
        <PaginationControls
          page={page}
          rowsPerPage={rowsPerPage}
          total={filteredProducts.length}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS_TRANSACTIONS}
        />
      )}

      {reviewModal && (
        <ReviewFormModal
          productId={reviewModal.productId}
          productName={reviewModal.productName}
          existingReview={reviewModal.existingReview}
          onClose={() => setReviewModal(null)}
          onSuccess={() => {
            setReviewModal(null);
            loadTransactions();
          }}
        />
      )}

      {reorderTransaction && (
        <div
          className="transactions__reorder-overlay"
          onMouseDown={closeReorderModal}
        >
          <div
            className="transactions__reorder-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="transactions__reorder-header">
              <div>
                <h2>Ajouter au panier</h2>
              </div>

              <button
                type="button"
                className="transactions__reorder-close"
                onClick={closeReorderModal}
                aria-label="Fermer"
                title="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <button
              type="button"
              className="transactions__select-all"
              onClick={toggleAllReorderItems}
              disabled={!reorderItems.some((item) => item.stock > 0)}
            >
              {reorderItems
                .filter((item) => item.stock > 0)
                .every((item) => item.selected)
                ? "Tout désélectionner"
                : "Tout sélectionner"}
            </button>

            <ul className="transactions__reorder-list">
              {reorderItems.map((item) => {
                const imgSrc = item.imageUrl?.startsWith("http")
                  ? item.imageUrl
                  : `${API_URL}${item.imageUrl}`;
                const isOutOfStock = item.stock <= 0;

                return (
                  <li
                    key={item.id}
                    className={`transactions__reorder-item ${
                      item.selected ? "is-selected" : ""
                    } ${isOutOfStock ? "is-out-of-stock" : ""}`}
                  >
                    <label className="transactions__reorder-check">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        disabled={isOutOfStock}
                        onChange={() => toggleReorderItem(item.id)}
                      />
                      <span />
                    </label>

                    <img src={imgSrc} alt={item.name} />

                    <div className="transactions__reorder-info">
                      <strong>{item.name}</strong>
                      <small>{item.price.toFixed(2)} $</small>
                      {isOutOfStock ? (
                        <span className="transactions__stock-badge">
                          Rupture de stock
                        </span>
                      ) : (
                        <small>Stock disponible: {item.stock}</small>
                      )}
                    </div>

                    <div className="transactions__reorder-qty">
                      <button
                        type="button"
                        onClick={() => updateReorderQuantity(item.id, -1)}
                        disabled={isOutOfStock || item.reorderQuantity <= 1}
                      >
                        <Minus size={14} />
                      </button>

                      <span>{item.reorderQuantity}</span>

                      <button
                        type="button"
                        onClick={() => updateReorderQuantity(item.id, 1)}
                        disabled={
                          isOutOfStock || item.reorderQuantity >= item.stock
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {reorderError && (
              <p className="transactions__reorder-error">{reorderError}</p>
            )}

            <button
              type="button"
              className="transactions__reorder-submit"
              onClick={handleAddTransactionToCart}
              disabled={
                isAddingToCart || !reorderItems.some((item) => item.selected)
              }
            >
              {isAddingToCart ? "Ajout..." : "Ajouter au panier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
