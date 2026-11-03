import React from "react";
import "./LegendHelpPopup.css";
import mascotteQuestionnement from "../../assets/mascotte_questionnement.png";

export interface LegendItem {
  label: string;
  description: string;
  isRequired?: boolean;
}

interface LegendHelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  title?: string;
  items: LegendItem[];
}

const LegendHelpPopup: React.FC<LegendHelpPopupProps> = ({
  isOpen,
  onClose,
  onToggle,
  title = "Légende des champs",
  items,
}) => {
  return (
    <>
      {/* Bouton d'aide avec mascotte */}
      <button
        type="button"
        className="helpPopupToggle"
        onClick={onToggle}
        title={isOpen ? "Masquer l'aide" : "Afficher l'aide"}
        aria-label={isOpen ? "Masquer l'aide" : "Afficher l'aide"}
        aria-expanded={isOpen}
      >
        <img 
          src={mascotteQuestionnement} 
          alt="Aide" 
        />
        <span className="helpPopupToggleText">?</span>
      </button>

      {/* Panneau latéral d'aide */}
      <div
        className={`helpPopupPanel ${isOpen ? "show" : ""}`}
        onClick={(e) => {
          // Fermer le panneau si on clique sur l'overlay (le ::after)
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-hidden={!isOpen}
      >
        <div className="helpPopupContent">
          <h4>{title}</h4>
          {items.map((item, index) => (
            <div key={index} className="helpPopupItem">
              <p>
                <strong>
                  {item.label}
                  {item.isRequired && (
                    <span style={{ color: "#ff6b6b" }}>*</span>
                  )}
                </strong>
              </p>
              <p className="helpPopupText">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default LegendHelpPopup;
