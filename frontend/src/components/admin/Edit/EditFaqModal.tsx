import React, { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import "../forms.css";
import type { FaqItem, FaqCategory } from "../../../models";
import type { FaqFormPayload } from "../../../services/faqService";
import HelpModal from "../../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../../helpPage/hooks/useHelpSystem";

interface EditFaqModalProps {
  isOpen: boolean;
  faq: FaqItem | null;
  onClose: () => void;
  onSave: (id: string, payload: FaqFormPayload) => void;
}

const CATEGORIES: { value: FaqCategory; label: string }[] = [
  { value: "LIVRAISON", label: "Livraison" },
  { value: "PAIEMENT", label: "Paiement" },
  { value: "MENU", label: "Menu" },
  { value: "AUTRE", label: "Autre" },
];

const EditFaqModal: React.FC<EditFaqModalProps> = ({ isOpen, faq, onClose, onSave }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState<FaqCategory>("AUTRE");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
      
  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();
  

  // Synchronisation des champs quand la FAQ sélectionnée change
  useEffect(() => {
    if (faq) {
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setKeywords(faq.keywords.join(", "));
      setCategory(faq.category);
    }
  }, [faq]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faq) return;
    if (!question.trim() || !answer.trim()) {
      alert("Veuillez remplir la question et la réponse");
      return;
    }
    onSave(faq.id, { question: question.trim(), answer: answer.trim(), keywords, category });
    onClose();
  };

  if (!isOpen || !faq) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Modifier la question FAQ</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group" {...helpProps("question")}>
            <label htmlFor="faq-edit-question">Question *</label>
            <input
              type="text"
              id="faq-edit-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div className="form-group" {...helpProps("answer")}>
            <label htmlFor="faq-edit-answer">Réponse *</label>
            <textarea
              id="faq-edit-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              required
            />
          </div>

          <div className="form-group" {...helpProps("category")}>
            <label htmlFor="faq-edit-category">Catégorie *</label>
            <select
              id="faq-edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FaqCategory)}
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" {...helpProps("metadata")}>
            <label htmlFor="faq-edit-keywords">Mots-clés (séparés par des virgules)</label>
            <input
              type="text"
              id="faq-edit-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Ex: livraison, commande, panier"
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

        <HelpModal page="editFaq" 
          isOpen={isHelpOpen==true} 
          onOpen={()=>setIsHelpOpen(true)} 
          onClose={()=>setIsHelpOpen(false)}
        /> 

      </div>
    </div>
  );
};

export default EditFaqModal;
