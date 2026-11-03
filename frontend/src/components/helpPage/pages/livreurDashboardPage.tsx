import "../helpPage.css";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function LivreurDashboardPage({help }: {help: string | null}) {

  return (
    <div>
        <h4>🚚 Dashboard Livreur</h4>

        <div>
            <p>
            Cette page permet au livreur de consulter ses statistiques de performance ainsi que l’historique de ses livraisons complétées.
            </p>

            <p><strong>📊 Cartes de statistiques</strong></p>
            <ul data-help="stats" className={(help === "stats") ? "highlithedHelp" : ""} >
                <li>La carte <strong>« Note moyenne »</strong> affiche la moyenne des évaluations reçues ainsi que le nombre total d’avis.</li><br/>
                <li>Un système d’étoiles permet de visualiser rapidement la satisfaction des clients.</li><br/>
                <li>La carte <strong>« Total livraisons »</strong> indique le nombre total de commandes livrées. </li><br/>
                <li>La carte <strong>« Temps en livraison »</strong> affiche le temps cumulé passé à effectuer des livraisons.</li><br/>
                <li>La carte <strong>« Durée moyenne »</strong> indique le temps moyen nécessaire pour compléter une livraison. </li><br/>
                <li>Les statistiques demeurent visibles même si aucune livraison n’est disponible.</li>
            </ul>

            <p><strong>📦 Historique des livraisons</strong></p>
            <ul data-help="history" className={(help === "history") ? "highlithedHelp" : ""} >
            <li>Le tableau affiche la liste des livraisons complétées par le livreur.</li><br/>
                <li>Chaque ligne représente une commande livrée. </li><br/>
                <li>Le numéro de commande permet d’identifier rapidement la livraison.</li><br/>
                <li>La colonne <strong>« Date »</strong> affiche la date de la livraison. </li><br/>
                <li>La colonne <strong>« Prise en charge »</strong> indique l’heure à laquelle la commande a été récupérée. </li><br/>
                <li>La colonne <strong>« Livrée à »</strong> affiche l’heure de livraison au client. </li><br/>
                <li>La durée totale de la livraison est affichée dans la colonne <strong>« Durée »</strong>. </li><br/>
                <li>Une note sous forme d’étoiles est affichée lorsqu’un client a évalué la livraison.</li>
            </ul>

            <p><strong>📄 Pagination</strong></p>
            <ul data-help="pagination" className={(help === "pagination") ? "highlithedHelp" : ""} >
                <li>Les contrôles de pagination permettent de naviguer entre plusieurs pages de livraisons. </li>
                <li>Le nombre de lignes affichées par page peut être modifié.</li>
                <li>Le système recharge automatiquement la liste selon la page sélectionnée.</li>
            </ul>

        </div>
    </div>

  );
}
