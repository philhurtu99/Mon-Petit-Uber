import { useEffect, useState } from "react";
import SecurityIcon from "@mui/icons-material/Security";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import PhoneIcon from "@mui/icons-material/Phone";
import { userService } from "../../services/userService";
import "./twoFactorSettings.css";
import { useHelpSystem } from "../helpPage/hooks/useHelpSystem";




interface TwoFactorState {
 twoFactorEnabled: boolean;
 twoFactorMethod: "EMAIL" | "SMS" | null;
 phone: string | null;
}




// Indicatifs régionaux canadiens officiels (NPA)
const CANADA_AREA_CODES_REGEX = /^(?:204|226|236|249|250|263|289|306|343|354|365|367|382|403|416|418|428|431|437|438|450|474|506|514|519|548|579|581|584|587|604|613|639|647|672|683|705|709|742|753|778|780|782|807|819|825|867|873|879|902|905)$/;


// Séquences évidentes complètes à rejeter
const OBVIOUS_SEQUENCES = new Set([
 "0123456789", "1234567890", "2345678901", "3456789012", "4567890123",
 "5678901234", "6789012345", "7890123456", "8901234567", "9012345678",
 "9876543210", "0987654321", "1098765432", "2109876543", "3210987654",
 "4321098765", "5432109876", "6543210987", "7654321098", "8765432109",
]);




// Formate un numéro brut en format E.164 (+15147051234) pour envoi à l'API Twilio.
// Doit être appelé APRÈS isValidPhone qui garantit que le numéro est valide.
function toE164(phone: string): string {
 const digits = phone.replace(/\D/g, "");
 if (digits.length === 10) return `+1${digits}`;
 if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
 return phone; // fallback (ne devrait pas arriver après isValidPhone)
}




// Formate automatiquement un numéro pendant la saisie : 5147051234 -> 514-705-1234
function formatPhoneDisplay(value: string): string {
 const digits = value.replace(/\D/g, "").substring(0, 11);
 if (digits.length === 11) {
   return `${digits[0]}-${digits.substring(1, 4)}-${digits.substring(4, 7)}-${digits.substring(7)}`;
 }
 if (digits.length > 6) {
   return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
 }
 if (digits.length > 3) {
   return `${digits.substring(0, 3)}-${digits.substring(3)}`;
 }
 return digits;
}




// Valide qu'un numéro de téléphone est conforme au format canadien (NANP)
// Règles : 10 ou 11 chiffres, NPA canadien valide, NXX commence par 2-9, pas de pattern bidon
function isValidPhone(phone: string): { valid: boolean; error?: string } {
 const digits = phone.replace(/\D/g, "");


 if (digits.length < 10) {
   return { valid: false, error: "Le numéro doit contenir au moins 10 chiffres." };
 }
 if (digits.length > 11) {
   return { valid: false, error: "Le numéro est trop long (maximum 11 chiffres avec l'indicatif +1)." };
 }


 // Si 11 chiffres, doit commencer par 1 (indicatif Amérique du Nord)
 if (digits.length === 11 && !digits.startsWith("1")) {
   return { valid: false, error: "Le numéro à 11 chiffres doit commencer par 1." };
 }


 // On extrait les 10 derniers chiffres (sans l'indicatif pays si présent)
 const npaAndNumber = digits.length === 11 ? digits.substring(1) : digits;


 // Vérification de l'indicatif régional canadien
 const areaCode = npaAndNumber.substring(0, 3);
 if (!CANADA_AREA_CODES_REGEX.test(areaCode)) {
   return { valid: false, error: "Ce code régional n'est pas un indicatif canadien valide." };
 }


 // Vérification du préfixe (NXX) - le 4e chiffre doit être entre 2 et 9
 if (npaAndNumber[3] === "0" || npaAndNumber[3] === "1") {
   return { valid: false, error: "Le préfixe du numéro doit commencer par un chiffre entre 2 et 9." };
 }


 // Détection des patterns bidon : tous les chiffres identiques (ex: 5555555555)
 if (/^(\d)\1+$/.test(npaAndNumber)) {
   return { valid: false, error: "Numéro invalide (chiffres répétés)." };
 }


 // Détection des séquences évidentes complètes (1234567890, 0987654321, etc.)
 if (OBVIOUS_SEQUENCES.has(npaAndNumber)) {
   return { valid: false, error: "Numéro invalide (séquence évidente)." };
 }


 return { valid: true };
}

type HelpPropsFunction = (key: string) => {
  [key: string]: any;
};

type Props = {
  helpProps: HelpPropsFunction;
};


