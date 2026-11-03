import { useState } from "react";
import styles from "./authModal.module.css";
import { authService } from "../../services/authService";
import { Eye, EyeOff } from "lucide-react";
import HelpModal from "../helpPage/modalHelp/modalHelp";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
}

export default function ResetPasswordModal({
  isOpen,
  onClose,
  token,
  onSuccess,
}: Props) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  if (!isOpen) return null;

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordRegex.test(password)) {
      setPasswordError(
        "8 caractères min., 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.",
      );
      return;
    }
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await authService.resetPassword({ token, password, passwordConfirm });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Une erreur s'est produite.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles["modal-overlay"]} onMouseDown={onClose}>
      <div
        className={styles["modal-content"]}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className={styles["modal-close-btn"]} onClick={onClose}>
          &times;
        </button>
        <h2>Nouveau mot de passe</h2>
        {isSuccess ? (
          <div className={styles["modal-form"]}>
            <p style={{ textAlign: "center", color: "#555" }}>
              Votre mot de passe a été mis à jour avec succès !
            </p>
            <button type="submit" onClick={onSuccess}>
              Se connecter
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles["modal-form"]}>
            {error && <div className={styles["modal-error"]}>{error}</div>}
            <div className={styles["modal-input-wrapper"]}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                onBlur={() => {
                  if (password && !passwordRegex.test(password))
                    setPasswordError(
                      "8 caractères min, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.",
                    );
                }}
                required
              />
              <button
                type="button"
                className={styles["modal-eye-btn"]}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {passwordError && (
              <div
                style={{
                  color: "#e74c3c",
                  fontSize: "12px",
                  marginTop: "-10px",
                  marginBottom: "10px",
                }}
              >
                {passwordError}
              </div>
            )}
            <div className={styles["modal-input-wrapper"]}>
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirmer le mot de passe"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles["modal-eye-btn"]}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Mise à jour..." : "Confirmer"}
            </button>
          </form>
        )}

        <HelpModal page="resetPassword" 
            isOpen={isHelpOpen==true} 
            onOpen={()=>setIsHelpOpen(true)} 
            onClose={()=>setIsHelpOpen(false)}
          /> 
      </div>
    </div>
  );
}
