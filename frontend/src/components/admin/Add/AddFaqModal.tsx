import React, { useState } from "react";
import { X, Save } from "lucide-react";
import "../forms.css";
import type { FaqCategory } from "../../../models";
import type { FaqFormPayload } from "../../../services/faqService";
import { useHelpSystem } from "../../helpPage/hooks/useHelpSystem";
import HelpModal from "../../helpPage/modalHelp/modalHelp";

interface AddFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: FaqFormPayload) => void;
}

const CATEGORIES: { value: FaqCategory; label: string }[] = [
  { value: "LIVRAISON", label: "Livraison" },
  { value: "PAIEMENT", label: "Paiement" },
  { value: "MENU", label: "Menu" },
  { value: "AUTRE", label: "Autre" },
];

const AddFaqModal: React.FC<AddFaqModalProps> = ({ isOpen, onClose, onSave }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState<FaqCategory>("AUTRE");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
    
  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();

  const reset = () => {
    setQuestion("");
    setAnswer("");
    setKeywords("");
    setCategory("AUTRE");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      alert("Veuillez remplir la question et la réponse");
      return;
    }
    onSave({ question: question.trim(), answer: answer.trim(), keywords, category });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajouter une question FAQ</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group" {...helpProps("question")}>
            <label htmlFor="faq-question">Question *</label>
            <input
              type="text"
              id="faq-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Comment passer une commande ?"
              required
            />
          </div>

          <div className="form-group" {...helpProps("answer")}>
            <label htmlFor="faq-answer">Réponse *</label>
            <textarea
              id="faq-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Réponse détaillée..."
              rows={5}
              required
            />
          </div>

          <div className="form-group" {...helpProps("category")}>
            <label htmlFor="faq-category">Catégorie *</label>
            <select
              id="faq-category"
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
            <label htmlFor="faq-keywords">Mots-clés (séparés par des virgules)</label>
            <input
              type="text"
              id="faq-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Ex: livraison, commande, panier"
            />
          </div>

          <div className="modal-footer" {...helpProps("actions")}>
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} />
              <span>Ajouter</span>
            </button>
          </div>
        </form>

        <HelpModal page="addFaq" 
          isOpen={isHelpOpen==true} 
          onOpen={()=>setIsHelpOpen(true)} 
          onClose={()=>setIsHelpOpen(false)}
        /> 
      </div>
    </div>
  );
};

export default AddFaqModal;