// Section "Sécurité" dans la page profil pour gérer la double authentification.
// Permet d'activer/désactiver la 2FA et de choisir la méthode (EMAIL ou SMS).
export default function TwoFactorSettings({ helpProps }: Props) {
 const [state, setState] = useState<TwoFactorState | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<string | null>(null);
 const [phoneInput, setPhoneInput] = useState("");
 const [selectedMethod, setSelectedMethod] = useState<"EMAIL" | "SMS">("EMAIL");

 // Charge l'état actuel de la 2FA depuis l'API
 useEffect(() => {
   (async () => {
     try {
       const data = await userService.getTwoFactor();
       setState(data);
       if (data.twoFactorMethod) setSelectedMethod(data.twoFactorMethod);
       // On formate le numéro venant de la BD pour qu'il s'affiche proprement
       if (data.phone) setPhoneInput(formatPhoneDisplay(data.phone));
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




 // Active la 2FA avec la méthode et le téléphone choisis
 const handleEnable = async () => {
   clearMessages();




   if (selectedMethod === "SMS") {
     const validation = isValidPhone(phoneInput);
     if (!validation.valid) {
       setError(validation.error || "Numéro de téléphone invalide.");
       return;
     }
   }




   setSaving(true);
   try {
     const body: any = { enabled: true, method: selectedMethod };
     if (selectedMethod === "SMS" && phoneInput) {
       // On envoie au backend le format E.164 propre (+15147051234)
       // pour que Twilio accepte sans avoir à nettoyer côté backend
       body.phone = toE164(phoneInput);
     }
     const res = await userService.toggleTwoFactor(body);
     setState({
       twoFactorEnabled: res.twoFactorEnabled,
       twoFactorMethod: res.twoFactorMethod,
       phone: phoneInput || state?.phone || null,
     });
     setSuccess("Double authentification activée.");
   } catch (e: any) {
     setError(e.message);
   } finally {
     setSaving(false);
   }
 };




 // Désactive la 2FA
 const handleDisable = async () => {
   clearMessages();
   setSaving(true);
   try {
     const res = await userService.toggleTwoFactor({ enabled: false });
     setState({
       twoFactorEnabled: res.twoFactorEnabled,
       twoFactorMethod: res.twoFactorMethod,
       phone: state?.phone || null,
     });
     setSuccess("Double authentification désactivée.");
   } catch (e: any) {
     setError(e.message);
   } finally {
     setSaving(false);
   }
 };




 if (loading) {
   return (
     <div className="profile__box-security">
       <p className="profile__security-loading">Chargement...</p>
     </div>
   );
 }




 return (
   <div className="profile__box-security">
     {/* Header avec icône et titre */}
     <div className="profile__security-header">
       <SecurityIcon className="profile__security-icon" />
       <h3>Sécurité — Double authentification</h3>
     </div>




     <p className="profile__security-description">
       Ajoutez une couche de sécurité supplémentaire à votre compte. À chaque
       connexion, un code à 6 chiffres vous sera envoyé pour valider l'accès.
     </p>




     {state?.twoFactorEnabled ? (
       // ====================================================================
       // ÉTAT ACTIVÉ
       // ====================================================================
       <>
         <div className="profile__security-status" {...helpProps("activate")}>
           <span className="profile__security-status-label">
             <span className="profile__security-badge">✓ Activée</span>
             Méthode : <strong>{state.twoFactorMethod === "EMAIL" ? "Courriel" : "SMS"}</strong>
           </span>
           <button
             className="profile__security-btn-disable"
             onClick={handleDisable}
             disabled={saving}
           >
             {saving ? "..." : "Désactiver" }
           </button>
         </div>
       </>
     ) : (
       // ====================================================================
       // ÉTAT DÉSACTIVÉ - Formulaire d'activation
       // ====================================================================
       <>
         <div className="profile__security-status">
           <span className="profile__security-status-label">
             <span className="profile__security-badge profile__security-badge--inactive">
               Désactivée
             </span>
             <span>Activez la 2FA ci-dessous</span>
           </span>
         </div>




         {/* Choix de la méthode */}
         <p className="profile__security-label">
           <SecurityIcon style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.514)" }} />
           Méthode de réception
         </p>
         <div className="profile__security-radio-group" {...helpProps("2Fa")}>
           <label
             className={
               "profile__security-radio-option" +
               (selectedMethod === "EMAIL" ? " profile__security-radio-option--active" : "")
             }
           >
             <input
               type="radio"
               name="2fa-method"
               value="EMAIL"
               checked={selectedMethod === "EMAIL"}
               onChange={() => setSelectedMethod("EMAIL")}
             />
             <EmailIcon className="profile__security-radio-option-icon" />
             Courriel
           </label>
           <label
             className={
               "profile__security-radio-option" +
               (selectedMethod === "SMS" ? " profile__security-radio-option--active" : "")
             }
           >
             <input
               type="radio"
               name="2fa-method"
               value="SMS"
               checked={selectedMethod === "SMS"}
               onChange={() => setSelectedMethod("SMS")}
             />
             <SmsIcon className="profile__security-radio-option-icon" />
             SMS
           </label>
         </div>




         {/* Champ téléphone si SMS sélectionné */}
         {selectedMethod === "SMS" && (
           <div className="profile__security-phone-block" {...helpProps("2FaBySms")}>
             <p className="profile__security-label">
               <PhoneIcon style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.514)" }} />
               Numéro de téléphone
             </p>
             <input
               type="tel"
               className="profile__security-input"
               placeholder="Ex: 514-705-1234"
               value={phoneInput}
               onChange={(e) => {
                 // Formatage automatique pendant la saisie pour une UX cohérente
                 // avec le formulaire d'inscription (RegisterModal.tsx)
                 setPhoneInput(formatPhoneDisplay(e.target.value));
               }}
               maxLength={16}
             />
             <small className="profile__security-hint">
               Format canadien (10 chiffres). Ce numéro recevra les codes de vérification.
             </small>
           </div>
         )}




         {/* Bouton d'action */}
         <div className="profile__security-actions" {...helpProps("activate")}>
           <button
             className="profile__security-btn-enable"
             onClick={handleEnable}
             disabled={saving}
           >
             {saving ? "..." : "Activer la 2FA"}
           </button>
         </div>
       </>
     )}




     {/* Messages d'erreur et succès */}
     {error && <div className="profile__security-error">{error}</div>}
     {success && <div className="profile__security-success">{success}</div>}
   </div>
 );
}



