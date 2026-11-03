import "../helpPage.css";

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function FaqPage({ help }: { help: string | null }) {

  return (
    <div>
        <h4>❓ Questions fréquentes</h4>

        <div>
            <p>
            Cette page vous permet de consulter rapidement les réponses aux questions les plus fréquentes.
            Les questions sont classées par catégorie afin de faciliter votre recherche.
            </p>

            <p><strong>📂 Navigation par catégories</strong></p>
            <ul data-help="categories" className={(help === "categories") ? "highlithedHelp" : ""} >
                <li>Cliquez sur <strong>Toutes</strong> pour afficher toutes les questions</li>
                <li>Sélectionnez une catégorie pour filtrer les résultats</li>
                <li>La catégorie active est mise en évidence</li>
            </ul>

            <p><strong>📖 Consultation des réponses</strong></p>
            <ul data-help="accordion" className={(help === "accordion") ? "highlithedHelp" : ""}>
                <li>Cliquez sur une question pour afficher la réponse</li>
                <li>Cliquez de nouveau pour refermer la section</li>
                <li>Plusieurs questions peuvent être consultées indépendamment</li>
                
                <ul><p><strong>🏷️ Badges de catégories</strong></p>
                    <li>Chaque question possède un badge indiquant sa catégorie</li>
                    <li>Les couleurs permettent d’identifier rapidement le type de question</li>
                </ul>
            </ul>

            
        </div>
    </div>
  );
}
