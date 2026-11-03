import "../helpPage.css";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function LoginPage({help }: {help: string | null}) {

  return (
    <div>
      <h4>🔐 Connexion</h4>

     <div>
        <p>
          Pour accéder à votre compte, entrez votre <strong>courriel</strong> et votre 
          <strong> mot de passe</strong> dans les champs prévus, puis cliquez sur 
          <strong>"Se connecter"</strong>.
        </p>

        <p>✉️  <strong>Courriel</strong></p>
        <ul data-help="email" className={(help === "email") ? "highlithedHelp" : "" }>
          <li>Assurez-vous d’entrer l’adresse courriel associée à votre compte.</li>
          <li>Vérifiez qu’il n’y a pas d’erreur de frappe.</li>
        </ul>

        <p>🔑 <strong>Mot de passe</strong></p>
        <ul data-help="password" className={(help === "password") ? "highlithedHelp" : "" }>
          <li>Respectez les majuscules et minuscules.</li>
          <li>Utilisez l’icône 👁️ pour afficher ou masquer votre mot de passe si nécessaire.</li>
        </ul>

        <p>❓ <strong>Mot de passe oublié ?</strong></p>
        <ul data-help="forgot" className={(help === "forgot") ? "highlithedHelp" : "" }>
          <li>Cliquez sur <strong>"Mot de passe oublié ?"</strong> pour réinitialiser votre mot de passe.</li>
          <li>Vous recevrez un courriel avec les instructions.</li>
        </ul>

        <p>🔄 <strong>Autres options de connexion</strong></p>
        <ul data-help="google" className={(help === "google") ? "highlithedHelp" : "" }>
          <li>
            Vous pouvez aussi vous connecter rapidement avec votre compte 
            <strong> Google</strong> en cliquant sur <strong>"Continuer avec Google"</strong>.
          </li>
        </ul>

        <p>🆕 <strong>Pas encore de compte ?</strong></p>
        <ul data-help="register" className={(help === "register") ? "highlithedHelp" : "" }>
          <li>
            Cliquez sur <strong>"S'inscrire"</strong> pour créer un nouveau compte.
          </li>
        </ul>

        <p>⚠️ <strong>Problèmes de connexion</strong></p>
        <ul>
          <li>Vérifiez vos identifiants.</li>
          <li>Assurez-vous que votre connexion Internet fonctionne.</li>
          <li>Si le problème persiste, contactez le support.</li>
        </ul>
      </div>
    </div>
  );
}
