import { useState } from "react";
import styles from "./authModal.module.css";
import { authService } from "../../services/authService";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../contexts/authContext";
import { API_URL } from "../../config";
import HelpModal from "../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../helpPage/hooks/useHelpSystem";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
  onTwoFactorRequired?: (userId: string, method: "EMAIL" | "SMS") => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSwitchToRegister,
  onForgotPassword,
  onTwoFactorRequired,
}: LoginModalProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();
  
  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await authService.login(formData);
      // Si la 2FA est activée, on passe la main au modal 2FA
      if (res.requiresTwoFactor) {
        if (onTwoFactorRequired) {
          onTwoFactorRequired(res.userId, res.method);
        }
        return;
      }
      login(res);
      onClose();
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
        <button
          className={styles["modal-close-btn"]}
          onClick={onClose}
          aria-label="Fermer"
        >
          &times;
        </button>
        <h2>Connexion</h2>
        <form onSubmit={handleSubmit} className={styles["modal-form"]}>
          {error && <div className={styles["modal-error"]}>{error}</div>}

          <input
            name="email"
            type="email"
            placeholder="Courriel"
            value={formData.email}
            onChange={handleChange}
            required
            {...helpProps("email")} 
          />
          <div className={styles["modal-input-wrapper"]}>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              required
              {...helpProps("password")} 
            />
            <button
              type="button"
              className={styles["modal-eye-btn"]}
              onClick={() => setShowPassword(!showPassword)}
            >
              {!showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            type="button"
            className={styles["modal-forgot-btn"]}
            onClick={onForgotPassword}
            {...helpProps("forgot")} 
          >
            Mot de passe oublié ?
          </button>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <div className={styles["modal-divider"]}>
          <span>ou</span>
        </div>

        <button
          type="button"
          className={styles["modal-google-btn"]}
          onClick={() => {
            window.location.href = `${API_URL}/api/auth/google`;
          }}
          {...helpProps("google")} 
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            style={{ width: "18px", marginRight: "8px" }}
          />
          Continuer avec Google
        </button>

        <button
          type="button"
          className={styles["modal-switch-btn"]}
          onClick={onSwitchToRegister}
          {...helpProps("register")} 
        >
          Pas de compte ? S'inscrire
        </button>

        <HelpModal page="login" 
          isOpen={isHelpOpen==true} 
          onOpen={()=>setIsHelpOpen(true)} 
          onClose={()=>setIsHelpOpen(false)}
        /> 

      </div>
     

    </div>
  );
}
