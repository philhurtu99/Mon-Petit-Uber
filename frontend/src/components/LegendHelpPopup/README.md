# LegendHelpPopup Component

Un composant React réutilisable pour afficher un bouton d'aide avec mascotte et un panneau latéral avec une légende des champs de formulaire.

## Features

✅ Bouton toggle circulaire fixe en bas à gauche avec mascotte  
✅ "?" avec glow blanc lumineux  
✅ Panneau latéral qui glisse de la gauche  
✅ Overlay semi-transparent derrière le panneau  
✅ Fermeture au clic sur l'overlay ou via le bouton  
✅ Scrollbar personnalisée  
✅ Accessible (attributs ARIA)  
✅ Réutilisable dans n'importe quel formulaire  

## Installation

Le composant est situé dans `src/components/LegendHelpPopup/`

## Usage

```tsx
import { LegendHelpPopup, type LegendItem } from "../../components/LegendHelpPopup";

// Dans ton composant
const [showLegend, setShowLegend] = useState(false);

const legendItems: LegendItem[] = [
  {
    label: "Nom du champ",
    description: "Description du champ",
    isRequired: true,
  },
  {
    label: "Autre champ",
    description: "Description du second champ",
    isRequired: false,
  },
];

return (
  <>
    {/* Le composant rend le bouton en bas à gauche et le panneau latéral */}
    <LegendHelpPopup
      isOpen={showLegend}
      onClose={() => setShowLegend(false)}
      onToggle={() => setShowLegend(!showLegend)}
      title="Légende des champs"
      items={legendItems}
    />
    
    {/* Reste du formulaire */}
    <h2>Mon Formulaire</h2>
  </>
);
```

## Props

| Prop | Type | Description | Required |
|------|------|-------------|----------|
| `isOpen` | `boolean` | Indique si le panneau est ouvert | ✅ |
| `onClose` | `() => void` | Callback appelée pour fermer le panneau | ✅ |
| `onToggle` | `() => void` | Callback appelée pour basculer l'état | ✅ |
| `title` | `string` | Titre du panneau d'aide | ❌ (default: "Légende des champs") |
| `items` | `LegendItem[]` | Tableau des items de l'aide | ✅ |

## LegendItem Interface

```tsx
interface LegendItem {
  label: string;        // Titre du champ
  description: string;  // Description du champ
  isRequired?: boolean; // Affiche un astérisque rouge si true
}
```

## Styling

Le composant utilise des variables de couleur fixées. Pour adapter les couleurs à ton thème :

Ouvre `src/components/LegendHelpPopup/LegendHelpPopup.css` et modifie :

- `#8dc640` - Couleur primaire (vert)
- `#7ab02f` - Couleur hover (vert foncé)
- `#0a1d3f` - Couleur du fond (bleu foncé)
- `#ffffff` - Couleurs du texte

## Exemple Complet

Voir l'utilisation dans `src/pages/Promotions_admin/promotions.tsx` pour un exemple complet d'intégration.

## Notes

- Le composant rend le bouton ET le panneau
- Le panneau s'ouvre depuis la gauche avec animation
- Cliquer sur l'overlay ferme le panneau
- Le composant est accessible avec les attributs ARIA appropriés
