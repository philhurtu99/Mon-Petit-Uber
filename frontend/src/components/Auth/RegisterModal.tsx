import { useState } from "react";
import styles from "./authModal.module.css";
import { authService } from "../../services/authService";
import mascotte from "../../assets/Mascotte-PouceEnHaut.png";
import { Eye, EyeOff, ImagePlus } from "lucide-react";
import confetti from "canvas-confetti";
import HelpModal from "../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../helpPage/hooks/useHelpSystem";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterModal({
  isOpen,
  onClose,
  onSwitchToLogin,
}: RegisterModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    address: "",
    phone: "",
    marketingConsent: false,
    marketingMethod: "EMAIL" as "EMAIL" | "SMS",
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol  
  const { helpProps } = useHelpSystem();

  if (!isOpen) return null;

  const handlePasswordBlur = () => {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (
      formData.password.length > 0 &&
      !passwordRegex.test(formData.password)
    ) {
      setPasswordError(
        "Le mot de passe doit contenir 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.",
      );
    } else {
      setPasswordError("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "password" && passwordError) {
      setPasswordError("");
    }

    if (name === "phone") {
      const digits = value.replace(/\D/g, "").substring(0, 10);
      if (digits.length > 6) {
        newValue = `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
      } else if (digits.length > 3) {
        newValue = `${digits.substring(0, 3)}-${digits.substring(3)}`;
      } else {
        newValue = digits;
      }
    }

    setFormData({ ...formData, [name]: newValue });
    setError("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePicture(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (passwordError) {
      setError("Veuillez corriger les erreurs avant de continuer.");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (formData.phone && formData.phone.length < 12) {
      setError("Veuillez entrer un numéro de téléphone valide");
      return;
    }

    setIsLoading(true);

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        const value = formData[key as keyof typeof formData];
        //submitData.append(key, formData[key as keyof typeof formData]);
        submitData.append(key, String(value));
      });
      if (profilePicture) {
        submitData.append("profilePicture", profilePicture);
      }
      const res = await authService.register(submitData);
      if (res.message.includes("créé")) {
        setIsSuccess(true);
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 },
          zIndex: 9999,
        });
      }
    } catch (err: any) {
      setError(err.message || "Une erreur s'est produite.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess)
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
          <div className={styles["modal-success"]}>
            <img
              src={mascotte}
              alt="Mascotte"
              className={styles["modal-success-mascotte"]}
            />
            <h2>Félicitations !</h2>
            <p>Votre compte a été créé avec succès.</p>
            <p>
              Il vous suffit de confirmer votre courriel via le lien reçu par
              courriel.
            </p>
            <button onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    );

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
        <h2>Inscription</h2>
        <form onSubmit={handleSubmit} className={styles["modal-form"]}>
          {error && <div className={styles["modal-error"]}>{error}</div>}

          <div className={styles["form-row"]}>
            <input
              name="firstName"
              placeholder="Prénom"
              value={formData.firstName}
              onChange={handleChange}
              required
              {...helpProps("base")} 
            />
            <input
              name="lastName"
              placeholder="Nom"
              value={formData.lastName}
              onChange={handleChange}
              required
              {...helpProps("base")} 
            />
          </div>

          <input
            name="email"
            type="email"
            placeholder="Courriel"
            value={formData.email}
            onChange={handleChange}
            required
            {...helpProps("base")} 
          />
          <div className={styles["modal-input-wrapper"]}>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              onBlur={handlePasswordBlur}
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
          {passwordError && (
            <div
              style={{
                color: "#e74c3c",
                fontSize: "12px",
                marginTop: "-10px",
                marginBottom: "10px",
                textAlign: "left",
                width: "100%",
                padding: "0 5px",
              }}
            >
              {passwordError}
            </div>
          )}
          <div className={styles["modal-input-wrapper"]}>
            <input
              name="passwordConfirm"
              type={showPasswordConfirm ? "text" : "password"}
              placeholder="Confirmez le mot de passe"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required
              {...helpProps("confirmation")} 
            />
            <button
              type="button"
              className={styles["modal-eye-btn"]}
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            >
              {!showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            type="button"
            className={styles["modal-optional-toggle"]}
            onClick={() => setShowOptional(!showOptional)}
            {...helpProps("optionnel")} 
          >
            <span>Informations optionnelles</span>
            <span
              className={`${styles["modal-optional-arrow"]} ${showOptional ? styles["open"] : ""}`}
            >
              ▼
            </span>
          </button>

          {showOptional && (
            <>
              <input
                name="address"
                placeholder="Adresse (Optionnel)"
                value={formData.address}
                onChange={handleChange}
                {...helpProps("optionnel")} 
              />
              <input
                name="phone"
                type="tel"
                maxLength={12}
                placeholder="Téléphone (Optionnel)"
                value={formData.phone}
                onChange={handleChange}
                {...helpProps("optionnel")} 
              />
              <div className={styles["modal-file-upload"]} {...helpProps("optionnel")} >
                <input
                  type="file"
                  id="profilePictureInput"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles["modal-file-input-hidden"]}
                />
                <label
                  htmlFor="profilePictureInput"
                  className={styles["modal-file-label"]}
                >
                  <ImagePlus size={20} className={styles["modal-file-icon"]} />
                  <span className={styles["modal-file-text"]}>
                    {profilePicture
                      ? profilePicture.name
                      : "Photo de profil (Optionnel)"}
                  </span>
                </label>
              </div>

              {/* Section marketing */}
              <div style={{
                backgroundColor: "#f0f4ff",
                borderLeft: "3px solid #8dc640",
                padding: "12px 16px",
                borderRadius: "8px",
                margin: "12px 0"
              }}>
                <label style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  cursor: "pointer",
                  marginBottom: formData.marketingConsent ? "10px" : "0"
                }}>
                  <input
                    type="checkbox"
                    checked={formData.marketingConsent}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketingConsent: e.target.checked
                    })}
                    style={{ 
                      width: "18px", 
                      height: "18px", 
                      accentColor: "#8dc640",
                      cursor: "pointer"
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#3e516d" }}>
                    J'accepte de recevoir des offres promotionnelles (Optionnel)
                  </span>
                </label>
                
                {formData.marketingConsent && (
                  <div style={{ 
                    display: "flex", 
                    gap: "16px", 
                    paddingLeft: "28px",
                    marginTop: "8px"
                  }}>
                    <label style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px", 
                      cursor: "pointer" 
                    }}>
                      <input
                        type="radio"
                        name="marketingMethod"
                        value="EMAIL"
                        checked={formData.marketingMethod === "EMAIL"}
                        onChange={() => setFormData({ 
                          ...formData, 
                          marketingMethod: "EMAIL" 
                        })}
                        style={{ accentColor: "#8dc640" }}
                      />
                      <span style={{ fontSize: "13px", color: "#3e516d" }}>
                        📧 Courriel
                      </span>
                    </label>
                    <label style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px", 
                      cursor: "pointer" 
                    }}>
                      <input
                        type="radio"
                        name="marketingMethod"
                        value="SMS"
                        checked={formData.marketingMethod === "SMS"}
                        onChange={() => setFormData({ 
                          ...formData, 
                          marketingMethod: "SMS" 
                        })}
                        style={{ accentColor: "#8dc640" }}
                      />
                      <span style={{ fontSize: "13px", color: "#3e516d" }}>
                        📱 SMS
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </>
            
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Inscription..." : "S'inscrire"}
          </button>
          <button
            type="button"
            className={styles["modal-switch-btn"]}
            onClick={onSwitchToLogin}
            {...helpProps("login")} 
          >
            Déjà un compte ? Se connecter
          </button>
        </form>

        <HelpModal page="register" 
            isOpen={isHelpOpen==true} 
            onOpen={()=>setIsHelpOpen(true)} 
            onClose={()=>setIsHelpOpen(false)}
          /> 
      </div>
    </div>
  );
}
