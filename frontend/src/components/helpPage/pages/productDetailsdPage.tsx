import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function ProductDetailsdPage({help }: {help: string | null}) {

  return (

      <div>
          <h4>🛍️ Détails du produit et avis clients</h4>

          <div>
              <p>
                  Cette fenêtre affiche les informations détaillées d’un produit, incluant son prix, sa disponibilité, sa description et les avis laissés par les clients.
                  Vous pouvez également consulter les images des avis, signaler un commentaire inapproprié ou ajouter le produit à votre panier.
              </p>

              <p><strong>📦 Informations du produit</strong></p>
              <ul data-help="info" className={(help === "info") ? "highlithedHelp" : "" }>
                  <li>L’image principale, le nom et la catégorie du produit sont affichés dans l’en-tête.</li><br />
                  <li>Le prix courant est affiché avec le rabais appliqué lorsqu’une promotion est active.</li><br />
                  <li>L’état du stock indique si le produit est disponible ou non.</li><br />
                  <li>La note moyenne et le nombre total d’avis sont visibles sous les informations principales.</li>
              </ul>

              <p><strong>🛒 Ajouter au panier</strong></p>
              <ul data-help="add" className={(help === "add") ? "highlithedHelp" : "" }>
                  <li>Le bouton <strong>"Ajouter au panier"</strong> permet d’ajouter rapidement le produit à votre panier.</li><br />
                  <li>Cette action est disponible uniquement lorsque le produit peut être commandé.</li>
              </ul>

              <p><strong>⭐ Consulter les avis clients</strong></p>
               <ul data-help="seeReviews" className={(help === "seeReviews") ? "highlithedHelp" : "" }>
                  <li>La section <strong>"Avis clients"</strong> peut être ouverte ou refermée à l’aide du bouton accordéon.</li><br />
                  <li>La distribution des notes affiche le nombre d’avis pour chaque nombre d’étoiles.</li><br />
                  <li>Chaque avis contient le nom du client, la date, la note attribuée et le commentaire associé.</li><br />
                  <li>Les images jointes à un avis peuvent être agrandies en cliquant dessus.</li>
              </ul>

            <VideoStep videoSrc="ClientFlagReview.mp4" />
            
              <p><strong>🚩 Signaler un avis</strong></p>
              <ul data-help="report" className={(help === "report") ? "highlithedHelp" : "" }>
                  <li>Le menu <strong>"⋯"</strong> permet d’accéder aux options d’un commentaire.</li><br />
                  <li>Le bouton <strong>"Signaler"</strong> permet d’indiquer un avis inapproprié ou problématique.</li><br />
                  <li>Un avis déjà signalé apparaîtra avec l’indication <strong>"✓ Signalé"</strong>.</li>
              </ul>

              <p><strong>🖼️ Visionner les images</strong></p>
              <ul data-help="images" className={(help === "images") ? "highlithedHelp" : "" }>
                  <li>Les images des avis peuvent être ouvertes en plein écran dans la visionneuse.</li><br />
                  <li>Les flèches permettent de naviguer entre les différentes images.</li><br />
                  <li>Le compteur affiche la position actuelle dans la galerie.</li><br />
                  <li>Le bouton <strong>"✕"</strong> permet de fermer la visionneuse.</li>
              </ul>
          </div>
      </div>

  );
}
