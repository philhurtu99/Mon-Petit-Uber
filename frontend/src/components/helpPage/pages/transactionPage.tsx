import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function TransactionPage({help }: {help: string | null}) {

  return (

    <div>
      <h4>💳 Historique des transactions</h4>

      <div>
        <p>
          Cette page vous permet de consulter toutes vos transactions passées,
          avec leurs détails et leurs produits associés.
        </p>

        <p><strong>🔍 Recherche de transactions</strong></p>
        <ul data-help="search" className={(help === "search") ? "highlithedHelp" : "" }>
          <li>Utilisez la barre de recherche pour trouver une transaction par produit ou contenu.</li>
          <li>La recherche se met à jour automatiquement pendant la saisie.</li>
        </ul>

        <p><strong>📅 Filtre par date</strong></p>
        <ul data-help="filterDate" className={(help === "filterDate") ? "highlithedHelp" : "" }>
          <li>Vous pouvez filtrer les transactions selon une période précise.</li>
          <li>Choisissez une plage de dates pour affiner les résultats.</li>
        </ul>

        <p><strong>📊 Liste des transactions</strong></p>
        <ul>
          <li>Chaque transaction affiche :</li>
          <ul>
            <li>la date et l’heure de l’achat ;</li>
            <li>le total payé ;</li>
            <li>la liste des produits achetés.</li>
          </ul>
          <li>En cliquant sur le nom ou l'image d'un produit, tu seras redirigé vers la page de ce produit pour voir plus de détails.</li>
        </ul>

        <p><strong>🛒 Produits dans une transaction</strong></p>
        <ul>
          <li>Chaque produit affiche :</li>
          <ul>
            <li>son nom ;</li>
            <li>son prix unitaire ;</li>
            <li>la quantité achetée ;</li>
            <li>le total du produit.</li>
          </ul>
        </ul>

        <p><strong>🛒 Navigation vers les produits</strong></p>
        <ul data-help="jumpToProduct" className={(help === "jumpToProduct") ? "highlithedHelp" : "" }>
          <li>Cliquez sur l'<strong>image</strong> ou le <strong>nom</strong> du produit pour naviger vers le produit.</li>
        </ul>

        <p><strong>📦 Affichage des produits (accordéon)</strong></p>
        <ul data-help="accordion" className={(help === "accordion") ? "highlithedHelp" : "" }>
          <li>Si une transaction contient plusieurs produits, seuls les 2 premiers sont affichés au départ.</li>
          <li>Cliquez sur <strong>“Voir plus”</strong> pour afficher les autres produits.</li>
          <li>Cliquez sur <strong>“Réduire”</strong> pour replier la liste.</li>
        </ul>

        <p><strong>📄 Facture</strong></p>
        <VideoStep videoSrc="userTransactionsEtFacture.mp4" />
        <ul data-help="invoice" className={(help === "invoice") ? "highlithedHelp" : "" }>
          <li>Vous pouvez télécharger une facture pour chaque transaction.</li>
          <li>Cliquez sur le bouton de téléchargement pour générer le document.</li>
        </ul>

        <p><strong>📌 Résumé d’une transaction</strong></p>
        <ul>
          <li>Le total de la transaction est affiché à droite.</li>
          <li>La date est affichée au format clair avec heure.</li>
        </ul>

        <p><strong>📄 Tableau des produits</strong></p>
        <ul>
          <li>Les colonnes affichent :</li>
          <ul>
            <li>image du produit ;</li>
            <li>nom ;</li>
            <li>prix ;</li>
            <li>quantité ;</li>
            <li>sous-total.</li>
          </ul>
        </ul>

        <p><strong>📄 Pagination</strong></p>
        <ul>
          <li>Les transactions sont paginées pour faciliter la navigation.</li>
          <li>Vous pouvez changer le nombre de lignes affichées par page.</li>
          <li>Utilisez les boutons pour naviguer entre les pages.</li>
        </ul>

        <p><strong>💡 Conseils</strong></p>
        <ul>
          <li>Utilisez les filtres pour retrouver rapidement une transaction.</li>
          <li>Ouvrez les accords seulement si nécessaire pour éviter de surcharger l’affichage.</li>
          <li>Téléchargez vos factures pour vos archives personnelles.</li>
        </ul>

      </div>
    </div>

  );
}
