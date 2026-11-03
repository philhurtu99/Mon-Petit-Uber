import "../helpPage.css";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function ForgotPasswordPage({ help }: { help: string | null }) {

  return (
    <div>
      <h4>🔑 Mot de passe oublié</h4>

     <div>
        <p>
          Si vous avez oublié votre mot de passe, vous pouvez demander un lien de 
          réinitialisation en entrant votre <strong>courriel</strong>.
        </p>

        <p><strong>✉️ Adresse courriel</strong></p>
        <ul data-help="email" className={(help === "email") ? "highlithedHelp" : "" }>
          <li>Entrez l’adresse associée à votre compte</li>
          <li>Vérifiez qu’il n’y a pas d’erreur de saisie</li>
        </ul>

        <p><strong>📩 Envoyer un lien</strong></p>
        <ul data-help="link" className={(help === "link") ? "highlithedHelp" : "" }>
          <li>Un courriel vous sera envoyé avec un lien sécurisé</li>
          <li>Cliquez sur ce lien pour choisir un nouveau mot de passe</li>
          <li>Le lien peut expirer après un certain temps</li>
        </ul>

        <p><strong>📬 Accès rapide à votre boîte mail</strong></p>
        <ul>
          <li>Un bouton peut apparaître pour ouvrir directement votre messagerie</li>
          <li>Vérifiez aussi votre dossier <strong>spam / indésirables</strong></li>
        </ul>

        <p><strong>⚠️ Problèmes possibles</strong></p>
        <ul>
          <li>Aucun compte associé à ce courriel</li>
          <li>Courriel non reçu (vérifiez les spams)</li>
          <li>Erreur de connexion Internet</li>
        </ul>

        <p><strong>🔄 Retour</strong></p>
        <ul data-help="back" className={(help === "back") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>"Retour à la connexion"</strong> pour revenir à la page de connexion</li>
        </ul>

        <p><strong>🛠️ Besoin d’aide ?</strong></p>
        <p>
          Si vous ne recevez pas le courriel ou rencontrez un problème, réessayez ou contactez le support.
        </p>
      </div>

    </div>
  );
}
