import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function EditProductPage({help }: {help: string | null}) {

  return (
    <div>
      <h4>🧾 Modifier un produit</h4>
      <VideoStep videoSrc="AdminEditionProduit.mp4" />
      <div>

        <p>
          Cette fenêtre permet de modifier un produit dans votre inventaire.
        </p>

        <p><strong>🔤 Nom du produit</strong></p>
        <ul data-help="name" className={(help === "name") ? "highlithedHelp" : "" }>
          <li>Entrez le nom du produit (ex : <strong>Cheeseburger</strong>).</li>
          <li>Ce champ est obligatoire.</li>
        </ul>

        <p><strong>📂 Catégorie</strong></p>
        <ul data-help="category" className={(help === "category") ? "highlithedHelp" : "" }>
          <li>Sélectionnez une catégorie existante.</li>
          <li>La couleur affichée représente la catégorie choisie.</li>
        </ul>

        <p><strong>💲 Prix</strong></p>
        <ul data-help="price" className={(help === "price") ? "highlithedHelp" : "" }>
          <li>Entrez le prix du produit (ex : <code>12.99</code>).</li>
          <li>Doit être un nombre valide supérieur ou égal à 0.</li>
        </ul>

        <p><strong>📦 Stock</strong></p>
        <ul data-help="stock" className={(help === "stock") ? "highlithedHelp" : "" }>
          <li>Indiquez la quantité disponible.</li>
          <li>Doit être un nombre entier positif.</li>
        </ul>

        <p><strong>🏷️ Rabais</strong></p>
        <ul data-help="sale" className={(help === "sale") ? "highlithedHelp" : "" }>
          <li>Ajoutez un rabais si nécessaire. Pourcentage jusqu'à 90%.</li>
          <li>Mettre <code>0</code> s’il n’y a pas de réduction.</li>
        </ul>

        <p><strong>⛔ Produit inactif</strong></p>
        <ul data-help="idle" className={(help === "idle") ? "highlithedHelp" : "" }>
          <li>Cochez cette option pour désactiver le produit.</li>
          <li>Un produit inactif ne sera pas affiché ou utilisé.</li>
        </ul>

        <p><strong>🖼️ Image</strong></p>
        <ul data-help="image" className={(help === "image") ? "highlithedHelp" : "" }>
          <li>Vous pouvez coller une URL d’image.</li>
          <li>Ou importer une image depuis votre appareil.</li>
          <li>Un aperçu s’affichera automatiquement.</li>
          <li>Cliquez sur <strong>Supprimer</strong> si vous ne voulez plus ajouter une image.</li>
        </ul>

        <p><strong>📝 Description</strong></p>
        <ul data-help="description" className={(help === "description") ? "highlithedHelp" : "" }>
          <li>Ajoutez une description optionnelle du produit.</li>
        </ul>

        <p><strong>💾 Enregistrer</strong></p>
        <ul data-help="actions" className={(help === "actions") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>Enregistrer</strong> pour enregistrer le produit.</li>
          <li>Les champs obligatoires doivent être remplis.</li>
        </ul>

        <p><strong>❌ Annuler</strong></p>
        <ul data-help="actions" className={(help === "actions") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>Annuler</strong> ou sur le bouton ❌ pour fermer sans enregistrer.</li>
        </ul>

        <p><strong>💡 Conseils</strong></p>
        <ul data-help="actions" className={(help === "save") ? "highlithedHelp" : "" }>
          <li>Utilisez des noms clairs et précis.</li>
          <li>Ajoutez une image pour rendre le produit plus attrayant.</li>
          <li>Vérifiez le prix et le stock avant d’enregistrer.</li>
        </ul>

      </div>

    </div>
  );
}
