import "../helpPage.css";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function ResetPasswordPage({ help: _help }: { help: string | null }) {

  return (
    <div>
      <h4>🔐 Réinitialisation du mot de passe</h4>

     <div>
        <p>
          Pour sécuriser votre compte, choisissez un nouveau mot de passe et confirmez-le.
          Une fois validé, vous pourrez vous reconnecter avec ce nouveau mot de passe.
        </p>

        <p><strong>🔑 Nouveau mot de passe</strong></p>
        <ul>
          <li>Doit contenir au moins <strong>8 caractères</strong></li>
          <li>Inclure au moins <strong>une majuscule</strong> et <strong>une minuscule</strong></li>
          <li>Inclure au moins <strong>un chiffre</strong></li>
          <li>Inclure au moins <strong>un caractère spécial</strong> (ex : @, !, %, etc.)</li>
        </ul>

        <p>
          Utilisez l’icône 👁️ pour afficher ou masquer votre mot de passe si nécessaire.
        </p>

        <p><strong>✅ Confirmation du mot de passe</strong></p>
        <ul>
          <li>Les deux mots de passe doivent être <strong>identiques</strong></li>
        </ul>

        <p><strong>⚠️ Erreurs possibles</strong></p>
        <ul>
          <li>Mot de passe non conforme aux règles de sécurité</li>
          <li>Les mots de passe ne correspondent pas</li>
          <li>Le lien de réinitialisation est expiré ou invalide</li>
        </ul>

        <p><strong>📩 Après validation</strong></p>
        <ul>
          <li>Votre mot de passe sera mis à jour immédiatement</li>
          <li>Vous pourrez ensuite cliquer sur <strong>"Se connecter"</strong></li>
        </ul>

        <p><strong>🛠️ Besoin d’aide ?</strong></p>
        <p>
          Si vous rencontrez un problème, essayez de refaire une demande de 
          réinitialisation ou contactez le support.
        </p>
      </div>

    </div>
  );
}
