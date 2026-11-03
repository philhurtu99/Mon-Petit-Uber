import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function ClientDashboardPage({help }: {help: string | null}) {

  return (

    <div>
      <h4>👤 Dashboard Client</h4>

      <div>
        <p>
          Cette page vous permet de consulter les informations personnelles et les statistiques du client selectionné.
        </p>

        <VideoStep videoSrc="AdminDetailsClients.mp4" />

        <p><strong>🧾 Profil client</strong></p>
        <ul data-help="client-profile" className={(help === "client-profile") ? "highlithedHelp" : "" }>
          <li>Le panneau latéral affiche les informations personnelles et les statistiques du client.</li>
          <li>Vous pouvez consulter ses commandes, crédits et produits fréquents.</li>
        </ul>

        <p><strong>⭐ Carte de points</strong></p>
        <ul data-help="points-total" className={(help === "points-total") ? "highlithedHelp" : ""}>
          <li>Affiche le total de points actuellement disponibles</li>
          <li>Les points sont automatiquement mis à jour après chaque opération</li>
          <li>La valeur monétaire équivalente des points est aussi affichée.</li>
        </ul>

        <p><strong>⚙️ Ajustement des points</strong></p>
        <ul data-help="points-adjust" className={(help === "points-adjust") ? "highlithedHelp" : ""}>
          <li>Entrez une valeur positive pour ajouter des points</li>
          <li>Entrez une valeur négative pour retirer des points</li>
          <li>Respectez le pas défini pour éviter des erreurs de saisie</li>
          <li>Le bouton "Appliquer" valide la modification</li>
        </ul>

        <p><strong>📦 Produits fréquents</strong></p>
        <ul data-help="top-products" className={(help === "top-products") ? "highlithedHelp" : "" }>
          <li>Cette section affiche les produits les plus achetés par le client.</li>
          <li>Cliquez sur un produit pour accéder rapidement à sa fiche.</li>
        </ul>

        <p><strong>📈 Habitudes d’achat</strong></p>
        <ul data-help="habits" className={(help === "habits") ? "highlithedHelp" : "" }>
          <li>Visualisez les habitudes d’achat du client par période mensuelle ou journalière.</li>
          <li>Les graphiques affichent le total dépensé, le nombre de commandes et les articles achetés.</li>
        </ul>

        <p><strong>🛒 Historique des commandes</strong></p>
        <ul data-help="orders" className={(help === "orders") ? "highlithedHelp" : "" }>
          <li>Consultez les commandes passées par le client avec leurs détails.</li>
          <li>Cliquez sur une commande pour afficher les produits et informations de paiement.</li>
        </ul>

        <p><strong>📄 Pagination</strong></p>
        <ul data-help="pagination" className={(help === "pagination") ? "highlithedHelp" : "" }>
          <li>Utilisez la pagination pour naviguer entre les différentes pages de résultats.</li>
          <li>Vous pouvez modifier le nombre d’éléments affichés par page.</li>
        </ul>
      </div>
    </div>

  );
}
