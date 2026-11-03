import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function ProductPage({help }: {help: string | null}) {

  return (
    <div>
      <h2>🧾 Nos produits</h2>
      <VideoStep videoSrc="userPaginationEtFiltres.mp4" />
      <div>
        <p>
          Cette page permet de consulter les produits disponibles et de les ajouter au panier.
        </p>

        <p><strong>🛍️ Liste des produits</strong></p>
        <ul data-help="list" className={(help === "list") ? "highlithedHelp" : "" }>
          <li>Les produits sont affichés sous forme de cartes.</li>
          <li>Chaque carte contient les informations essentielles (nom, prix, disponibilité).</li>
          <li>Cliquez sur <strong>Détails</strong> pour visualiser les détails du produit.</li>
          <li>Cliquez sur <strong>le petit carré</strong> pour selectionner un produit.</li>
          <li>Vous pouvez sélectionner plusieurs produits.</li>
        </ul>

        <p><strong>➕ Ajouter au panier</strong></p>
        <ul data-help="addToCart" className={(help === "addToCart") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>Ajouter au panier</strong> pour ajouter les produits sélectionnés au panier.</li>
          <li>Le bouton affiche le nombre de produits sélectionnés.</li>
          <li>Il est désactivé si aucun produit n’est sélectionné.</li>
        </ul>

        <p><strong>🔎 Recherche et filtres</strong></p>
        <ul data-help="searchFilter" className={(help === "searchFilter") ? "highlithedHelp" : "" }>
          <li>Utilisez la barre de recherche pour trouver un produit rapidement.</li>
          <li>Appliquez des filtres pour affiner les résultats.</li>
          <li>Les résultats s’adaptent automatiquement.</li>
        </ul>

        <p><strong>📦 Aucun produit trouvé</strong></p>
        <ul>
          <li>Un message s’affiche si aucun produit ne correspond à la recherche.</li>
          <li>Essayez de modifier vos filtres ou votre recherche.</li>
        </ul>

        <p><strong>📄 Pagination</strong></p>
        <ul>
          <li>Les produits sont affichés par pages.</li>
          <li>Utilisez les contrôles en bas pour naviguer entre les pages.</li>
          <li>Vous pouvez changer le nombre de produits affichés par page.</li>
        </ul>

        <p><strong>💡 Conseils</strong></p>
        <ul>
          <li>Sélectionnez plusieurs produits pour optimiser vos commandes.</li>
          <li>Utilisez les filtres pour gagner du temps.</li>
          <li>Vérifiez la disponibilité des produits avant ajout.</li>
        </ul>

      </div>
    </div>
  );
}
