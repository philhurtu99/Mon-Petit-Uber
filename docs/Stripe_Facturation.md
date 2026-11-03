# 💳 Stripe - Facturation et Paiements

Ce document détaille la configuration nécessaire pour utiliser **Stripe Checkout** dans le projet.  
L'application utilise Stripe pour créer une session de paiement, rediriger le client vers une page sécurisée Stripe, puis confirmer la commande après paiement.

---

## 🧾 Création du compte Stripe

1. Aller sur le site Stripe : https://dashboard.stripe.com/register
2. Créer un compte avec l'adresse courriel du projet ou de l'organisation.
3. Garder le compte en **mode test** pendant le développement.
4. Compléter les informations de l'entreprise seulement lorsque l'application est prête à accepter de vrais paiements.

### 🔑 Clés Stripe

Dans le Dashboard Stripe :

- Ouvrir **Developers**.
- Ouvrir **API keys**.
- Copier la clé secrète de test `sk_test_...`.
- Ne jamais placer cette clé dans le frontend.

| Type de clé | Utilisation | Exemple |
| :--- | :--- | :--- |
| Clé publique | Utilisée côté client si nécessaire. Ce projet n'en a pas besoin directement. | `pk_test_...` |
| Clé secrète | Utilisée uniquement par le backend pour créer les sessions Checkout. | `sk_test_...` |
| Secret webhook | Utilisé par le backend pour valider les événements Stripe. | `whsec_...` |

---

## ⚙️ Backend - Configuration Stripe

Le backend Express crée les sessions Stripe depuis :

```txt
backend/src/services/checkout.service.ts
```

La configuration Stripe se trouve dans :

```txt
backend/src/config/stripe.config.ts
```

### 🔑 Variables d'environnement backend

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe utilisée par le backend. | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret Stripe utilisé pour vérifier les webhooks. | `whsec_...` |
| `FRONTEND_URL` | URL du frontend utilisée pour les redirections après paiement. | `http://localhost:5173` |
| `DELIVERY_FEE_CENTS` | Frais de livraison en cents. | `200` |
| `DATABASE_URL` | URL PostgreSQL utilisée par Prisma. | `postgresql://...` |
| `PORT` | Port du backend. | `5000` |

Exemple local :

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
DELIVERY_FEE_CENTS=0
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/mon_petit_uber?schema=public
PORT=5000
```

> Important : les clés `sk_...` et `whsec_...` doivent rester privées et ne doivent jamais être commitées.

---

## 🎨 Frontend - Configuration Stripe

Le frontend ne contacte pas Stripe directement.  
Il appelle le backend, qui crée la session Checkout et renvoie une URL Stripe.

Le paiement est lancé depuis :

```txt
frontend/src/pages/cart/cart.tsx
```

Les pages de retour sont :

```txt
frontend/src/pages/checkout/CheckoutSuccess.tsx
frontend/src/pages/checkout/CheckoutCancel.tsx
```

### 🔑 Variables d'environnement frontend

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL publique du backend. | `http://localhost:5000` |

Exemple local :

```env
VITE_API_URL=http://localhost:5000
```

---

## 🔄 Flux de paiement

1. Le client ajoute des produits au panier.
2. Le client clique sur le bouton de paiement.
3. Le frontend appelle `POST /api/checkout/create-session`.
4. Le backend crée une session Stripe Checkout.
5. Stripe retourne une URL de paiement.
6. Le frontend redirige le client vers Stripe Checkout.
7. Après paiement, Stripe redirige vers `/checkout/success?session_id=...`.
8. Le frontend vérifie le paiement avec `GET /api/checkout/status`.
9. En production, Stripe envoie aussi l'événement `checkout.session.completed` au webhook backend.
10. Le backend crée la transaction, vide le panier, décrémente le stock et applique les crédits ou points fidélité.

---

## 🛣️ Routes backend utilisées

