import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function PreparationPage({help }: {help: string | null}) {

  return (

    <div>
      <h4>👨‍🍳 Préparation des commandes</h4>
      <VideoStep videoSrc="EmployePreparationCommande.mp4" />
      
      <div>
        <p>
          Cette page permet aux préparateurs de consulter, préparer et confirmer les commandes payées.
        </p>

        <p><strong>🧑‍🍳 Mode préparateur</strong></p>
        <ul data-help="moderator" className={(help === "moderator") ? "highlithedHelp" : "" }>
          <li>Le bouton <strong>Mode préparateur</strong> permet d’activer ou désactiver le mode préparation.</li>
          <li>Lorsque le mode est actif, le bouton change d’apparence.</li>
        </ul>

        <p><strong>📊 Indicateurs du type et nombre des commandes</strong></p>
        <ul data-help="indicators" className={(help === "indicators") ? "highlithedHelp" : "" }>
          <li>📋 Nombre des commandes à préparer.</li>
          <li>🚚 Nombre des commandes pour la livraison.</li>
          <li>📦 Nombre des commandes pour le ramassage.</li>
        </ul>

        <p><strong>🔎 Filtrer les commandes</strong></p>
        <ul data-help="filters" className={(help === "filters") ? "highlithedHelp" : "" }>
          <li>Vous pouvez filtrer les commandes avec les boutons :</li>
          <ul>
            <li><strong>Tout</strong> ;</li>
            <li><strong>Livraisons</strong> ;</li>
            <li><strong>Ramassages</strong>.</li>
          </ul>
          <li>Le filtre actif est mis en évidence automatiquement.</li>
        </ul>

        <p><strong>📋 Liste des commandes</strong></p>
        <ul>
          <li>Les commandes payées en attente de préparation sont affichées automatiquement.</li>
          <li>Le nombre total de commandes est affiché à droite du début de la liste.</li>
          <li>Chaque commande possède un numéro unique.</li>
          <li>Les commandes peuvent être des <strong>livraisons</strong> ou des <strong>ramassages</strong>.</li>
        </ul>

        <p><strong>👤 Informations de commande</strong></p>
        <ul>
          <li>Chaque commande affiche :</li>
          <ul>
            <li>le nom du client ;</li>
            <li>l’heure de création ;</li>
            <li>le temps écoulé depuis la création ;</li>
            <li>le montant total payé.</li>
          </ul>
        </ul>

        <p><strong>🛒 Articles à préparer</strong></p>
        <ul data-help="toPrepare" className={(help === "toPrepare") ? "highlithedHelp" : "" }>
          <li>Chaque commande contient la liste des produits à préparer.</li>
          <li>Les informations suivantes sont affichées :</li>
          <ul>
            <li>le nom du produit ;</li>
            <li>la quantité ;</li>
            <li>le prix ;</li>
            <li>une image du produit si disponible.</li>
          </ul>
        </ul>

        <p><strong>✅ Validation des articles</strong></p>
        <ul data-help="toPrepare" className={(help === "toPrepare") ? "highlithedHelp" : "" }>
          <li>Chaque produit possède une case à cocher.</li>
          <li>Cochez la case lorsqu’un article est prêt.</li>
          <li>Tous les articles doivent être cochés avant de confirmer la commande.</li>
        </ul>

        <p><strong>📦 Marquer une commande prête</strong></p>
        <ul data-help="toPrepare" className={(help === "toPrepare") ? "highlithedHelp" : "" }>
          <li>Une fois tous les produits préparés, cliquez sur <strong>Marquer prête</strong>.</li>
          <li>La commande sera alors transférée à l’étape suivante.</li>
          <li>Le bouton reste désactivé tant que tous les articles ne sont pas cochés.</li>
        </ul>

        <p><strong>🔄 Confirmation en cours</strong></p>
        <ul>
          <li>Pendant l’enregistrement, le bouton affiche <strong>Confirmation...</strong>.</li>
          <li>Évitez de cliquer plusieurs fois durant cette étape.</li>
        </ul>

        <p><strong>📊 Résumé des commandes</strong></p>
        <ul>
          <li>Le haut de la page affiche :</li>
          <ul>
            <li>le nombre total de commandes à préparer ;</li>
            <li>le nombre de livraisons ;</li>
            <li>le nombre de ramassages.</li>
          </ul>
        </ul>

        <p><strong>⚠️ Messages et alertes</strong></p>
        <ul>
          <li>Les messages verts indiquent une action réussie.</li>
          <li>Les messages rouges indiquent une erreur ou un problème.</li>
        </ul>

        <p><strong>⏳ Chargement</strong></p>
        <ul>
          <li>Lors du chargement des commandes, un indicateur animé est affiché.</li>
          <li>Patientez jusqu’à l’affichage complet de la liste.</li>
        </ul>

        <p><strong>📭 Aucune commande</strong></p>
        <ul>
          <li>Si aucune commande n’est disponible, un message d’information sera affiché.</li>
        </ul>

        <p><strong>💡 Conseils</strong></p>
        <ul>
          <li>Préparez les commandes dans l’ordre de création pour réduire les délais.</li>
          <li>Vérifiez chaque article avant de le cocher.</li>
          <li>Assurez-vous que toutes les quantités sont correctes.</li>
          <li>Confirmez uniquement lorsque la commande est complètement prête.</li>
        </ul>

      </div>

    </div>

)};