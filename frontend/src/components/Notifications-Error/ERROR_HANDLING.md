# Gestion des Erreurs - Page Admin Inventory

## Vue d'ensemble

Ce système améliore la gestion des erreurs du backend en mappant automatiquement les messages d'erreur aux champs appropriés dans les formulaires.

## Architecture

### 1. **errorMapper.ts** 
Fichier utilitaire qui contient deux fonctions principales :

- **`mapBackendError(message: string)`** : Analyse le message d'erreur du backend et détermine à quel champ il appartient
  - `name` : Erreurs sur le nom du produit
  - `price` : Erreurs sur le prix
  - `stock` : Erreurs sur le stock
  - `sale` : Erreurs sur la réduction/rabais
  - `other` : Autres erreurs

- **`applyError(errorMapping, setters...)`** : Applique automatiquement l'erreur au bon setter

### 2. **Messages d'erreur du backend** (backend/src/services/product.service.ts)

Les messages d'erreur envoyés par le backend contiennent les clés suivantes :
- "Nom invalide" → mapped to `name`
- "Le prix doit être supérieur à 0" → mapped to `price`
- "Le stock ne peut pas être négatif" → mapped to `stock`
- "Le rabais doit être entre 0 et 90" → mapped to `sale`
- "Un produit avec ce nom existe déjà" → mapped to `name`

### 3. **Fonctions de gestion (admin-inventory.tsx)**

Les trois fonctions principales utilisent le mapper :

```typescript
// Ajouter un produit
const handleAddProductConfirm = (newProduct, setNameError, setPriceError, setStockError, setSaleError) => {
  // ... fetch
  if (status === 409 || status === 400) {
    const errorMapping = mapBackendError(data.message);
    applyError(errorMapping, setNameError, setPriceError, setStockError, setSaleError);
    return;
  }
}

// Éditer un produit
const handleEditProductConfirm = (updatedProduct, setNameError, setPriceError, setStockError, setSaleError) => {
  // ... même pattern
}

// Ajouter/Éditer une catégorie
// Utilise directement data.message pour afficher dans un modal
```

## Flux d'erreur

```
Backend lance une erreur
       ↓
Contrôleur retourne status 400/409 avec message
       ↓
Frontend récupère la réponse JSON
       ↓
mapBackendError() analyse le message
       ↓
applyError() applique au bon champ
       ↓
Le champ d'erreur s'affiche dans le formulaire
```

## Exemple d'utilisation

### Ajout de produit avec erreur de nom dupliqué :

1. L'utilisateur essaie d'ajouter un produit avec un nom existant
2. Le backend retourne : 
   ```json
   { 
     "status": 409, 
     "message": "Un produit avec ce nom existe déjà" 
   }
   ```
3. `mapBackendError()` détecte "existe déjà" et "nom" → retourne `{ fieldType: "name", message: "..." }`
4. `applyError()` appelle `setNameError(message)`
5. Le champ "Nom" du formulaire affiche l'erreur

## Améliorations apportées

✅ Les messages d'erreur du backend sont maintenant directement affichés  
✅ Mapping automatique au bon champ sans logique if/else complexe  
✅ Facile à maintenir et étendre  
✅ Messages cohérents entre ajout et édition  
✅ Support des modals d'erreur pour les catégories  

## Comment étendre

Pour ajouter une nouvelle règle de mapping :

1. Ouvrir `errorMapper.ts`
2. Ajouter une nouvelle condition dans `mapBackendError()` :
```typescript
if (lowerMessage.includes("votre_keyword")) {
  return { fieldType: "mon_champ", message };
}
```

3. Ajouter un case dans `applyError()` si nécessaire
