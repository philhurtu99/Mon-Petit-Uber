import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function OrderTrackingPage({help }: {help: string | null}) {

  return (
    <div>
      <h4>📦 Suivi des commandes</h4>
      <VideoStep videoSrc="EmployeConfirmationCodeRamassage.mp4" />

      <div>
        <p>
          Cette page permet de suivre et gérer toutes les commandes en cours ou terminées.
        </p>

        <hr />

        <p>🔄 Actualisation</p>
        <ul data-help="refresh" className={(help === "refresh") ? "highlithedHelp" : "" }>
          <li>Le bouton <strong>Actualiser</strong> recharge la liste des commandes.</li>
        </ul>

        <hr />

        <p>🎯 Filtres principaux</p>

        <p>Type de commande</p>
        <ul data-help="filters" className={(help === "filters") ? "highlithedHelp" : "" }>
          <li><strong>Tout</strong> : toutes les commandes</li>
          <li><strong>Livraisons</strong> : uniquement les commandes à livrer</li>
          <li><strong>Ramassages</strong> : commandes à récupérer sur place</li>
        </ul>

        <p>Progression</p>
        <ul data-help="progression" className={(help === "[progression]") ? "highlithedHelp" : "" }>
          <li><strong>En cours</strong> : commandes en préparation ou traitement</li>
          <li><strong>Terminé</strong> : commandes finalisées</li>
        </ul>

        <p>États de livraison (livraisons en cours)</p>
        <ul data-help="status" className={(help === "status") ? "highlithedHelp" : "" }>
          <li>En préparation</li>
          <li>Prêtes</li>
          <li>En livraison</li>
          <li>Livrées</li>
          <li>Annulées</li>
        </ul>

        <hr />

        <p>📋 Informations sur une commande</p>
        <ul data-help="orders" className={(help === "orders") ? "highlithedHelp" : "" }>
          <li>Numéro de commande</li>
          <li>Type (Livraison ou Ramassage)</li>
          <li>Statut actuel</li>
          <li>Client</li>
          <li>Heure de création</li>
          <li>Temps écoulé</li>
          <li>Montant total</li>
        </ul>

        <hr />

        <p>🍽️ Produits</p>
        <ul data-help="orders" className={(help === "orders") ? "highlithedHelp" : "" }>
          <li>Image du produit (si disponible)</li>
          <li>Nom</li>
          <li>Quantité</li>
          <li>Prix</li>
        </ul>

        <hr />

        <p>📦 Actions</p>
        <ul>
          <li><strong>Confirmer le code</strong> : valide la récupération d’une commande pickup</li>
        </ul>

        <hr />

        <p>🧭 Conseils</p>
        <ul>
          <li>Utilise les filtres pour trouver rapidement une commande</li>
          <li>Vérifie le statut avant toute action</li>
          <li>Les temps affichés sont dynamiques</li>
        </ul>

      </div>
    </div>
)};