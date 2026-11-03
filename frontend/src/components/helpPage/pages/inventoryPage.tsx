import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function InventoryPage({help }: {help: string | null}) {

  return (
    <div>

      <h4>🧾 Notre inventaire</h4>

        <div>
          
            <p>
              Cette page permet de consulter l'inventaire des produits, ajouter, modifier ou supprimer un produit. Ainsi qu'ajouter, modifier ou supprimer une catégorie.
            </p>

            <VideoStep videoSrc="AdminInventaire.mp4" />
            
            <p><strong>🛍️ Liste des produits</strong></p>
            <ul data-help="list" className={(help === "list") ? "highlithedHelp" : "" }>
              <li>Les produits sont affichés sous forme de cartes.</li>
              <li>Chaque carte contient toutes les informations des produits (nom, prix, disponibilité, rabais, promotion, catégorie et une description).</li>
              <li>Vous pouvez modifier ou supprimer des produits.</li>
            </ul>

            <p><strong>➕ Ajouter un produit</strong></p>
            <ul data-help="addProduct" className={(help === "addProduct") ? "highlithedHelp" : "" }>
              <li>Cliquez sur le bouton <strong>Ajouter Produit</strong> pour accéder au formulaire de création d'un produit.</li>
            </ul>

            <p><strong>➕ Ajouter une catégorie</strong></p>
            <ul data-help="addCategory" className={(help === "addCategory") ? "highlithedHelp" : "" }>
              <li>Cliquez sur le bouton <strong>Ajouter Catégorie</strong> pour accéder au formulaire de création d'une catégorie.</li>
            </ul>

            <p><strong>🔎 Recherche et filtres</strong></p>
            <ul data-help="serachFilter" className={(help === "searchFilter") ? "highlithedHelp" : "" }>
              <li>Utilisez la barre de recherche pour trouver un produit rapidement.</li>
              <li>Appliquez des filtres pour affiner les résultats.</li>
              <li>Les résultats s’adaptent automatiquement.</li>
            </ul>

            <p><strong>➕ Modifier un produit</strong></p>
            <ul>
              <li>Cliquez sur le bouton<strong>Editer</strong> pour accéder au formulaire pour modifier un produit.</li>
            </ul>

            <p><strong>➕ Supprimer un produit</strong></p>
            <ul>
              <li>Cliquez sur le bouton<strong>Supprimer</strong> pour accéder à une page de confirmation de suppression d'un produit.</li>
            </ul>

            <p><strong>📦 Aucun produit trouvé</strong></p>
            <ul>
              <li>Un message s’affiche si aucun produit ne correspond à la recherche.</li>
              <li>Essayez de modifier vos filtres ou votre recherche.</li>
            </ul>

            <p><strong>💡 Conseils</strong></p>
            <ul>
              <li>Gérer l'inventaire avec l'ajout, modification ou la suppression des produits ou de leurs données.</li>
              <li>Gérer les catégories des produits avec l'ajout, modification ou la suppression des catégories.</li>
              <li>Utilisez les filtres pour gagner du temps.</li>
              <li>Vérifiez la disponibilité des produits avant ajout.</li>
            </ul>

          </div>

      </div>

  );
}
