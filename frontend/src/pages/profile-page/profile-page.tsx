import PersonIcon from "@mui/icons-material/Person";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import HomeIcon from "@mui/icons-material/Home";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import StarsIcon from "@mui/icons-material/Stars";
import "./profile-page.css";
import { Box } from "@mui/material";
import defaultAvatar from "../../assets/default-avatar.png";
import { useAuth } from "../../contexts/authContext";
import { API_URL } from "../../config";
import { useEffect, useState } from "react";
import { userService } from "../../services/userService";
import { AvatarCropper } from "../../components/avatarCropper/avatarCropper";
import { useCreditBalance } from "../../hooks/useCreditBalance";
import { useLoyaltyPoints } from "../../hooks/useLoyaltyPoints";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";
import TwoFactorSettings from "../../components/Auth/TwoFactorSettings";
import MarketingPreferences  from "../../components/Auth/MarketingPreferences";
import {
  getLoyaltyDollarValue,
  useLoyaltyConfig,
} from "../../hooks/useLoyaltyConfig";

export function ProfilePage() {

  // Récupération de l'utilisateur connecté et de la fonction de mise à jour
  const { isLoggedIn, user, updateUser } = useAuth();
  const loyaltyConfig = useLoyaltyConfig();
  const creditBalance = useCreditBalance(isLoggedIn);
  const loyaltyPoints = useLoyaltyPoints(isLoggedIn, loyaltyConfig);
  const loyaltyDollarValue = getLoyaltyDollarValue(
    loyaltyPoints,
    loyaltyConfig,
  );

  // État pour gérer le mode édition
  const [editMode, setEditMode] = useState(false);

  // État pour la prévisualisation de l'avatar avant envoi
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // État pour stocker l'image brute avant recadrage
  const [rawImage, setRawImage] = useState<string | null>(null);

  // État pour stocker le fichier image sélectionné
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // État pour l'effet hover sur l'icône caméra
  const [cameraHover, setCameraHover] = useState(false);

  // État pour gérer les erreurs lors de la sauvegarde des modifications
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterSaving, setFilterSaving] = useState(false);

  const [popup, setPopup] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [cardTilt, setCardTilt] = useState({ rotateX: 0, rotateY: 0 });

  // État du formulaire avec les données de l'utilisateur
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    phone: "",
  });

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const { helpProps } = useHelpSystem();

  // Synchronisation du formulaire avec les données de l'utilisateur au chargement
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        address: user.address || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // Retourne la source de l'avatar selon la priorité : prévisualisation > photo de profil > avatar par défaut
  const getAvatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    if (!user?.profilePicture) return defaultAvatar;
    return user.profilePicture.startsWith("http")
      ? user.profilePicture
      : `${API_URL}${user.profilePicture}`;
  };

  // Met à jour le formulaire à chaque changement de champ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      // Garde seulement les chiffres
      const digits = value.replace(/\D/g, "").slice(0, 10);

      // Applique le format XXX-XXX-XXXX progressivement
      let formatted = digits;
      if (digits.length > 3) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
      if (digits.length > 6) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

      setFormData({ ...formData, phone: formatted });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Active le mode édition
  const handleEdit = () => setEditMode(true);

  // Annule les modifications et restaure les données originales
  const handleCancel = () => {
    setEditMode(false);
    setAvatarPreview(null);
    setAvatarFile(null);
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      address: user?.address || "",
      phone: user?.phone || "",
    });
  };

  // Envoie les modifications au serveur et met à jour le contexte utilisateur
  const handleSave = async () => {
    const form = new FormData();
    if (formData.firstName) form.append("firstName", formData.firstName);
    if (formData.lastName) form.append("lastName", formData.lastName);
    if (formData.email) form.append("email", formData.email);
    form.append("address", formData.address);
    form.append("phone", formData.phone);
    if (avatarFile) form.append("profilePicture", avatarFile);

    try {
      setSaveError(null);
      const data = await userService.updateProfile(form);
      updateUser(data.user);
      setEditMode(false);

      if (data.emailMessage) {
        setPopup({ message: data.emailMessage, type: "info" });
      } else {
        setPopup({ message: "Changements sauvegardés !", type: "success" });
      }
      setTimeout(() => setPopup(null), 3000);

    } catch (error: any) {
      console.error(error.message);
      setSaveError(error.message)
    }
  };

  const handleProfanityFilterToggle = async () => {
    if (!user || filterSaving) return;

    const nextEnabled = !(user.profanityFilterEnabled ?? true);
    setFilterSaving(true);
    setSaveError(null);

    try {
      const data = await userService.toggleProfanityFilter(nextEnabled);
      updateUser({
        ...user,
        profanityFilterEnabled: data.profanityFilterEnabled,
      });
      setPopup({ message: data.message, type: "success" });
      setTimeout(() => setPopup(null), 3000);
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setFilterSaving(false);
    }
  };

  // Gère la sélection d'une nouvelle image de profil
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setRawImage(URL.createObjectURL(file));
    }
    e.target.value = "";
  };

  // Confirme le recadrage et met à jour l'avatar
  const handleCropDone = (croppedFile: File) => {
    setAvatarFile(croppedFile);
    setAvatarPreview(URL.createObjectURL(croppedFile));
    setRawImage(null);
  };

  // Formate un numéro de téléphone en format XXX-XXX-XXXX
  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  /*
   * Gère le mouvement de la carte de fidélité en fonction de l'événement de souris.
  */
  const handleLoyaltyCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCardTilt({
      rotateX: Math.max(Math.min(y * -16, 10), -10),
      rotateY: Math.max(Math.min(x * 18, 12), -12),
    });
  };

  return (
    <Box className="profile__box-wrapper">
      <div className="profile__box-info">
        <div className="row">

          {/* Section avatar */}
          <div className="col-12 col-md-4 text-center mb-3 mb-md-0" style={{ display: "flex", alignItems: "center", justifyContent: "center", }}>
            <div className="profile__avatar-wrapper">

              {/* Image de profil avec effet hover */}
              <img className="profile__avatar" src={getAvatarSrc()} alt="Profil" referrerPolicy="no-referrer" style={cameraHover ? { transform: "scale(1.05)", filter: "brightness(0.9)" } : {}} />

              {/* Overlay affiché au survol */}
              <div className="profile__avatar-overlay" style={cameraHover ? { opacity: 1 } : {}}>
                <span>{editMode ? "Changer" : "Modifier"}</span>
              </div>

              {/* Bouton caméra pour changer la photo */}
              <div className="profile__avatar-camera"
                onMouseEnter={() => setCameraHover(true)}
                onMouseLeave={() => setCameraHover(false)}
                style={cameraHover ? { transform: "scale(1.25)" } : {}}
                onClick={() => {
                  if (!editMode) handleEdit();
                  document.getElementById("avatarInput")!.click();
                }}>
                <CameraAltIcon style={{ fontSize: 18, color: "#fdfbf7", backgroundColor: "#3e516d", }} {...helpProps("photo")} />
              </div>

              {/* Input fichier caché déclenché par le bouton caméra */}
              <input id="avatarInput" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />

              <p className="profile__text-camera">Cliquez sur l'icône caméra pour changer la photo</p>
            </div>
          </div>

          {/* Section formulaire */}
          <div className="col-12 col-md-8">
            <h5 className="profile__section-title">
              Informations personnelles

            </h5>
            <p className="profile__section-subtitle">
              Mettez à jour vos données personnelles. Ces informations seront
              visibles sur votre profil.
              {!editMode && (
                <span onClick={handleEdit} className="profile__edit-link">
                  Cliquez pour modifier
                </span>
              )}
            </p>

            {/* Champ prénom */}
            <div className="profile__field" {...helpProps("name")}>
              <p><PersonIcon className="profile__field-icon" />Prénom</p>
              {editMode ? (<input name="firstName" value={formData.firstName} onChange={handleChange} className="form-control"  />) :
                (<div className="profile__little-box">{user?.firstName}</div>)}
            </div>

            {/* Champ nom */}
            <div className="profile__field" {...helpProps("lastName")} >
              <p><PersonIcon className="profile__field-icon" />Nom</p>
              {editMode ? (<input name="lastName" value={formData.lastName} onChange={handleChange} className="form-control" />) :
                (<div className="profile__little-box">{user?.lastName || (<span style={{ color: "#a0aec0", fontStyle: "italic" }}>Non précisé</span>)}</div>)}
            </div>

            {/* Champ Adresse */}
            <div className="profile__field" {...helpProps("address")}>
              <p><HomeIcon className="profile__field-icon" />Adresse</p>
              {editMode ? (<input name="address" value={formData.address} onChange={handleChange} className="form-control" placeholder="Ex: 123 Rue Principale, Montréal"  />) :
                (<div className="profile__little-box">{user?.address || (<span style={{ color: "#a0aec0", fontStyle: "italic" }}>Non précisé</span>)}</div>)}
            </div>

            {/* Champ Email */}
            <div className="profile__field" {...helpProps("email")}>
              <p><EmailIcon className="profile__field-icon" />E-mail</p>
              {editMode ? (<input name="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="Example@mail.com" />) :
                (<div className="profile__little-box">{user?.email}</div>)}
            </div>

            {/* Champ Téléphone */}
            <div className="profile__field" {...helpProps("phone")}>
              <p><PhoneIcon className="profile__field-icon" />Téléphone</p>
              {editMode ? (<input name="phone" value={formData.phone} onChange={handleChange} className="form-control" placeholder="Ex: 514-123-4567" />) :
                (<div className="profile__little-box">{user?.phone ? formatPhone(user.phone) : <span style={{ color: "#a0aec0", fontStyle: "italic" }}>Non précisé</span>}</div>)}
            </div>

            {!editMode && creditBalance > 0 && (
              <div className="profile__field" {...helpProps("credit")}>
                <p><AccountBalanceWalletIcon className="profile__field-icon" />Solde de crédit</p>
                <div className="profile__little-box profile__little-box--credit">
                  {creditBalance.toFixed(2)} $
                </div>
              </div>
            )}

            {!editMode && (
              <div className="profile__field" {...helpProps("profanity-filter")}>
                <p>Filtre des commentaires</p>
                <button
                  type="button"
                  className={`profile__toggle ${user?.profanityFilterEnabled ?? true ? "is-on" : ""}`}
                  onClick={handleProfanityFilterToggle}
                  disabled={filterSaving}
                  aria-pressed={user?.profanityFilterEnabled ?? true}
                >
                  <span className="profile__toggle-track">
                    <span className="profile__toggle-thumb" />
                  </span>
                  <span>
                    {filterSaving
                      ? "Mise à jour..."
                      : user?.profanityFilterEnabled ?? true
                        ? "Activé"
                        : "Désactivé"}
                  </span>
                </button>
              </div>
            )}

            {!editMode && (
              <div className="profile__loyalty-scene">
                <div
                  className="profile__loyalty-card"
                  onMouseMove={handleLoyaltyCardMove}
                  onMouseLeave={() => setCardTilt({ rotateX: 0, rotateY: 0 })}
                  style={{
                    transform: `rotateX(${cardTilt.rotateX}deg) rotateY(${cardTilt.rotateY}deg)`,
                  }}
                >
                  <div className="profile__loyalty-shine" />
                  <div className="profile__loyalty-top">
                    <span>Carte de points</span>
                    <StarsIcon className="profile__loyalty-icon" />
                  </div>
                  <strong>{loyaltyPoints.toLocaleString("fr-CA")} pts</strong>
                  <div className="profile__loyalty-bottom">
                    <span>
                      {loyaltyDollarValue.toFixed(0)} $ utilisable
                    </span>
                    <span>
                      {loyaltyConfig
                        ? `${loyaltyConfig.loyaltyRedemptionStepPoints.toLocaleString("fr-CA")} pts = ${loyaltyConfig.loyaltyRedemptionStepValue.toFixed(2)} $`
                        : "Chargement..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {saveError && (
              <small className="profile__error-message">{saveError}</small>
            )}

            {/* boutons */}
            <div className="profile__actions">
              {editMode ? (
                <>
                  <button className="profile__btn-save" onClick={handleSave}>Enregistrer</button>
                  <button className="profile__btn-cancel" onClick={handleCancel}>Annuler</button>
                </>
              ) : (
                <div style={{ height: "45px" }} />
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Section 2FA - Sécurité */}
      <TwoFactorSettings helpProps={helpProps}/>
      <MarketingPreferences/>

      {rawImage && (<AvatarCropper imageSrc={rawImage} onCancel={() => setRawImage(null)} onCropDone={handleCropDone} />)}

      {popup && (
        <div className={`profile__popup profile__popup--${popup.type}`}>
          {popup.message}
        </div>
      )}

    </Box>
  );
}
