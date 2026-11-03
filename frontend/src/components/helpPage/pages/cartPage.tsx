import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function CartPage({ help }: { help: string | null }) {

  return (
    <div>
      <h4>🛒 Panier</h4>
      <VideoStep videoSrc="userPannierEtPayement.mp4" />
      
      <div>
        <p>
          Cette page permet au client de consulter les articles ajoutés au panier, modifier les quantités, appliquer des récompenses et procéder à la commande.
        </p>

        <p><strong>📦 Gestion des articles</strong></p>
        <ul data-help="cart-items" className={(help === "cart-items") ? "highlithedHelp" : ""}
        >
          <li>Tous les produits ajoutés au panier sont affichés sous forme de liste.</li>
          <li>Chaque article affiche son image, son nom, sa quantité et son total.</li>
          <li>Les boutons <strong>« + » et « − »</strong> permettent d’augmenter ou réduire la quantité d’un produit.</li>
          <li>Le bouton <strong>« Retirer »</strong> permet de supprimer complètement un article du panier.</li>
          <li>Lorsqu’un stock maximal est atteint, un message « Stock max atteint » est affiché.</li>
        </ul>

        <p><strong>🏷️ Local de livraison</strong></p>
        <ul data-help="local-selector" className={help === "local-selector" ? "highlithedHelp" : ""}>
          <li>Choisissez d’abord une lettre correspondant à la zone du local.</li>
          <li>Puis sélectionnez le numéro associé à cette zone.</li>
          <li>Le local complet est affiché une fois les deux champs valides.</li>
          <li>Des suggestions apparaissent lors de la saisie de la lettre ou du numéro.</li>
          <li>Un clic sur une suggestion remplit automatiquement le champ.</li>
        </ul>

        <p><strong>⚠️ Validation</strong></p>
        <ul data-help="local-validation" className={help === "local-validation" ? "highlithedHelp" : ""}>
          <li>Un message d’erreur s’affiche si la combinaison est invalide.</li>
          <li>Les champs invalides sont visuellement mis en évidence.</li>
        </ul>

        <p><strong>🎁 Produits offerts et bonus</strong></p>
        <ul data-help="cart-bonuses" className={(help === "cart-bonuses") ? "highlithedHelp" : ""}>
          <li>Certains produits bonus peuvent être automatiquement ajoutés au panier selon les promotions actives.</li>
          <li>Les produits offerts sont identifiés avec le badge « Offert ».</li>
          <li>Un message indique quel produit déclenche l’obtention du bonus.</li>
          <li>Les articles offerts sont affichés avec un prix de 0 $. </li>
          <li>Le client peut refuser un article bonus avec le bouton « Refuser ».</li>
        </ul>

        <p><strong>🚚 Livraison et ramassage</strong></p>
        <ul data-help="cart-delivery" className={(help === "cart-delivery") ? "highlithedHelp" : ""}>
          <li>Le client peut choisir entre la livraison et le ramassage grâce au sélecteur situé dans le panneau de résumé.</li>
          <li>Les frais de livraison sont affichés dans le résumé de commande lorsque le mode livraison est sélectionné.</li>
        </ul>

        <p><strong>💰 Résumé des totaux</strong></p>
        <ul data-help="cart-totals" className={(help === "cart-totals") ? "highlithedHelp" : ""}>
          <li>Le panneau latéral affiche le prix avant promotions, les économies, le sous-total et le total final.</li>
          <li>Les économies générées par les promotions sont affichées séparément.</li>
          <li>Le total final est automatiquement recalculé selon les rabais appliqués.</li>
        </ul>

        <p><strong>💳 Crédit client</strong></p>
        <ul data-help="cart-credit" className={(help === "cart-credit") ? "highlithedHelp" : ""}>
          <li>Les clients possédant un solde de crédit peuvent l’appliquer à leur commande. </li>
          <li>Une case à cocher permet d’activer ou désactiver l’utilisation du crédit. </li>
          <li>Le montant appliqué est affiché dans le résumé sous « Crédit appliqué ». </li>
          <li>Le crédit peut être désactivé automatiquement si les points fidélité couvrent déjà le total.</li>
        </ul>

        <p><strong>🎁 Points fidélité</strong></p>
        <ul data-help="cart-loyalty" className={(help === "cart-loyalty") ? "highlithedHelp" : ""}>
          <li>Les clients connectés peuvent utiliser leurs points fidélité afin de réduire le montant de la commande.</li>
          <li>Le solde actuel des points disponibles est affiché dans la section « Carte de points ».</li>
          <li>Si le client ne possède pas assez de points, un message affiche le seuil minimal requis.</li>
        </ul>

        <p><strong>🎁 Utilisationn des Points fidélité</strong></p>
        <ul data-help="cart-using" className={(help === "cart-using") ? "highlithedHelp" : ""}>
          <li>Les points peuvent être ajustés avec les boutons « + » et « − » ou saisis manuellement.</li>
          <li>Le système limite automatiquement le nombre maximal de points pouvant être appliqués.</li>
          <li>La réduction appliquée est affichée dans le résumé sous « Points appliqués ».</li>
        </ul>  

        <p><strong>⚠️ Validation de la commande</strong></p>
        <ul data-help="cart-checkout" className={(help === "cart-checkout") ? "highlithedHelp" : ""} >
          <li> Le bouton « Valider la commande » lance le processus de paiement.</li>
          <li>Pendant la redirection vers le paiement, le bouton affiche l’état « Redirection... ».</li>
        </ul>

      </div>
    </div>
  );
}
