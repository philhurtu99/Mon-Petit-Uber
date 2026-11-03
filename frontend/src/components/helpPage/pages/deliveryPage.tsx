import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function DeliveryPage({help }: {help: string | null}) {

  return (
    <div>
    <h4>🚚 Page Livraison</h4>
    <VideoStep videoSrc="EmployePrendLivraisonEtConfirmCode.mp4" />

    <div>
      <p>
        Cette page permet aux livreurs de recevoir, suivre et finaliser des livraisons.
      </p>

      <p><strong>🔍 Vérification automatique</strong></p>
      <ul>
        <li>Lors de l’ouverture de la page, le système vérifie automatiquement si une livraison est déjà assignée.</li>
        <li>Un écran de chargement peut apparaître durant cette vérification.</li>
      </ul>

      <p><strong>📦 Disponibilité des livraisons</strong></p>
      <ul data-help="disponibility" className={(help === "disponibility") ? "highlithedHelp" : "" }>
        <li>La page affiche si des commandes sont disponibles pour livraison.</li>
        <li>Le nombre de livraisons prêtes est affiché automatiquement.</li>
        <li>Si aucune commande n’est disponible, un message d’attente sera affiché.</li>
      </ul>

      <p><strong>🔔 Notifications</strong></p>
      <ul>
        <li>Cliquez sur <strong>Activer notifications</strong> pour être averti lorsqu’une commande devient disponible.</li>
        <li>Les notifications permettent de recevoir une alerte sans devoir surveiller constamment la page.</li>
      </ul>

      <p><strong>🚚 Demander une livraison</strong></p>
      <ul data-help="delivery" className={(help === "delivery") ? "highlithedHelp" : "" }>
        <li>Cliquez sur <strong>Demander une livraison</strong> lorsqu’une commande est disponible.</li>
        <li>Une commande vous sera automatiquement assignée.</li>
        <li>Le bouton est désactivé lorsqu’aucune livraison n’est prête.</li>
      </ul>

      <p><strong>👤 Informations du client</strong></p>
      <ul data-help="informations" className={(help === "informations") ? "highlithedHelp" : "" }>
        <li>La page affiche le nom du client.</li>
        <li>L’adresse courriel et le numéro de téléphone peuvent aussi être affichés.</li>
        <li>Ces informations servent uniquement à effectuer la livraison.</li>
      </ul>

      <p><strong>⏱️ Suivi de livraison</strong></p>
      <ul data-help="informations" className={(help === "informations") ? "highlithedHelp" : "" }>
        <li>Le temps écoulé depuis le début de la livraison est affiché en temps réel.</li>
        <li>Le statut de la commande indique qu’elle est en livraison.</li>
      </ul>

      <p><strong>🛒 Résumé des articles</strong></p>
      <ul data-help="items" className={(help === "items") ? "highlithedHelp" : "" }>
        <li>La liste complète des produits à livrer est affichée.</li>
        <li>Chaque article affiche :</li>
        <ul>
          <li>le nom du produit ;</li>
          <li>la quantité ;</li>
          <li>le prix ;</li>
          <li>une image du produit si disponible.</li>
        </ul>
        <li>Le sous-total des articles est également affiché.</li>
      </ul>

      <p><strong>🔢 Code de confirmation</strong></p>
      <ul data-help="code" className={(help === "code") ? "highlithedHelp" : "" }>
        <li>À la remise de la commande, demandez le code de confirmation au client.</li>
        <li>Le code doit contenir exactement <strong>4 chiffres</strong>.</li>
        <li>Seuls les chiffres sont acceptés.</li>
      </ul>

      <p><strong>✅ Finaliser la livraison</strong></p>
      <ul data-help="code" className={(help === "code") ? "highlithedHelp" : "" }>
        <li>Entrez le code de confirmation.</li>
        <li>Cliquez sur <strong>Finaliser</strong> pour compléter la livraison.</li>
        <li>Le bouton reste désactivé tant que le code n’est pas valide.</li>
      </ul>

      <p><strong>⚠️ Messages et erreurs</strong></p>
      <ul>
        <li>Les messages verts indiquent qu’une action a réussi.</li>
        <li>Les messages rouges indiquent une erreur ou un problème.</li>
        <li>Vérifiez toujours les messages affichés après une action.</li>
      </ul>

      <p><strong>💡 Conseils</strong></p>
      <ul>
        <li>Gardez cette page ouverte pour recevoir automatiquement les nouvelles commandes.</li>
        <li>Vérifiez les articles avant de partir en livraison.</li>
        <li>Confirmez toujours le code avec le client avant de finaliser.</li>
        <li>Assurez-vous que les notifications du navigateur sont autorisées.</li>
      </ul>

    </div>

  </div>
)};