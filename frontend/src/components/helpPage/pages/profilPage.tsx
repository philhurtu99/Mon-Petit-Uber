import type { Step } from "../../../models";
import VideoStep from "../video-step/video-step";
import "../helpPage.css";
import { UTurnLeft } from "@mui/icons-material";

 const steps: Step[] = [
    { label: "Recherche ou filtre ", time: 0 },
    { label: "Sélectionne des produits ", time: 15 },
    { label: "Ajoute au panier ", time: 35 },
    { label: "Change de page ", time: 55 }
  ];

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function ProfilPage({help }: {help: string | null}) {

  return (
    <div>
      <h2>🧑‍💼 Aide – Profil</h2>
      <div>

        <p>
          Pour modifier votre profil, cliquez sur <strong>"Cliquez pour modifier"</strong>, 
          effectuez les changements souhaités, puis enregistrez.
        </p>

        <VideoStep videoSrc="userChangementAvatarEtInfo.mp4" />
          
        <p><strong>👤 Prénom</strong></p>
        <ul data-help="name" className={(help === "name") ? "highlithedHelp" : "" }>
          <li>Champ <strong>obligatoire</strong></li>
          <li>Doit contenir au moins <strong>2 caractères</strong></li>
        </ul>

        <p><strong>👤 Nom de famille</strong></p>
        <ul data-help="lastName" className={(help === "lastName") ? "highlithedHelp" : "" }>
          <li>Champ <strong>optionnel</strong></li>
          <li>Doit contenir au moins <strong>2 caractères</strong> si rempli</li>
        </ul>

        <p><strong>📍 Adresse</strong></p>
        <ul data-help="address" className={(help === "address") ? "highlithedHelp" : "" }>
          <li>Champ <strong>optionnel</strong></li>
        </ul>

        <p><strong>✉️ Courriel</strong></p>
        <ul data-help="email" className={(help === "email") ? "highlithedHelp" : "" }>
          <li>Champ <strong>obligatoire</strong></li>
          <li>Doit être une adresse <strong>valide</strong></li>
        </ul>

        <p><strong>✉️ Téléphone</strong></p>
        <ul data-help="phone" className={(help === "phone") ? "highlithedHelp" : "" }>
          <li>Champ <strong>optionnel</strong></li>
        </ul>

        <p><strong>📷 Photo de profil</strong></p>
        <ul data-help="photo" className={(help === "photo") ? "highlithedHelp" : "" }>
          <li>Champ <strong>optionnel</strong></li>
          <li>
            Cliquez sur l’icône <strong>caméra</strong> pour sélectionner une image depuis votre appareil
          </li>
          <li>
            Formats acceptés : 
            <strong> .jpg, .jpeg, .png, .webp, .gif, .svg, .heic, .avif, .bmp, .tiff</strong>
          </li>
        </ul>

        <p><strong>📌 Affichage du solde</strong></p>
        <ul data-help="credit" className={help === "credit" ? "highlithedHelp" : ""}>
          <li>Le crédit peut être utilisé pour réduire le montant de vos achats.</li>
          <li>Le solde de crédit est affiché uniquement si vous n’êtes pas en mode édition.</li>
          <li>Il n’est visible que si votre solde est supérieur à 0.</li>
        </ul>

        <p><strong>⚙️ Activation du filtre</strong></p>
        <ul data-help="profanity-filter" className={help === "profanity-filter" ? "highlithedHelp" : ""}>
          <li>Le filtre bloque ou masque les mots considérés comme offensants.</li>
          <li>Cliquez sur le bouton pour activer ou désactiver le filtre.</li>
          <li>Si activé, les commentaires contenant des mots interdits sont filtrés automatiquement.</li>
          <li>Si désactivé, tous les commentaires sont affichés sans filtrage.</li>
        </ul>

        <p><strong>⚠️ Erreurs possibles</strong></p>
        <ul>
          <li>Nom ou prénom trop courts</li>
          <li>Adresse courriel invalide</li>
          <li>Champs obligatoires manquants</li>
        </ul>
      </div>

        <h4>🔐 Double authentification</h4>

        <div>
            <p>
            Cette page permet d’ajouter une couche de sécurité supplémentaire à votre compte grâce à la double authentification (2FA).
            Lors de chaque connexion, un code de vérification à 6 chiffres sera demandé pour confirmer votre identité.
            </p>

            <p><strong>🛡️ État de la sécurité</strong></p>
            <ul data-help="activate" className={(help === "activate") ? "highlithedHelp" : ""}>
            <li>Vous pouvez voir si la double authentification est activée ou désactivée.</li>
            <li>Lorsque la 2FA est active, la méthode utilisée (Courriel ou SMS) est affichée.</li>
            <li>Il est possible de désactiver la protection à tout moment.</li>
            </ul>

            <p><strong>📨 Choix de la méthode</strong></p>
            <ul data-help="2Fa" className={(help === "2Fa") ? "highlithedHelp" : ""}>
            <li>Choisissez comment recevoir vos codes de connexion.</li>
            <li>Deux méthodes sont disponibles : Courriel ou SMS.</li>
            <li>La méthode sélectionnée sera utilisée lors des prochaines connexions.</li>
            </ul>

            <p><strong>📱 Vérification par SMS</strong></p>
            <ul data-help="2FaBySms" className={(help === "2FaBySms") ? "highlithedHelp" : ""}>
            <li>Si vous choisissez SMS, un numéro de téléphone canadien est requis.</li>
            <li>Le numéro doit contenir 10 chiffres.</li>
            <li>Les codes de vérification seront envoyés à ce numéro.</li>
            </ul>

            <p><strong>✅ Activation</strong></p>
            <ul data-help="activate" className={(help === "activate") ? "highlithedHelp" : ""}>
            <li>Cliquez sur « Activer la 2FA » pour sécuriser votre compte.</li>
            <li>Un message de confirmation apparaîtra après l’activation.</li>
            <li>En cas d’erreur, un message explicatif sera affiché.</li>
            </ul>
        </div>
    
    </div>
  );
}
