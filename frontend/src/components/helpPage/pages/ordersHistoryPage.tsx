import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function OrdersHistoryPage({help }: {help: string | null}) {

  return (

    <div>
      <h4>📦 Historique des commandes</h4>

      <div>
        <p>
          Cette page vous permet de consulter toutes vos commandes actives et terminées avec leurs détails associés.
        </p>

        <VideoStep videoSrc="AdminCommandes.mp4" />
        
        <p><strong>🔍 Recherche de commandes</strong></p>
        <ul data-help="search" className={(help === "search") ? "highlithedHelp" : "" }>
          <li>Utilisez la barre de recherche pour retrouver rapidement une commande.</li>
          <li>La recherche se met à jour automatiquement pendant la saisie.</li>
        </ul>

        <p><strong>📅 Filtrer par date</strong></p>
        <ul data-help="date-filter" className={(help === "date-filter") ? "highlithedHelp" : "" }>
          <li>Utilisez le filtre de date pour afficher les commandes d’une période précise.</li>
          <li>Les résultats sont mis à jour automatiquement selon la période sélectionnée.</li>
        </ul>

        <p><strong>📂 Commandes actives</strong></p>
        <ul data-help="active-orders" className={(help === "active-orders") ? "highlithedHelp" : "" }>
          <li>Cette section affiche les commandes actuellement en cours.</li>
          <li>Le compteur indique le nombre de commandes actives correspondant aux filtres appliqués.</li>
          <li>Cliquer par dessus pour ouvrir/fermer la section. </li>
        </ul>

        <p><strong>✅ Commandes terminées</strong></p>
        <ul data-help="finished-orders" className={(help === "finished-orders") ? "highlithedHelp" : "" }>
          <li>Cette section contient les commandes finalisées.</li>
          <li>Le compteur affiche uniquement les commandes correspondant à votre recherche.</li>
        </ul>

        <p><strong>↕️ Tri des colonnes</strong></p>
        <ul data-help="sorting" className={(help === "sorting") ? "highlithedHelp" : "" }>
          <li>Cliquez sur les en-têtes des colonnes pour trier les commandes.</li>
          <li>Le tri peut être effectué en ordre croissant ou décroissant.</li>
        </ul>

        <p><strong>📦 Liste des produits</strong></p>
        <ul data-help="order-items" className={(help === "order-items") ? "highlithedHelp" : "" }>
          <li>Cliquer sur le nombre des produits pour y afficher la liste de produits. </li>
          <li>Les produits sont regroupés directement sous la commande correspondante.</li>
          <li>Chaque produit affiche son image, son nom, sa quantité et son prix.</li>
          <li>Cliquer une deuxième fois pour y fermer cette section ou le fait d'ouvrir une autre commande fermera celle qui est déjà ouverte</li>
        </ul>

      </div>
    </div>

  );
}
