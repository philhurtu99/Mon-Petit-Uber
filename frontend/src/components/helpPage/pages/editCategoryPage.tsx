import "../helpPage.css";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function EditCategoryPage({help }: {help: string | null}) {

  return (
    <div>
      <h4>🧾 Éditer une catégorie</h4>

     <div>

        <p>
          Cette fenêtre permet de modifier une catégorie existante.
        </p>

        <p><strong>🔤 Nom de la catégorie</strong></p>
        <ul data-help="name" className={(help === "name") ? "highlithedHelp" : "" }>
          <li>Modifiez le nom de la catégorie (ex : <strong>Fruits</strong>, <strong>Boissons</strong>).</li>
          <li>Ce champ est obligatoire.</li>
        </ul>

        <p><strong>🎨 Couleur</strong></p>
        <ul data-help="color" className={(help === "color") ? "highlithedHelp" : "" }>
          <li>Utilisez le sélecteur pour choisir une nouvelle couleur.</li>
          <li>Ou entrez un code couleur (ex : <code>#FF0000</code>).</li>
          <li>L’aperçu affiche la couleur sélectionnée.</li>
        </ul>

        <p><strong>💾 Enregistrer</strong></p>
        <ul data-help="actions" className={(help === "actions") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>Enregistrer</strong> pour appliquer les modifications.</li>
        </ul>

        <p><strong>❌ Annuler</strong></p>
        <ul data-help="actions" className={(help === "actions") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>Annuler</strong> ou sur le bouton ❌ pour fermer sans sauvegarder.</li>
        </ul>

        <p><strong>💡 Conseils</strong></p>
        <ul>
          <li>Choisissez un nom clair et cohérent avec vos autres catégories.</li>
          <li>Utilisez des couleurs distinctes pour une meilleure organisation.</li>
        </ul>

      </div>

    </div>
  );
}
