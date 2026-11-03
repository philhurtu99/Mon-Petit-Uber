import "../helpPage.css";
import VideoStep from "../video-step/video-step";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function RestrictedWordsPage({help }: {help: string | null}) {

  return (
    <div>
    <h4>🚫 Gestion des mots filtrés</h4>

    <div>
        <p>
        Cette page permet de gérer les mots ou expressions interdits dans votre système.
        Vous pouvez ajouter, modifier, activer ou désactiver des mots filtrés afin de
        contrôler le contenu autorisé.
        </p>

        <VideoStep videoSrc="AdminGestionMots.mp4" />
        
        <p><strong>➕ Ajouter ou modifier un mot</strong></p>
        <ul data-help="form" className={help === "form" ? "highlithedHelp" : ""}>
        <li>Ajoutez un mot ou une expression à filtrer dans le champ prévu.</li><br/>
        <li>Activez ou désactivez le mot à l’aide de la case à cocher.</li><br/>
        <li>Cliquez sur <strong>"Ajouter"</strong> pour créer un nouveau mot ou <strong>"Mettre à jour"</strong> pour modifier un existant.</li><br/>
        <li>Vous pouvez annuler une modification en cours avec le bouton <strong>"Annuler"</strong>.</li>
        </ul>

        <p><strong>🔍 Recherche et filtres</strong></p>
        <ul data-help="filters" className={help === "filters" ? "highlithedHelp" : ""}>
        <li>Utilisez la barre de recherche pour trouver un mot filtré rapidement.</li>
        <li>Filtrez la liste selon l’état : actifs, inactifs ou tous les mots.</li>
        </ul>

        <p><strong>📋 Liste des mots filtrés</strong></p>
        <ul data-help="table" className={help === "table" ? "highlithedHelp" : ""}>
        <li>Consultez tous les mots filtrés enregistrés dans le système.</li>
        <li>Chaque ligne affiche le mot, son statut, son créateur et sa date d’ajout.</li>
        </ul>

        <p><strong>🔄 Activation / désactivation</strong></p>
        <ul data-help="status" className={help === "status" ? "highlithedHelp" : ""}>
        <li>Activez ou désactivez un mot en un clic depuis la liste.</li>
        <li>Les mots inactifs ne sont plus pris en compte dans le filtrage.</li>
        </ul>

        <p><strong>✏️ Modification</strong></p>
        <ul data-help="edit" className={help === "edit" ? "highlithedHelp" : ""}>
        <li>Cliquez sur l’icône d’édition pour modifier un mot existant.</li>
        <li>Aller au début de la page pour voir le formulaire d'édition.</li>
        </ul>

        <p><strong>🗑️ Suppression</strong></p>
        <ul data-help="delete" className={help === "delete" ? "highlithedHelp" : ""}>
        <li>Supprimez un mot filtré en cliquant sur l’icône de suppression.</li>
        <li>Une confirmation est requise avant suppression définitive.</li>
        </ul>

        <br/><br/>
        <div>
          <h4>🚩 Gestion des avis signalés</h4>

          <div>
              <p>
              Cette page permet de consulter et modérer les avis signalés par les utilisateurs.
              Vous pouvez afficher, masquer ou modifier les avis afin de maintenir un contenu approprié et conforme aux règles de votre plateforme.
              </p>

              <VideoStep videoSrc="AdminEditReview.mp4" />

              <p><strong>📋 Consulter les avis signalés</strong></p>
              <ul>
                  <li>Chaque carte affiche l’auteur de l’avis, la date de publication, le produit concerné et la note attribuée.</li><br/>
                  <li>Le compteur de signalements indique combien de fois l’avis a été signalé par les utilisateurs.</li><br/>
                  <li>Le commentaire est affiché avec un aperçu limité à 150 caractères.</li>
              </ul>

              <p><strong>👁️ Afficher ou masquer un avis</strong></p>
              <ul data-help="toggle-active" className={help === "toggle-active" ? "highlithedHelp" : ""}>
                  <li>Le bouton <strong>"Masquer"</strong> permet de désactiver un avis visible publiquement.</li><br/>
                  <li>Le bouton <strong>"Afficher"</strong> permet de réactiver un avis masqué.</li><br/>
                  <li>Cette action permet de modérer rapidement les contenus signalés sans supprimer l’avis.</li>
              </ul>

              <p><strong>✏️ Modifier un avis</strong></p>
              <ul data-help="edit-review" className={help === "edit-review" ? "highlithedHelp" : ""}>
                  <li>Cliquez sur <strong>"Modifier"</strong> pour éditer le commentaire d’un avis signalé.</li><br/>
                  <li>Le texte peut être corrigé ou ajusté directement dans la zone de saisie.</li><br/>
                  <li>Cliquez sur <strong>"Enregistrer"</strong> pour sauvegarder les modifications.</li><br/>
                  <li>Le bouton <strong>"Annuler"</strong> permet de quitter le mode édition sans enregistrer les changements.</li>
              </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
