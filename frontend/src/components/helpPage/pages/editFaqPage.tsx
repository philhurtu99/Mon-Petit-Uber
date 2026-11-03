import type { Step } from "../../../models";
import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function EditFaqPage({help }: {help: string | null}) {

  return (
     <div>
    <h4>✏️ Modifier une question FAQ</h4>

    <div>
      <p>
        Cette fenêtre permet de modifier une FAQ existante afin de mettre à jour la question, la réponse
        ou ses informations associées.
      </p>

      <p><strong>✏️ Question</strong></p>
      <ul data-help="question" className={(help === "question") ? "highlithedHelp" : ""}>
        <li>Modifiez la question si nécessaire.</li>
        <li>Elle doit rester claire et compréhensible pour l’utilisateur.</li>
        <li>Ce champ est obligatoire.</li>
      </ul>

      <p><strong>📝 Réponse</strong></p>
      <ul data-help="answer" className={(help === "answer") ? "highlithedHelp" : ""}>
        <li>Modifiez ou complétez la réponse existante.</li>
        <li>Vous pouvez ajouter des détails ou clarifier certaines étapes.</li>
        <li>Ce champ est obligatoire.</li>
      </ul>

      <p><strong>📂 Catégorie</strong></p>
      <ul data-help="category" className={(help === "category") ? "highlithedHelp" : ""}>
        <li>Changez la catégorie si la FAQ doit être déplacée.</li>
        <li>Permet de mieux organiser les questions dans le système.</li>
        <li>Ce champ est obligatoire.</li>
      </ul>

      <p><strong>🏷️ Mots-clés</strong></p>
      <ul data-help="metadata" className={(help === "metadata") ? "highlithedHelp" : ""}>
        <li>Ajoutez ou modifiez les mots-clés pour améliorer la recherche.</li>
        <li>Les mots doivent être séparés par des virgules.</li>
        <li>Exemple : <strong>livraison, commande, support</strong></li>
        <li>Ce champ est optionnel.</li>
      </ul>

      <p><strong>💾 Actions</strong></p>
      <ul data-help="actions" className={(help === "actions") ? "highlithedHelp" : ""}>
        <li><strong>Enregistrer</strong> : sauvegarde les modifications de la FAQ.</li>
        <li><strong>Annuler</strong> : ferme la fenêtre sans enregistrer les changements.</li>
        <li>Le bouton <strong>X</strong> permet aussi de fermer la modale.</li>
      </ul>
    </div>
  </div>
  );
}
