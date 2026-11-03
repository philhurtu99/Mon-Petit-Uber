import type { Step } from "../../../models";
import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function FaqAdminPage({help }: {help: string | null}) {

  return (
    <div>
    <h4>❓ Gestion des FAQ</h4>
    <VideoStep videoSrc="AdminAjoutFAQ.mp4" />

    <div>
        <p>
        Cette page permet de gérer toutes les questions fréquentes (FAQ) de votre application.
        Vous pouvez ajouter, modifier, supprimer et filtrer les questions par catégorie.
        </p>

        <p><strong>📦 Structure d’une FAQ</strong></p>
        <ul data-help="questions" className={help === "questions" ? "highlithedHelp" : ""}>
          <li><strong>Catégorie</strong> : type de question (Livraison, Paiement, etc.)</li>
          <li><strong>Question</strong> : texte affiché à l’utilisateur</li>
          <li><strong>Réponse</strong> : explication détaillée</li>
          <li><strong>Meta-données</strong> : mots-clés pour la recherche</li>
        </ul>

        <p><strong>➕ Ajouter une FAQ</strong></p>
        <ul data-help="add" className={help === "add" ? "highlithedHelp" : ""}>
          <li>Cliquez sur le bouton <strong>"Ajouter une question"</strong> en haut à droite.</li>
          <li>Remplissez le formulaire (catégorie, question, réponse).</li>
          <li>Ajoutez des mots-clés si nécessaire pour améliorer la recherche.</li>
          <li>Validez pour enregistrer la nouvelle FAQ.</li>
        </ul>

        <p><strong>✏️ Modifier une FAQ</strong></p>
        <ul data-help="edit" className={help === "edit" ? "highlithedHelp" : ""}>
          <li>Cliquez sur l’icône ✏️ sur la carte de la FAQ.</li>
          <li>Modifiez la question, la réponse ou la catégorie.</li>
          <li>Cliquez sur "Enregistrer" pour appliquer les changements.</li>
        </ul>

        <p><strong>🗑️ Supprimer une FAQ</strong></p>
        <ul data-help="delete" className={help === "delete" ? "highlithedHelp" : ""}>
          <li>Cliquez sur l’icône 🗑️ sur la carte.</li>
          <li>Confirmez la suppression dans la fenêtre de dialogue.</li>
          <li>La FAQ sera définitivement supprimée.</li>
        </ul>

        <p><strong>🔎 Filtrer les FAQ</strong></p>
        <ul data-help="filter" className={help === "filter" ? "highlithedHelp" : ""}>
          <li>Utilisez les boutons de catégories (Livraison, Paiement, Menu, Autre).</li>
          <li>Choisissez "Toutes" pour réafficher la liste complète.</li>
          <li>Le filtre permet de retrouver rapidement une FAQ spécifique.</li>
        </ul>
    </div>
    </div>
  );
}
