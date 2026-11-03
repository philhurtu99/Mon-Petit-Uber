import "../helpPage.css";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function RegisterPage({help }: {help: string | null}) {

  return (
    <div>
      <h4>📝 Inscription</h4>

     <div>
        <p>
          Pour créer un compte, remplissez les champs obligatoires et choisissez un 
          <strong>mot de passe sécurisé</strong>.
        </p>

        <p><strong>👤 Informations de base</strong></p>
        <ul data-help="base" className={(help === "base") ? "highlithedHelp" : "" }>
          <li>Entrez votre <strong>prénom</strong> et votre <strong>nom</strong></li>
          <li>Utilisez une adresse <strong>courriel valide</strong></li>
        </ul>

        <p><strong>🔑 Mot de passe</strong></p>
        <ul data-help="password" className={(help === "password") ? "highlithedHelp" : "" }>
          <li>Minimum <strong>8 caractères</strong></li>
          <li>Au moins <strong>une majuscule</strong> et <strong>une minuscule</strong></li>
          <li>Au moins <strong>un chiffre</strong></li>
          <li>Au moins <strong>un caractère spécial</strong> (ex : @, !, %, etc.)</li>
        </ul>

        <p>
          Utilisez l’icône 👁️ pour afficher ou masquer votre mot de passe.
        </p>

        <p><strong>✅ Confirmation</strong></p>
        <ul data-help="confirmation" className={(help === "confirmation") ? "highlithedHelp" : "" }>
          <li>Les deux mots de passe doivent être <strong>identiques</strong></li>
        </ul>

        <p><strong>➕ Informations optionnelles</strong></p>
        <ul  data-help="optionnel" className={(help === "optionnel") ? "highlithedHelp" : "" }>
          <li>Vous pouvez ajouter une <strong>adresse</strong></li>
          <li>Entrer un <strong>numéro de téléphone</strong> valide (format : 123-456-7890)</li>
          <li>Ajouter une <strong>photo de profil</strong></li>
        </ul>

        <p><strong>⚠️ Erreurs possibles</strong></p>
        <ul>
          <li>Mot de passe non conforme</li>
          <li>Les mots de passe ne correspondent pas</li>
          <li>Numéro de téléphone invalide</li>
          <li>Champs obligatoires manquants</li>
        </ul>

        <p><strong>📩 Après inscription</strong></p>
        <ul>
          <li>Un courriel de confirmation vous sera envoyé</li>
          <li>Vous devez cliquer sur le lien pour <strong>activer votre compte</strong></li>
        </ul>

        <p><strong>🔄 Déjà un compte ?</strong></p>
        <ul data-help="login" className={(help === "login") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>"Se connecter"</strong> pour accéder à votre compte</li>
        </ul>

        <p><strong>🛠️ Besoin d’aide ?</strong></p>
        <p>
          Si vous rencontrez un problème lors de l’inscription, vérifiez vos informations ou contactez le support.
        </p>
      </div>
    </div>
  );
}
