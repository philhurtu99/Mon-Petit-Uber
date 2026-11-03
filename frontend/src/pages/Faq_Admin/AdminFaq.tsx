import React, { useEffect, useState } from "react";
import { Edit2, Trash2, Plus } from "lucide-react";
import "./AdminFaq.css";
import { faqService, type FaqFormPayload } from "../../services/faqService";
import type { FaqItem, FaqCategory } from "../../models";
import AddFaqModal from "../../components/admin/Add/AddFaqModal";
import EditFaqModal from "../../components/admin/Edit/EditFaqModal";
import DeleteConfirm from "../../components/DeleteConfirm/DeleteConfirm";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

const CATEGORY_LABELS: Record<FaqCategory, string> = {
  LIVRAISON: "Livraison",
  PAIEMENT: "Paiement",
  MENU: "Menu",
  AUTRE: "Autre",
};

const ALL_CATEGORIES: FaqCategory[] = ["LIVRAISON", "PAIEMENT", "MENU", "AUTRE"];

/** ---------------------------------------------------------------------
 * Page admin FAQ — liste, ajout, modification, suppression
 ---------------------------------------------------------------------*/
export default function AdminFaq() {
  // \État principal
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FaqCategory | "ALL">("ALL");

  // Modaux
  const [addOpen, setAddOpen] = useState(false);
  const [editFaq, setEditFaq] = useState<FaqItem | null>(null);
  const [deleteFaq, setDeleteFaq] = useState<FaqItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol 
  const { helpProps } = useHelpSystem();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  /** Recharge la liste depuis le serveur */
  const reload = async () => {
    setLoading(true);
    try {
      const data = await faqService.getAll();
      setFaqs(data);
    } catch (err) {
      console.error(err);
      showToast("error", "Erreur lors du chargement des FAQ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  /** Création */
  const handleAdd = async (payload: FaqFormPayload) => {
    const { status, data } = await faqService.create(payload);
    if (status === 201) {
      showToast("success", "FAQ ajoutée avec succés");
      reload();
    } else {
      showToast("error", data?.message ?? "Erreur lors de l'ajout");
    }
  };

  /** Modification */
  const handleEdit = async (id: string, payload: FaqFormPayload) => {
    const { status, data } = await faqService.update(id, payload);
    if (status === 200) {
      showToast("success", "FAQ mise à jour");
      reload();
    } else {
      showToast("error", data?.message ?? "Erreur lors de la mise à jour");
    }
  };

  /** Suppression */
  const handleDelete = async () => {
    if (!deleteFaq) return;
    setDeleting(true);
    try {
      const { status, data } = await faqService.remove(deleteFaq.id);
      if (status === 200) {
        showToast("success", "FAQ supprimée");
        reload();
      } else {
        showToast("error", data?.message ?? "Erreur lors de la suppression");
      }
    } finally {
      setDeleting(false);
      setDeleteFaq(null);
    }
  };

  // Filtrage par catégorie
  const filteredFaqs = filter === "ALL" ? faqs : faqs.filter((f) => f.category === filter);

  return (
    <div className="faq-admin-wrapper">

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div className={`faq-toast faq-toast--${toast.type}`}>
          {toast.text}
        </div>
      )}

      <div className="faq-admin-main">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="faq-admin-header" {...helpProps("add")}>
          <div>
            <h1 className="faq-admin-title">Gestion FAQ</h1>
            <p className="faq-admin-subtitle">
              {faqs.length} question{faqs.length !== 1 ? "s" : ""} dans la base
            </p>
          </div>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={18} />
            <span>Ajouter une question</span>
          </button>
        </div>

        {/* ── Filtres catégories ──────────────────────────────── */}
        <div className="faq-admin-filters" {...helpProps("filter")}>
          <button
            className={`faq-filter-btn ${filter === "ALL" ? "active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            Toutes
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`faq-filter-btn ${filter === cat ? "active" : ""}`}
              onClick={() => setFilter(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* ── Liste FAQ ────────────────────────────────────────── */}
        {loading ? (
          <p className="faq-admin-empty">Chargement...</p>
        ) : filteredFaqs.length === 0 ? (
          <p className="faq-admin-empty">Aucune question dans cette catégorie.</p>
        ) : (
          <div className="faq-admin-list">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="faq-admin-card">
                <div className="faq-admin-card-content" {...helpProps("questions")}>
                  <div className="faq-admin-card-header">
                    <span className={`faq-category-badge faq-category-badge--${faq.category.toLowerCase()}`}>
                      {CATEGORY_LABELS[faq.category]}
                    </span>
                  </div>
                  <h3 className="faq-admin-card-question">{faq.question}</h3>
                  <p className="faq-admin-card-answer">{faq.answer}</p>
                  {faq.keywords.length > 0 && (
                    <div className="faq-admin-card-keywords">
                      {faq.keywords.map((kw, i) => (
                        <span key={i} className="faq-keyword">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="faq-admin-card-actions">
                  <button
                    className="faq-btn-icon faq-btn-edit"
                    onClick={() => setEditFaq(faq)}
                    title="Modifier"
                    {...helpProps("edit")}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="faq-btn-icon faq-btn-delete"
                    onClick={() => setDeleteFaq(faq)}
                    title="Supprimer"
                    {...helpProps("delete")}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modaux ─────────────────────────────────────────────── */}
      <AddFaqModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
      />

      <EditFaqModal
        isOpen={!!editFaq}
        faq={editFaq}
        onClose={() => setEditFaq(null)}
        onSave={handleEdit}
      />

      <DeleteConfirm
        isOpen={!!deleteFaq}
        itemName={deleteFaq ? `la question "${deleteFaq.question}"` : ""}
        onClose={() => setDeleteFaq(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
}
