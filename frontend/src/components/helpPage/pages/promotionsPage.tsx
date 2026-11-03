import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function PromotionsPage({help }: {help: string | null}) {

  return (

    <div>
      <h4>🎉 Gestion des Promotions</h4>
      <VideoStep steps={[{label: "2 pour 1", time:4}]} videoSrc="AdminPromotion2x1.mp4" />
      <VideoStep steps={[{label: "Produit gratuit", time:4}]} videoSrc="AdminPromoProduitGratuit.mp4" />
      <div>
        <p>
          Cette page permet de créer, gérer, modifier et supprimer des promotions pour les produits.
        </p>

        <p><strong>📘 Aide et légende</strong></p>
        <ul>
          <li>Le bouton d’aide affiche la légende des champs utilisés dans le formulaire.</li>
          <li>Cette aide permet de mieux comprendre chaque option disponible.</li>
        </ul>

        <p><strong>🆕 Créer une promotion</strong></p>
        <ul>
          <li>Le formulaire de gauche permet d’ajouter une nouvelle promotion.</li>
          <li>Les champs marqués d’un <strong>*</strong> sont obligatoires.</li>
        </ul>

        <p ><strong>🔤 Nom de la promotion</strong></p>
        <ul data-help="name" className={(help === "name") ? "highlithedHelp" : "" }>
          <li>Entrez un nom clair pour identifier la promotion.</li>
          <li>Exemple : <strong>2 pour 1</strong>.</li>
        </ul>

        <p><strong>📝 Description</strong></p>
        <ul data-help="description" className={(help === "description") ? "highlithedHelp" : "" }>
          <li>Ajoutez des détails ou des informations supplémentaires sur la promotion.</li>
          <li>Ce champ est optionnel.</li>
        </ul>

        <p><strong>🏷️ Type de promotion</strong></p>
        <ul data-help="type" className={(help === "type") ? "highlithedHelp" : "" }>
          <li>Deux types de promotions sont disponibles :</li>
          <ul>
            <li><strong>X pour Y</strong> → le client achète une quantité mais paie moins ;</li>
            <li><strong>Article gratuit</strong> → un produit bonus est offert.</li>
          </ul>
        </ul>

        <p><strong>🛒 Produit cible</strong></p>
        <ul data-help="targetProduct" className={(help === "targetProduct") ? "highlithedHelp" : "" }>
          <li>Sélectionnez le produit concerné par la promotion.</li>
          <li>Le produit sélectionné sera affiché dans la zone prévue.</li>
          <li>Vous pouvez changer ou effacer le produit sélectionné.</li>
        </ul>

        <p><strong>🔢 Quantités de promotion</strong></p>
        <ul data-help="qtePromotion" className={(help === "qtyPromotion") ? "highlithedHelp" : "" }>
          <li>Selon le type choisi, vous devrez entrer :</li>
          <ul>
            <li>la quantité à acheter ;</li>
            <li>la quantité à payer ;</li>
            <li>ou la quantité bonus offerte.</li>
          </ul>
          <li>Les quantités doivent être des nombres supérieurs à 0.</li>
        </ul>

        <p><strong>🎁 Produit bonus</strong></p>
        <ul data-help="qtyPromotion" className={(help === "qtyPromotion") ? "highlithedHelp" : "" }>
          <li>Pour les promotions de type <strong>Article gratuit</strong>, sélectionnez le produit offert.</li>
          <li>Vous pouvez modifier ou retirer le produit bonus à tout moment.</li>
        </ul>

        <p><strong>📅 Dates de promotion</strong></p>
        <ul data-help="dates" className={(help === "dates") ? "highlithedHelp" : "" }>
          <li>La date de début détermine quand la promotion commence.</li>
          <li>La date de fin détermine quand elle expire.</li>
          <li>La date de fin est obligatoire.</li>
        </ul>

        <p><strong>💾 Créer la promotion</strong></p>
        <ul data-help="creationPromotion" className={(help === "createPromotion") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>Créer la promotion</strong> pour enregistrer la promotion.</li>
          <li>Pendant l’enregistrement, le bouton affiche <strong>En cours...</strong>.</li>
        </ul>

        <p><strong>⚠️ Messages et erreurs</strong></p>
        <ul>
          <li>Les messages verts indiquent qu’une action a réussi.</li>
          <li>Les messages rouges indiquent une erreur ou un problème.</li>
        </ul>

        <p><strong>🔎 Recherche et filtres</strong></p>
        <ul data-help="filters" className={(help === "filters") ? "highlithedHelp" : "" }>
          <li>Vous pouvez rechercher une promotion par nom.</li>
          <li>Les promotions peuvent être filtrées par type :</li>
          <ul>
            <li>Tous les types ;</li>
            <li>Achetez X payez Y ;</li>
            <li>Article gratuit.</li>
          </ul>
        </ul>

        <p><strong>⏳ Tri des promotions</strong></p>
        <ul data-help="filters" className={(help === "filters") ? "highlithedHelp" : "" }>
          <li>Le bouton de tri permet d’afficher :</li>
          <ul>
            <li>les promotions les plus récentes ;</li>
            <li>ou les plus anciennes.</li>
          </ul>
        </ul>

        <p><strong>📋 Liste des promotions</strong></p>
        <ul data-help="promotions" className={(help === "promotions") ? "highlithedHelp" : "" }>
          <li>La section de droite affiche toutes les promotions existantes.</li>
          <li>Le nombre total de promotions affichées est indiqué dans le titre.</li>
        </ul>

        <p><strong>📝 Informations affichées</strong></p>
        <ul data-help="promotions" className={(help === "promotions") ? "highlithedHelp" : "" }>
          <li>Chaque carte de promotion affiche :</li>
          <ul>
            <li>le nom ;</li>
            <li>la description ;</li>
            <li>le type de promotion ;</li>
            <li>le produit concerné ;</li>
            <li>le produit bonus si applicable ;</li>
            <li>la date de fin ;</li>
            <li>le statut actif ou inactif.</li>
          </ul>
        </ul>

        <p><strong>✏️ Modifier une promotion</strong></p>
        <ul>
          <li>Cliquez sur l’icône ✏️ pour modifier une promotion existante.</li>
          <li>Une fenêtre d’édition s’ouvrira automatiquement.</li>
        </ul>

        <p><strong>🗑️ Supprimer une promotion</strong></p>
        <ul>
          <li>Cliquez sur l’icône 🗑️ pour supprimer une promotion.</li>
          <li>Une confirmation sera demandée avant la suppression.</li>
        </ul>

        <p><strong>📭 Aucune promotion</strong></p>
        <ul>
          <li>Si aucune promotion n’existe, un message sera affiché.</li>
          <li>Un message différent apparaît si aucun résultat ne correspond à la recherche.</li>
        </ul>

        <p><strong>💡 Conseils</strong></p>
        <ul>
          <li>Utilisez des noms de promotions simples et faciles à comprendre.</li>
          <li>Vérifiez les dates avant d’enregistrer.</li>
          <li>Évitez les promotions qui se chevauchent sur les mêmes produits.</li>
          <li>Testez toujours la promotion après sa création.</li>
        </ul>

      </div>

    </div>

  );
}
