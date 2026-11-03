import "../helpPage.css";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function EditPromotionPage({help }: {help: string | null}) {

  return (
    <div>
      <h4>🧾 Éditer une promotion</h4>

     <div>
        <p>
          Cette fenêtre permet de modifier une promotion existante.
        </p>

        <p><strong>🏷️ Nom de la promotion</strong></p>
        <ul data-help="name" className={(help === "name") ? "highlithedHelp" : ""}>
          <li>Donnez un nom clair (ex : <strong>2 pour 1</strong>).</li>
          <li>Ce champ est obligatoire.</li>
        </ul>

        <p><strong>📝 Description</strong></p>
        <ul data-help="description" className={(help === "description") ? "highlithedHelp" : ""}>
          <li>Ajoutez des détails pour mieux comprendre la promotion (optionnel).</li>
        </ul>

        <p><strong>⚙️ Type de promotion</strong></p>
        <ul data-help="type" className={(help === "type") ? "highlithedHelp" : ""}>
          <li><strong>X pour Y</strong> : ex. 3 produits pour le prix de 1.</li>
          <li><strong>Article gratuit</strong> : un produit offert après achat.</li>
        </ul>

        <p><strong>🎯 Produit cible</strong></p>
        <ul data-help="targetProduct" className={(help === "targetProduct") ? "highlithedHelp" : ""}>
          <li>Sélectionnez le produit concerné par la promotion.</li>
        </ul>

        <p><strong>🔢 Quantités (X pour Y)</strong></p>
        <ul data-help="xForY" className={(help === "xForY") ? "highlithedHelp" : ""}>
          <li><strong>Quantité à acheter</strong> : nombre requis pour activer la promo.</li>
          <li><strong>Quantité à payer</strong> : nombre réellement facturé.</li>
        </ul>

        <p><strong>🎁 Produit gratuit</strong></p>
        <ul data-help="free" className={(help === "free") ? "highlithedHelp" : ""}>
          <li><strong>Quantité requise</strong> : nombre d’articles à acheter.</li>
          <li><strong>Produit bonus</strong> : produit offert.</li>
          <li><strong>Quantité bonus</strong> : nombre d’articles offerts.</li>
        </ul>

        <p><strong>📅 Dates</strong></p>
        <ul data-help="dates" className={(help === "dates") ? "highlithedHelp" : ""}>
          <li><strong>Date de début</strong> : début de la promotion (optionnel).</li>
          <li><strong>Date de fin</strong> : obligatoire pour définir la durée.</li>
        </ul>

        <p><strong>✅ Statut</strong></p>
        <ul data-help="active" className={(help === "active") ? "highlithedHelp" : ""}>
          <li>Cochez <strong>Promotion active</strong> pour l’activer.</li>
          <li>Décochez pour la désactiver temporairement.</li>
        </ul>

        <p><strong>💾 Enregistrer</strong></p>
        <ul>
          <li>Cliquez sur <strong>Enregistrer</strong> pour appliquer les modifications.</li>
        </ul>

        <p><strong>❌ Annuler</strong></p>
        <ul>
          <li>Fermez sans sauvegarder avec <strong>Annuler</strong> ou le bouton ❌.</li>
        </ul>

        <p><strong>💡 Conseils</strong></p>
        <ul>
          <li>Vérifiez les quantités pour éviter les erreurs de calcul.</li>
          <li>Utilisez des dates pour contrôler la durée des promotions.</li>
          <li>Testez vos promotions pour confirmer leur bon fonctionnement.</li>
        </ul>

      </div>

    </div>
  );
}
