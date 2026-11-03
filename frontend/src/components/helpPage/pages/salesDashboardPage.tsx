import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function SalesDashboardPage({help }: {help: string | null}) {

  return (
    <div>
      <h4>📊 Dashboard Analytique</h4>

      <div>
        <p>
          Cette page vous permet d'analyser les performances de vos ventes, de suivre
          vos revenus et d'identifier les produits les plus performants.
        </p>

        <VideoStep videoSrc="AdminVentes.mp4" />
        
        <p><strong>📄 Exportation CSV</strong></p>
        <ul data-help="export" className={help === "export" ? "highlithedHelp" : ""}>
          <li>Exportez les statistiques affichées dans un fichier CSV.</li>
        </ul>

        <p><strong>📅 Filtre de période</strong></p>
        <ul data-help="dateFilter" className={help === "dateFilter" ? "highlithedHelp" : ""}>
          <li>Sélectionnez une période pour mettre à jour toutes les statistiques affichées.</li>
        </ul>

        <p><strong>📈 Indicateurs principaux</strong></p>
        <ul data-help="summary" className={help === "summary" ? "highlithedHelp" : ""}>
          <li>Le <strong>chiffre d'affaire</strong>s représente le total des ventes réalisées.</li><br/>
          <li>Les <strong>commandes</strong> indiquent le nombre total de transactions.</li><br/>
          <li>Les <strong>articles vendus</strong> correspondent aux quantités écoulées.</li><br/>
          <li>Le <strong>panier moyen</strong> affiche la valeur moyenne par commande.</li>
        </ul>

        <p><strong>🏆 Meilleurs produits du moment</strong></p>
        <ul data-help="bestSellers" className={help === "bestSellers" ? "highlithedHelp" : ""}>
          <li>Affiche les produits ayant généré le plus de ventes sur la période sélectionnée.</li>
          <li>Chaque carte présente les ventes, revenus et évaluations du produit.</li>
        </ul>

        <p><strong>🔍 Recherche</strong></p>
        <ul data-help="search" className={help === "search" ? "highlithedHelp" : ""}>
          <li>Recherchez rapidement un produit ou une catégorie par son nom.</li>
          <li>Les résultats se filtrent automatiquement pendant la saisie.</li>
        </ul>

        <p><strong>↕️ Tri des données</strong></p>
        <ul data-help="sorting" className={help === "sorting" ? "highlithedHelp" : ""}>
          <li>Cliquez sur une colonne pour trier les données dans l'ordre souhaité.</li>
        </ul>

        <p><strong>📋 Analyse par produit</strong></p>
        <ul data-help="productAnalysis" className={help === "productAnalysis" ? "highlithedHelp" : ""}>
          <li>Consultez les ventes, revenus, notes et niveaux de stock de chaque produit.</li>
          <li>Cliquez sur un <strong>Produit</strong> pour accéder directement à sa fiche d'inventaire.</li>
          <li>Les produits avec un stock faible ou nul sont mis en évidence.</li>
        </ul>

        <p><strong>📚 Pagination</strong></p>
        <ul data-help="pagination" className={help === "pagination" ? "highlithedHelp" : ""}>
          <li>Naviguez entre les pages et ajustez le nombre de résultats affichés.</li>
        </ul>
      </div>
    </div>
  );
}
