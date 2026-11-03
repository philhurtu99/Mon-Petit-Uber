import type { Step } from "../../../models";
import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function AddFaqPage({help }: {help: string | null}) {

  return (
 <div>
    <h4>❓ Ajouter une question FAQ</h4>

    <div>
      <p>
        Cette fenêtre permet d’ajouter une nouvelle question fréquente (FAQ) avec sa réponse,
        afin d’aider les utilisateurs à trouver rapidement des informations.
      </p>

      <p><strong>✏️ Question</strong></p>
      <ul data-help="question" className={(help === "question") ? "highlithedHelp" : ""}>
        <li>Entrez la question que les utilisateurs peuvent se poser.</li>
        <li>Exemple : <strong>Comment passer une commande ?</strong></li>
        <li>Ce champ est obligatoire.</li>
      </ul>

      <p><strong>📝 Réponse</strong></p>
      <ul data-help="answer" className={(help === "answer") ? "highlithedHelp" : ""}>
        <li>Ajoutez une réponse claire et détaillée.</li>
        <li>Expliquez les étapes si nécessaire.</li>
        <li>Ce champ est obligatoire.</li>
      </ul>

      <p><strong>📂 Catégorie</strong></p>
      <ul data-help="category" className={(help === "category") ? "highlithedHelp" : ""}>
        <li>Sélectionnez la catégorie de la FAQ.</li>
        <li>Permet de classer les questions (ex : commande, livraison, paiement).</li>
        <li>Ce champ est obligatoire.</li>
      </ul>

      <p><strong>🏷️ Mots-clés</strong></p>
      <ul data-help="metadata" className={(help === "metadata") ? "highlithedHelp" : ""}>
        <li>Ajoutez des mots-clés séparés par des virgules.</li>
        <li>Aide à la recherche rapide de la FAQ.</li>
        <li>Exemple : <strong>livraison, commande, panier</strong></li>
        <li>Ce champ est optionnel.</li>
      </ul>

      <p><strong>💾 Actions</strong></p>
      <ul data-help="actions" className={(help === "actions") ? "highlithedHelp" : ""}>
        <li><strong>Ajouter</strong> : enregistre la nouvelle FAQ.</li>
        <li><strong>Annuler</strong> : ferme la fenêtre sans sauvegarder.</li>
        <li>Le bouton de fermeture (<strong>X</strong>) ferme également la modale.</li>
      </ul>
    </div>
  </div>
   
  );
}
