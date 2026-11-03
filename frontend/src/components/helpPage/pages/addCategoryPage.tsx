import type { Step } from "../../../models";
import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function AddCategoryPage({help }: {help: string | null}) {

  return (
    <div>
      <h4>🧾 Ajouter une catégorie</h4>
      <VideoStep videoSrc="AdminCreationCategorieProduit.mp4" />
      <div>
      <p>
        Cette fenêtre permet de créer une nouvelle catégorie pour organiser les produits.
      </p>

      <p ><strong>🔤 Nom de la catégorie</strong></p>
      <ul data-help="name" className={(help === "name") ? "highlithedHelp" : "" }>
        <li>Entrez un nom descriptif (ex : <strong>Fruits</strong>, <strong>Légumes</strong>, <strong>Boissons</strong>).</li>
        <li>Ce champ est obligatoire.</li>
      </ul>

      <p><strong>🎨 Choisir une couleur</strong></p>
      <ul data-help="color" className={(help === "color") ? "highlithedHelp" : ""}>
        <li>Cliquez sur le sélecteur de couleur pour choisir visuellement.</li>
        <li>Ou entrez un code couleur (ex : <code>#FF0000</code>).</li>
        <li>L’aperçu à droite montre le rendu final.</li>
      </ul>

      <p><strong>💾 Ajouter la catégorie</strong></p>
      <ul data-help="actions" className={(help === "actions") ? "highlithedHelp" : ""}>
        <li>Cliquez sur <strong>Ajouter</strong> pour enregistrer.</li>
        <li>Un message d’erreur s’affiche si un champ est vide.</li>
      </ul>

      <p><strong>❌ Annuler</strong></p>
      <ul data-help="actions" className={(help === "actions") ? "highlithedHelp" : ""}>
        <li>Cliquez sur <strong>Annuler</strong> ou sur le bouton ❌ pour fermer sans enregistrer.</li>
      </ul>

      <p><strong>💡 Conseils</strong></p>
      <ul>
        <li>Utilisez des couleurs différentes pour mieux distinguer vos catégories.</li>
        <li>Choisissez des noms courts et clairs.</li>
      </ul>

    </div>


  </div>

   
  );
}
