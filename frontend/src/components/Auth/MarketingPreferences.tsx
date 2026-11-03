import { useEffect, useState } from "react";
import CampaignIcon from "@mui/icons-material/Campaign";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import { userService } from "../../services/userService";
import "./marketingPreferences.css";


interface MarketingState {
  marketingConsent: boolean;
  marketingMethod: "EMAIL" | "SMS" | null;
  marketingConsentDate: string | null;
  phone: string | null;
}


// Section "Préférences marketing" dans la page profil.
// Permet à l'utilisateur de consentir aux offres promotionnelles (Loi 25)
// et de choisir son canal préféré (EMAIL ou SMS).
export default function MarketingPreferences() {
  const [state, setState] = useState<MarketingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // État du formulaire local (avant Enregistrer)
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<"EMAIL" | "SMS">("EMAIL");


  // Charge l'état actuel des préférences depuis l'API
  useEffect(() => {
    (async () => {
      try {
        const data = await userService.getMarketing();
        setState(data);
        setConsent(data.marketingConsent);
        if (data.marketingMethod) setMethod(data.marketingMethod);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };


  // Vérifie si l'utilisateur peut activer SMS (doit avoir un numéro de téléphone)
  const canUseSms = !!state?.phone;

  const isDirty = state ? (
    consent !== state.marketingConsent || (consent &&  method !== state.marketingMethod)
  ) : true;


  // Enregistre les préférences via l'API
  const handleSave = async () => {
    clearMessages();

    // Validation : SMS sans numéro
    if (consent && method === "SMS" && !canUseSms) {
      setError(
        "Pour recevoir des SMS, veuillez d'abord ajouter un numéro de téléphone dans vos informations personnelles."
      );
      return;
    }

    setSaving(true);
    try {
      const body = {
        marketingConsent: consent,
        marketingMethod: consent ? method : null,
      };
      const updated = await userService.updateMarketing(body);
      setState(updated);

      if (consent) {
        const methodLabel = method === "EMAIL" ? "courriel" : "SMS";
        setSuccess(`Préférences enregistrées. Vous recevrez les offres par ${methodLabel}.`);
      } else {
        setSuccess("Préférences enregistrées. Vous ne recevrez plus d'offres promotionnelles.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };


  // Formate une date ISO en date locale lisible
  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };


  if (loading) {
    return (
      <div className="profile__box-marketing">
        <p className="profile__marketing-loading">Chargement...</p>
      </div>
    );
  }


  return (
    <div className="profile__box-marketing">
      {/* Header */}
      <div className="profile__marketing-header">
        <CampaignIcon className="profile__marketing-icon" />
        <h3>Préférences marketing</h3>
      </div>

      <p className="profile__marketing-description">
        Choisissez si vous souhaitez recevoir des offres promotionnelles 
        et le canal de réception préféré. Modifiables à tout moment.
      </p>

      {/* Case principale - consentement */}
      <label className="profile__marketing-consent-row">
        <input
          type="checkbox"
          className="profile__marketing-checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            clearMessages();
          }}
        />
        <div className="profile__marketing-consent-text">
          <h4>J'accepte de recevoir des offres promotionnelles</h4>
          <p>Promotions, codes de rabais et nouveautés exclusives</p>
        </div>
      </label>

      {/* Cards des méthodes (désactivées si pas de consentement) */}
      <p className="profile__marketing-label">
        <CampaignIcon style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.514)" }} />
        Méthode de réception préférée
      </p>
      <div className="profile__marketing-method-group">
        <label
          className={
            "profile__marketing-method-card" +
            (!consent ? " profile__marketing-method-card--disabled" : "") +
            (method === "EMAIL" && consent ? " profile__marketing-method-card--active" : "")
          }
        >
          <input
            type="radio"
            name="marketing-method"
            value="EMAIL"
            checked={method === "EMAIL"}
            onChange={() => setMethod("EMAIL")}
            disabled={!consent}
          />
          <EmailIcon className="profile__marketing-method-icon" />
          Courriel
        </label>
        <label
          className={
            "profile__marketing-method-card" +
            (!consent ? " profile__marketing-method-card--disabled" : "") +
            (method === "SMS" && consent ? " profile__marketing-method-card--active" : "")
          }
        >
          <input
            type="radio"
            name="marketing-method"
            value="SMS"
            checked={method === "SMS"}
            onChange={() => setMethod("SMS")}
            disabled={!consent}
          />
          <SmsIcon className="profile__marketing-method-icon" />
          SMS
        </label>
      </div>

      {/* Warning : SMS choisi sans téléphone */}
      {consent && method === "SMS" && !canUseSms && (
        <div className="profile__marketing-warning">
          ⚠️ Pour recevoir des SMS, veuillez d'abord ajouter un numéro de téléphone 
          dans vos informations personnelles.
        </div>
      )}

      {/* Bouton */}
      <div className="profile__marketing-actions">
        <button
          className="profile__marketing-btn-save"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>

      {/* Messages */}
      {error && <div className="profile__marketing-error">{error}</div>}
      {success && <div className="profile__marketing-success">{success}</div>}

      {/* Historique du consentement */}
      {state?.marketingConsent && state.marketingConsentDate && (
        <div className="profile__marketing-history">
          Consentement actif depuis le {formatDate(state.marketingConsentDate)} 
          {" — Méthode : "}
          {state.marketingMethod === "EMAIL" ? "Courriel" : "SMS"}
        </div>
      )}
    </div>
  );
}
