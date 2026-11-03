import { useEffect, useState } from "react";
import styles from "./authModal.module.css";
import { authService } from "../../services/authService";
import { useAuth } from "../../contexts/authContext";

interface TwoFactorModalProps {
  isOpen: boolean;
  userId: string;
  method: "EMAIL" | "SMS";
  onClose: () => void;
}

// Modal qui s'ouvre après un login si la 2FA est activée pour l'utilisateur.
// Demande le code à 6 chiffres et le valide via l'API.
export default function TwoFactorModal({
  isOpen,
  userId,
  method,
  onClose,
}: TwoFactorModalProps) {
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setCode("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation côté client : 6 chiffres
    if (!/^\d{6}$/.test(code)) {
      setError("Le code doit contenir exactement 6 chiffres.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await authService.verifyTwoFactor(userId, code);
      login(user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Une erreur s'est produite.");
    } finally {
      setIsLoading(false);
    }
  };

  const methodLabel =
    method === "EMAIL" ? "votre adresse courriel" : "votre numéro de téléphone";

  return (
    <div className={styles["modal-overlay"]} onMouseDown={onClose}>
      <div
        className={styles["modal-content"]}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className={styles["modal-close-btn"]}
          onClick={onClose}
          aria-label="Fermer"
        >
          &times;
        </button>
        <h2>Double authentification</h2>
        <p style={{ color: "#555", fontSize: "14px", marginBottom: "20px" }}>
          Un code à 6 chiffres a été envoyé à {methodLabel}. Saisissez-le pour
          finaliser votre connexion.
        </p>
        <form onSubmit={handleSubmit} className={styles["modal-form"]}>
          {error && <div className={styles["modal-error"]}>{error}</div>}
          <input
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="Code à 6 chiffres"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            required
            autoFocus
            style={{
              letterSpacing: "8px",
              fontSize: "22px",
              textAlign: "center",
            }}
          />
          <button type="submit" disabled={isLoading || code.length !== 6}>
            {isLoading ? "Vérification..." : "Valider"}
          </button>
        </form>
        <p
          style={{
            color: "#888",
            fontSize: "12px",
            marginTop: "16px",
            textAlign: "center",
          }}
        >
          Le code est valide pendant 5 minutes.
        </p>
      </div>
    </div>
  );
}
