import { useEffect, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "./faq.css";
import { faqService } from "../../services/faqService";
import type { FaqItem, FaqCategory } from "../../models";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

const CATEGORY_LABELS: Record<FaqCategory, string> = {
  LIVRAISON: "Livraison",
  PAIEMENT: "Paiement",
  MENU: "Menu",
  AUTRE: "Autre",
};

const ALL_CATEGORIES: FaqCategory[] = ["LIVRAISON", "PAIEMENT", "MENU", "AUTRE"];

/** ---------------------------------------------------------------------
 * Page publique FAQ — tabs par catégorie + accordéons MUI
 ---------------------------------------------------------------------*/
export default function Faq() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FaqCategory | "ALL">("ALL");

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();

  useEffect(() => {
    faqService
      .getAll()
      .then(setFaqs)
      .catch((err) => console.error("Erreur chargement FAQ :", err))
      .finally(() => setLoading(false));
  }, []);

  // Filtrage par catégorie
  const filteredFaqs = activeTab === "ALL" ? faqs : faqs.filter((f) => f.category === activeTab);

  return (
    <div className="faq-public-wrapper">
      <div className="faq-public-main">

        {/* ── En-t\u00eate ──────────────────────────────────────────── */}
        <div className="faq-public-header">
          <h1 className="faq-public-title">Questions fréquentes</h1>
          <p className="faq-public-subtitle">
            Trouvez rapidement les réponses à vos questions
          </p>
        </div>

        {/* ── Tabs catégories ──────────────────────────────────── */}
        <div className="faq-public-tabs" {...helpProps("categories")}>
          <button
            className={`faq-tab ${activeTab === "ALL" ? "active" : ""}`}
            onClick={() => setActiveTab("ALL")}
          >
            Toutes
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`faq-tab ${activeTab === cat ? "active" : ""}`}
              onClick={() => setActiveTab(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* ── Liste accordéons ────────────────────────────────── */}
        <div className="faq-public-list">
          {loading && <p className="faq-public-empty">Chargement...</p>}

          {!loading && filteredFaqs.length === 0 && (
            <p className="faq-public-empty">Aucune question dans cette catégorie pour le moment.</p>
          )}

          {!loading && filteredFaqs.map((faq) => (
            <Accordion
              key={faq.id}
              className="faq-accordion"
              disableGutters
              elevation={0}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.05) !important",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px !important",
                marginBottom: "12px",
                "&:before": { display: "none" },
                "&.Mui-expanded": {
                  marginBottom: "12px",
                },
              }}
              {...helpProps("accordion")}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: "#8DC640" }} />}
                sx={{
                  padding: "8px 24px",
                  minHeight: "60px",
                  "& .MuiAccordionSummary-content": {
                    margin: "12px 0",
                  },
                }}
              >
                <div className="faq-accordion-summary">
                  <span className={`faq-category-badge faq-category-badge--${faq.category.toLowerCase()}`}>
                    {CATEGORY_LABELS[faq.category]}
                  </span>
                  <span className="faq-accordion-question">{faq.question}</span>
                </div>
              </AccordionSummary>

              <AccordionDetails
                sx={{
                  padding: "0 24px 20px 24px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <p className="faq-accordion-answer">{faq.answer}</p>
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      </div>
    </div>
  );
}
