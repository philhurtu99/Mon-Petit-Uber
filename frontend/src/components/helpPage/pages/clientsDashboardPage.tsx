import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function ClientsDashboardPage({help }: {help: string | null}) {

  return (

    <div>
      <h4>👥 Dashboard Clients</h4>

      <div>
        <p>
          Cette page vous permet de consulter les statistiques, informations et habitudes d’achat de vos clients.
        </p>

        <VideoStep videoSrc="AdminInfoClients.mp4" />
        
        <p><strong>📊 Statistiques globales</strong></p>
        <ul data-help="stats" className={(help === "stats") ? "highlithedHelp" : "" }>
          <li>Consultez le nombre total de clients, de commandes et le revenu généré.</li>
          <li>Les statistiques se mettent à jour automatiquement selon les données disponibles.</li>
        </ul>

        <p><strong>🔍 Recherche de clients</strong></p>
        <ul data-help="search" className={(help === "search") ? "highlithedHelp" : "" }>
          <li>Utilisez la barre de recherche pour trouver un client par nom ou courriel.</li>
          <li>Les résultats sont filtrés automatiquement pendant la saisie.</li>
        </ul>

        <p><strong>📥 Exportation des données</strong></p>
        <ul data-help="header" className={(help === "header") ? "highlithedHelp" : "" }>
          <li>Exportez la liste complète des clients en format JSON ou CSV.</li>
          <li>Les boutons d’exportation sont désactivés pendant le traitement.</li>
        </ul>

        <p><strong>📋 Liste des clients</strong></p>
        <ul data-help="list" className={(help === "list") ? "highlithedHelp" : "" }>
          <li>Chaque ligne affiche les informations principales et statistiques du client.</li>
          <li>Cliquez sur un client pour ouvrir son panneau de détails.</li>
        </ul>
      </div>
    </div>

  );
}
