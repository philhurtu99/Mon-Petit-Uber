import { useState } from "react";
import styles from "./authModal.module.css";
import { authService } from "../../services/authService";
import HelpModal from "../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../helpPage/hooks/useHelpSystem";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

const getWebmailLink = (
  email: string,
): { label: string; url: string } | null => {
  const domain = email.split("@")[1]?.toLowerCase();

  const webmails: Record<string, { label: string; url: string }> = {
    "gmail.com": { label: "Ouvrir Gmail", url: "https://mail.google.com" },
    "googlemail.com": { label: "Ouvrir Gmail", url: "https://mail.google.com" },
    "outlook.com": { label: "Ouvrir Outlook", url: "https://outlook.live.com" },
    "hotmail.com": { label: "Ouvrir Outlook", url: "https://outlook.live.com" },
    "live.com": { label: "Ouvrir Outlook", url: "https://outlook.live.com" },
    "msn.com": { label: "Ouvrir Outlook", url: "https://outlook.live.com" },
    "yahoo.com": { label: "Ouvrir Yahoo Mail", url: "https://mail.yahoo.com" },
    "yahoo.fr": { label: "Ouvrir Yahoo Mail", url: "https://mail.yahoo.com" },
    "icloud.com": {
      label: "Ouvrir iCloud Mail",
      url: "https://www.icloud.com/mail",
    },
    "me.com": {
      label: "Ouvrir iCloud Mail",
      url: "https://www.icloud.com/mail",
    },
    "protonmail.com": {
      label: "Ouvrir ProtonMail",
      url: "https://mail.proton.me",
    },
    "proton.me": { label: "Ouvrir ProtonMail", url: "https://mail.proton.me" },
  };

  return webmails[domain] ?? null;
};

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onBack,
}: Props) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res.message);
    } catch (err: any) {
      setError(err.message || "Une erreur s'est produite.");
    } finally {
      setIsLoading(false);
    }
  };

  const webmailLink = getWebmailLink(email);

  return (
    <div className={styles["modal-overlay"]} onMouseDown={onClose}>
      <div
        className={styles["modal-content"]}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className={styles["modal-close-btn"]} onClick={onClose}>
          &times;
        </button>
        <h2>Mot de passe oublié</h2>
        {message ? (
          <div className={styles["modal-form"]}>
            <p style={{ textAlign: "center", color: "#555" }}>{message}</p>

            {webmailLink && (
              <a
                href={webmailLink.url}
                target="_blank"
                rel="noopener noreferrer"
                type="submit"
                style={{ textAlign: "center", display: "block" }}
              >
                {webmailLink.label}
              </a>
            )}
            <button
              type="button"
              className={styles["modal-switch-btn"]}
              onClick={onBack}
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles["modal-form"]}>
            {error && <div className={styles["modal-error"]}>{error}</div>}
            <p
              style={{
                color: "#555",
                fontSize: "14px",
                marginBottom: "10px",
                textAlign: "center",
              }}
            >
              Entrez votre courriel et nous vous enverrons un lien pour
              réinitialiser votre mot de passe.
            </p>
            <input
              type="email"
              placeholder="Courriel"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              {...helpProps("email")} 
            />
            <button type="submit" disabled={isLoading} {...helpProps("link")} >
              {isLoading ? "Envoi..." : "Envoyer le lien"}
            </button>
            <button
              type="button"
              className={styles["modal-switch-btn"]}
              onClick={onBack}
              {...helpProps("back")} 
            >
              Retour à la connexion
            </button>
          </form>
        )}

        <HelpModal page="forgotPassword" 
          isOpen={isHelpOpen==true} 
          onOpen={()=>setIsHelpOpen(true)} 
          onClose={()=>setIsHelpOpen(false)}
        /> 
      </div>
    </div>
  );
}
