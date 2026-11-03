import { useEffect, useMemo, useState } from "react";
import { Check, Edit2, Flag, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import DeleteConfirm from "../../components/DeleteConfirm/DeleteConfirm";
import {
  restrictedWordService,
  type RestrictedWord,
} from "../../services/restrictedWordService";
import { productReviewService } from "../../services/productReviewService";
import type { ProductReview } from "../../models";
import "./RestrictedWordsAdmin.css";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

type StatusFilter = "all" | "active" | "inactive";
type FlaggedReview = ProductReview & {
  product: {
    id: number;
    name: string;
  };
};

const getAdminName = (word: RestrictedWord) => {
  if (!word.createdBy) return "Automatique";

  const fullName = [word.createdBy.firstName, word.createdBy.lastName]
    .filter(Boolean)
    .join(" ");

  return fullName || word.createdBy.email;
};

export default function RestrictedWordsAdmin() {
  const [words, setWords] = useState<RestrictedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [activeInput, setActiveInput] = useState(true);
  const [editingWord, setEditingWord] = useState<RestrictedWord | null>(null);
  const [deleteWord, setDeleteWord] = useState<RestrictedWord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // États pour les reviews signalés
  const [flaggedReviews, setFlaggedReviews] = useState<FlaggedReview[]>([]);
  const [loadingFlagged, setLoadingFlagged] = useState(true);
  const [flaggedPage, setFlaggedPage] = useState(1);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [reviewCommentInput, setReviewCommentInput] = useState("");
  const [savingReviewId, setSavingReviewId] = useState<number | null>(null);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol 
  const { helpProps } = useHelpSystem();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3000);
  };

  const reload = async () => {
    setLoading(true);
    try {
      const data = await restrictedWordService.getAll();
      setWords(data);
    } catch (error) {
      console.error(error);
      showToast("error", "Erreur lors du chargement des mots filtrés");
    } finally {
      setLoading(false);
    }
  };

  const reloadFlaggedReviews = async () => {
    setLoadingFlagged(true);
    try {
      const pageSize = 10;
      const skip = (flaggedPage - 1) * pageSize;
      const data = await productReviewService.getAllFlagged(skip, pageSize);
      setFlaggedReviews(data.reviews);
    } catch (error) {
      console.error(error);
      showToast("error", "Erreur lors du chargement des avis signalés");
    } finally {
      setLoadingFlagged(false);
    }
  };

  useEffect(() => {
    reload();
    reloadFlaggedReviews();
  }, []);

  useEffect(() => {
    reloadFlaggedReviews();
  }, [flaggedPage]);

  const filteredWords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return words.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.word.toLowerCase().includes(normalizedSearch) ||
        getAdminName(item).toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? item.active : !item.active);

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, words]);

  const resetForm = () => {
    setWordInput("");
    setActiveInput(true);
    setEditingWord(null);
  };

  const handleEdit = (word: RestrictedWord) => {
    setEditingWord(word);
    setWordInput(word.word);
    setActiveInput(word.active);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedWord = wordInput.trim();
    if (!cleanedWord) {
      showToast("error", "Le mot est requis");
      return;
    }

    setSaving(true);
    try {
      const result = editingWord
        ? await restrictedWordService.update(editingWord.id, {
            word: cleanedWord,
            active: activeInput,
          })
        : await restrictedWordService.create({
            word: cleanedWord,
            active: activeInput,
          });

      if (result.status === 200 || result.status === 201) {
        showToast("success", editingWord ? "Mot mis à jour" : "Mot ajouté");
        resetForm();
        await reload();
      } else {
        showToast("error", result.data?.message ?? "Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (word: RestrictedWord) => {
    const result = await restrictedWordService.update(word.id, {
      word: word.word,
      active: !word.active,
    });

    if (result.status === 200) {
      setWords((currentWords) =>
        currentWords.map((item) =>
          item.id === word.id ? { ...item, active: !item.active } : item,
        ),
      );
    } else {
      showToast("error", result.data?.message ?? "Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async () => {
    if (!deleteWord) return;

    setDeleting(true);
    try {
      const result = await restrictedWordService.remove(deleteWord.id);
      if (result.status === 200) {
        showToast("success", "Mot supprimé");
        await reload();
      } else {
        showToast("error", result.data?.message ?? "Erreur lors de la suppression");
      }
    } finally {
      setDeleting(false);
      setDeleteWord(null);
    }
  };

  const handleToggleFlaggedReviewActive = async (review: FlaggedReview) => {
    try {
      const { status } = await productReviewService.toggleActive(review.id, !review.isActive);
      if (status === 200) {
        showToast("success", review.isActive ? "Avis caché du public" : "Avis visible au public");
        await reloadFlaggedReviews();
      } else {
        showToast("error", "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Erreur lors de la mise à jour");
    }
  };

  const startEditingReview = (review: FlaggedReview) => {
    setEditingReviewId(review.id);
    setReviewCommentInput(review.comment ?? "");
  };

  const cancelEditingReview = () => {
    setEditingReviewId(null);
    setReviewCommentInput("");
  };

  const handleUpdateFlaggedReviewComment = async (review: FlaggedReview) => {
    setSavingReviewId(review.id);
    try {
      const { status, data } = await productReviewService.updateAsAdmin(review.id, {
        comment: reviewCommentInput.trim() || "",
      });

      if (status === 200) {
        setFlaggedReviews((currentReviews) =>
          currentReviews.map((item) =>
            item.id === review.id
              ? { ...item, comment: data.review?.comment ?? reviewCommentInput.trim() }
              : item,
          ),
        );
        showToast("success", "Avis modifié");
        cancelEditingReview();
      } else {
        showToast("error", data?.message ?? "Erreur lors de la modification");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Erreur lors de la modification");
    } finally {
      setSavingReviewId(null);
    }
  };

  const totalActive = words.filter((item) => item.active).length;

  return (
    <div className="restricted-words-page">
      {toast && (
        <div className={`restricted-words-toast restricted-words-toast--${toast.type}`}>
          {toast.text}
        </div>
      )}

      <div className="restricted-words-shell restricted-words-two-columns">
        <div className="restricted-words-left-column">
          <header className="restricted-words-header">
            <div>
              <h1>Gestion des mots filtrés</h1>
              <p>
                {words.length} mot{words.length !== 1 ? "s" : ""} en base, {totalActive} actif
                {totalActive !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="restricted-words-stats">
              <span>
                <ShieldCheck size={16} />
                {totalActive} actifs
              </span>
            </div>
          </header>

          <section className="restricted-words-toolbar">
            <form className="restricted-words-form" onSubmit={handleSubmit}{...helpProps("form")}>
              <label htmlFor="restricted-word-input">
                {editingWord ? "Modifier le mot" : "Ajouter un mot"}
              </label>
              <div className="restricted-words-form-row">
                <input
                  id="restricted-word-input"
                  value={wordInput}
                  onChange={(event) => setWordInput(event.target.value)}
                  placeholder="Mot ou expression"
                />
                <label className="restricted-words-checkbox">
                  <input
                    type="checkbox"
                    checked={activeInput}
                    onChange={(event) => setActiveInput(event.target.checked)}
                  />
                  Actif
                </label>
                <button type="submit" className="restricted-words-primary" disabled={saving}>
                  {editingWord ? <Check size={18} /> : <Plus size={18} />}
                  <span>{saving ? "Enregistrement..." : editingWord ? "Mettre à jour" : "Ajouter"}</span>
                </button>
                {editingWord && (
                  <button type="button" className="restricted-words-ghost" onClick={resetForm}>
                    <X size={18} />
                    <span>Annuler</span>
                  </button>
                )}
              </div>
            </form>

            <div className="restricted-words-filters" {...helpProps("filters")}>
              <div className="restricted-words-search">
                <Search size={17} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="all">Tous les états</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </section>

          <section className="restricted-words-table-wrap">
            {loading ? (
              <p className="restricted-words-empty">Chargement...</p>
            ) : filteredWords.length === 0 ? (
              <p className="restricted-words-empty">Aucun mot ne correspond aux filtres.</p>
            ) : (
              <table className="restricted-words-table" {...helpProps("table")}>
                <thead>
                  <tr>
                    <th>Mot</th>
                    <th>Ajouté par</th>
                    <th>État</th>
                    <th>Création</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWords.map((item) => (
                    <tr key={item.id}>
                      <td className="restricted-words-word">{item.word}</td>
                      <td>{getAdminName(item)}</td>
                      <td>
                        <button
                          type="button"
                          className={`restricted-words-status ${item.active ? "is-active" : "is-inactive"}`}
                          onClick={() => handleToggleActive(item)}
                          {...helpProps("status")}
                        >
                          {item.active ? "Actif" : "Inactif"}
                        </button>
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString("fr-CA")}</td>
                      <td>
                        <div className="restricted-words-actions">
                          <button type="button" title="Modifier" onClick={() => handleEdit(item)} {...helpProps("edit")}>
                            <Edit2 size={17} />
                          </button>
                          <button type="button" title="Supprimer" onClick={() => setDeleteWord(item)} {...helpProps("delete")}>
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className="restricted-words-right-column">
          <header className="restricted-words-header">
            <div>
              <h1>Avis signalés</h1>
              <p>{flaggedReviews.length} avis à modérer</p>
            </div>
          </header>

          <section className="flagged-reviews-list">
            {loadingFlagged ? (
              <p className="restricted-words-empty">Chargement...</p>
            ) : flaggedReviews.length === 0 ? (
              <p className="restricted-words-empty">Aucun avis signalé.</p>
            ) : (
              <div className="flagged-reviews-container">
                {flaggedReviews.map((review) => {
                  const reportCount = review.reportCount ?? review.flagCount ?? 0;

                  return (
                    <div key={review.id} className="flagged-review-card">
                      <div className="flagged-review-header">
                        <div className="flagged-review-user">
                          <span className="flagged-review-name">
                            {review.user.firstName} {review.user.lastName}
                          </span>
                          <span className="flagged-review-date">
                            {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <div className="flagged-review-header-actions">
                          <span
                            className="flagged-review-report-count"
                            title="Nombre de signalements"
                          >
                            <Flag size={14} />
                            {reportCount}
                          </span>
                          <span className="flagged-review-rating">
                            {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                          </span>
                          <button
                            type="button"
                            className={`flagged-review-toggle ${review.isActive ? "is-active" : "is-inactive"}`}
                            onClick={() => handleToggleFlaggedReviewActive(review)}
                            {...helpProps("toggle-active")}
                          >
                            {review.isActive ? "Masquer" : "Afficher"}
                          </button>
                          <button
                            type="button"
                            className="flagged-review-edit"
                            onClick={() => startEditingReview(review)}
                            {...helpProps("edit-review")}
                          >
                            Modifier
                          </button>
                        </div>
                      </div>
                      <div className="flagged-review-product">
                        <strong>Produit:</strong> {review.product.name}
                      </div>
                      {editingReviewId === review.id ? (
                        <div className="flagged-review-edit-form">
                          <textarea
                            value={reviewCommentInput}
                            onChange={(event) => setReviewCommentInput(event.target.value)}
                            rows={3}
                          />
                          <div className="flagged-review-edit-actions">
                            <button
                              type="button"
                              className="flagged-review-save"
                              onClick={() => handleUpdateFlaggedReviewComment(review)}
                              disabled={savingReviewId === review.id}
                            >
                              {savingReviewId === review.id ? "..." : "Enregistrer"}
                            </button>
                            <button
                              type="button"
                              className="flagged-review-cancel"
                              onClick={cancelEditingReview}
                              disabled={savingReviewId === review.id}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : review.comment && (
                        <div className="flagged-review-comment">
                          <span className="flagged-review-comment-count">
                            {reportCount} signalement{reportCount > 1 ? "s" : ""}
                          </span>
                          <p>{review.comment.substring(0, 150)}{review.comment.length > 150 ? "..." : ""}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <DeleteConfirm
        isOpen={!!deleteWord}
        itemName={deleteWord ? `"${deleteWord.word}"` : ""}
        onClose={() => setDeleteWord(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
}