| Méthode | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/checkout/create-session` | Crée une session Stripe Checkout. |
| `GET` | `/api/checkout/status?session_id=...` | Vérifie le statut du paiement dans Stripe. |
| `GET` | `/api/checkout/confirm?session_id=...` | Finalise une session en développement local. |
| `POST` | `/api/checkout/webhook` | Reçoit les événements Stripe en production. |

> La route `/api/checkout/confirm` est disponible seulement hors production.

---

## 🪝 Webhook Stripe

Le webhook permet à Stripe de notifier le backend lorsqu'un paiement est terminé.

### 🧪 Webhook local avec Stripe CLI

Installer le Stripe CLI, puis se connecter :

```bash
stripe login
```

Lancer l'écoute locale :

```bash
stripe listen --forward-to localhost:5000/api/checkout/webhook
```

Stripe CLI affiche ensuite un secret qui commence par `whsec_...`.  
Copier cette valeur dans la variable :

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 📌 Événement à écouter

| Événement Stripe | Utilisation |
| :--- | :--- |
| `checkout.session.completed` | Confirme une session payée et finalise la commande. |

---

## 🧪 Tests en local

1. Démarrer PostgreSQL.
2. Démarrer le backend.
3. Démarrer le frontend.
4. Se connecter avec un utilisateur.
5. Ajouter des produits au panier.
6. Cliquer sur le bouton de paiement.
7. Utiliser une carte de test Stripe.
8. Vérifier la redirection vers `/checkout/success`.
9. Vérifier que la transaction apparaît dans l'historique.
10. Vérifier que le panier est vidé et que le stock est décrémenté.

### 💳 Carte de test Stripe

| Champ | Valeur |
| :--- | :--- |
| Numéro | `4242 4242 4242 4242` |
| Date | Une date future |
| CVC | N'importe quels 3 chiffres |
| Code postal | N'importe quelle valeur |

---

## 🚀 Configuration production

Dans Stripe :

1. Désactiver le mode test.
2. Récupérer la clé secrète `sk_live_...`.
3. Créer un endpoint webhook vers le backend de production :

```txt
https://URL_DU_BACKEND/api/checkout/webhook
```

4. Sélectionner l'événement `checkout.session.completed`.
5. Copier le secret webhook `whsec_...`.

### 🔑 Variables production backend

| Variable | Description |
| :--- | :--- |
| `NODE_ENV` | Mettre à `production`. |
| `STRIPE_SECRET_KEY` | Clé secrète live Stripe `sk_live_...`. |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe de production. |
| `FRONTEND_URL` | URL publique du frontend. |
| `DELIVERY_FEE_CENTS` | Frais de livraison en cents. |
| `DATABASE_URL` | URL PostgreSQL de production. |

### 🔑 Variables production frontend

| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | URL publique du backend. |

> En production, le backend utilise des cookies sécurisés. Le frontend et le backend doivent donc être servis en HTTPS.

---

## ✅ Points de contrôle

- Les clés Stripe ne sont pas commitées.
- `STRIPE_SECRET_KEY` est configurée côté backend seulement.
- `STRIPE_WEBHOOK_SECRET` correspond au bon webhook.
- `FRONTEND_URL` pointe vers la bonne URL frontend.
- `VITE_API_URL` pointe vers la bonne URL backend.
- Le webhook de production pointe vers `/api/checkout/webhook`.
- Une transaction payée crée bien une commande.
- Le panier est vidé après paiement.
- Le stock est décrémenté une seule fois.
- Les crédits client et les points fidélité sont bien appliqués.

---

## 📚 Sources utiles

- Cles API Stripe : https://docs.stripe.com/keys
- Stripe Checkout Sessions : https://docs.stripe.com/api/checkout/sessions
- Fulfillment et webhooks Checkout : https://docs.stripe.com/checkout/fulfillment
- Mode test Stripe : https://docs.stripe.com/test-mode
