# 🚀 Hébergement et Déploiement

Ce document détaille la configuration nécessaire pour héberger l'application en production. L'architecture repose sur **Vercel** pour le Frontend et **Render** pour le Backend.

---

## 🎨 Frontend (Vercel)

Le frontend est une application React (Vite) déployée sur Vercel.

### ⚙️ Configuration Vercel
- **Framework Preset :** `Vite`
- **Root Directory :** `frontend`
- **Build Command :** `npm run build`
- **Output Directory :** `dist`

### 🔑 Variables d'environnement
| Variable | Description | Exemple |
| :--- | :--- | :--- |
| `VITE_API_URL` | L'URL publique de votre backend sur Render. | `https://api-projet.onrender.com` |

---

## ⚙️ Backend (Render)

Le backend est un service Node.js (Express + Prisma) déployé en tant que **Web Service** sur Render.

### ⚙️ Configuration Render
- **Runtime :** `Node`
- **Root Directory :** `backend`
- **Build Command :** `npm install && npx prisma generate && npm run build && npx prisma db push --force-reset && npm run seed`
- **Start Command :** `npm start`

### 🔑 Variables d'environnement

#### 🌐 Système & Base de données
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | URL de connexion PostgreSQL (ex: `postgres://user:pass@host:5432/db`). |
| `FRONTEND_URL` | URL de votre frontend sur Vercel (nécessaire pour les CORS). |
| `NODE_ENV` | Mettre à `production`. |
| `PORT` | Défini automatiquement par Render (généralement `10000`). |

#### 💳 Paiements (Stripe)
| Variable | Description |
| :--- | :--- |
| `STRIPE_SECRET_KEY` | Clé secrète API Stripe (sk_test_...). |
| `STRIPE_WEBHOOK_SECRET` | Secret pour valider les webhooks Stripe (whsec_...). |

#### 📧 Emails (Brevo)
| Variable | Description |
| :--- | :--- |
| `BREVO_API_KEY` | Clé API pour l'envoi des emails transactionnels. |

#### 📱 Notifications Push (Web Push)
| Variable | Description |
| :--- | :--- |
| `VAPID_PUBLIC_KEY` | Clé publique générée pour les notifications push. |
| `VAPID_PRIVATE_KEY` | Clé privée générée pour les notifications push. |
| `VAPID_SUBJECT` | Email de contact (ex: `mailto:admin@ecole.com`). |

#### 💬 SMS & 2FA (Twilio)
| Variable | Description |
| :--- | :--- |
| `SMS_PROVIDER` | `twilio` pour activer les SMS, ou `console` pour le développement. |
| `TWILIO_ACCOUNT_SID` | SID de votre compte Twilio. |
| `TWILIO_AUTH_TOKEN` | Token d'authentification Twilio. |
| `TWILIO_PHONE_NUMBER` | Votre numéro expéditeur Twilio. |

#### 🛠️ Paramètres Application
| Variable | Description |
| :--- | :--- |
| `ORDER_EXPIRATION_SECONDS` | Délai d'expiration des commandes (ex: `1800` pour 30min). |
| `DELIVERY_FEE_CENTS` | Frais de livraison en cents (ex: `200` pour 2.00$). |

---

## 🗄️ Base de données (Supabase - PostgreSQL)
L'application utilise **Prisma ORM** avec une base de données Supabase PostegreSQL. 
- Assurez-vous que la base de données PostgreSQL accepte les connexions entrantes de Render.

#### 🔑 Configuration Supabase
| Variable | Description |
| :--- | :--- |
| `Connection Pooling` | Il est recommandé d'utiliser le pooler Supabase en mode Transaction. |

#### 📦 Données stockés dans Supabase
| Variable |
| :--- |
| `User` |
| `Commande` |
| `Transaction` |
| `Product` |
| `Category` |
| `Promotion` |
| `Toute autre donnée métier gérée par Prisma` |

### 📁 Données stockés dans Supabase

Les fichiers envoyés par les utilisateurs (photos, images) ne sont **pas stockés dans Supabase Storage**.  
Ils sont conservés sur le serveur backend dans le dossier : **backend/uploads**

## 🔄 Flux de déploiement
1. **Push** sur la branche `release`.
2. **Vercel** détecte le changement et déploie le frontend.
3. **Render** détecte le changement, installe les dépendances, génère le client Prisma et redémarre le serveur.
