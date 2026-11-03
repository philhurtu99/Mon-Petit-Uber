# Guide technique — Configuration de la double authentification

> **Mon Petit Uber** — Documentation technique pour développeurs et administrateurs
>
> Ce document explique comment **installer, configurer et déployer** la fonctionnalité 2FA développée dans l'US 396.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Architecture technique](#3-architecture-technique)
4. [Configuration de la base de données](#4-configuration-de-la-base-de-données)
5. [Configuration des variables d'environnement](#5-configuration-des-variables-denvironnement)
6. [Configuration du service Email (Brevo)](#6-configuration-du-service-email-brevo)
7. [Configuration du service SMS (Twilio)](#7-configuration-du-service-sms-twilio)
8. [Mode console (développement)](#8-mode-console-développement)
9. [Démarrage et tests](#9-démarrage-et-tests)
10. [Déploiement en production](#10-déploiement-en-production)
11. [Dépannage](#11-dépannage)
12. [Annexes](#12-annexes)

---

## 1. Vue d'ensemble

### Qu'est-ce qui a été implémenté ?

La fonctionnalité **2FA (Two-Factor Authentication)** permet aux utilisateurs de sécuriser leur compte avec un code à 6 chiffres envoyé par **EMAIL** (via Brevo) ou par **SMS** (via Twilio).

### Fichiers ajoutés/modifiés

**Backend :**
- `prisma/schema.prisma` — Nouveaux champs sur `User` + modèle `TwoFactorCode` + enum `TwoFactorMethod`
- `src/services/sms.service.ts` — Service d'envoi SMS (Twilio + mode console)
- `src/services/twoFactor.service.ts` — Logique métier de la 2FA
- `src/services/user.service.ts` — Fonctions `getTwoFactor` et `setTwoFactorSettings`
- `src/controllers/auth.controller.ts` — Endpoint `verify-2fa` + modification du login
- `src/controllers/user.controller.ts` — Endpoints toggle 2FA
- `src/routes/auth.routes.ts` — Route `/verify-2fa`
- `src/routes/user.routes.ts` — Routes `/two-factor`

**Frontend :**
- `src/components/Auth/TwoFactorModal.tsx` — Modale de saisie du code à la connexion
- `src/components/Auth/TwoFactorSettings.tsx` — Section profil pour gérer la 2FA
- `src/components/Auth/twoFactorSettings.css` — Styles de la section
- `src/components/Auth/LoginModal.tsx` — Modifications pour intégrer la 2FA
- `src/components/Auth/AuthManager.tsx` — Gestion du flow 2FA
- `src/services/authService.ts` — Méthode `verifyTwoFactor`
- `src/services/userService.ts` — Méthodes `getTwoFactor` et `toggleTwoFactor`

---

## 2. Prérequis

### Logiciels requis

| Logiciel | Version | Utilité |
|---|---|---|
| **Node.js** | ≥ 18.x | Backend Express + Frontend Vite |
| **npm** | ≥ 9.x | Gestionnaire de paquets |
| **PostgreSQL** | ≥ 14.x | Base de données |
| **Git** | Récent | Versioning |

### Comptes externes (optionnels selon les besoins)

| Service | Obligatoire ? | Usage |
|---|---|---|
| **Brevo (anciennement Sendinblue)** | Pour 2FA EMAIL | Envoi d'emails transactionnels |
| **Twilio** | Pour 2FA SMS | Envoi de SMS transactionnels |

> **Mode console** disponible : pour développer sans aucune configuration externe, la 2FA peut afficher les codes dans le terminal au lieu de les envoyer réellement. Voir [Section 8](#8-mode-console-développement).

---

## 3. Architecture technique

### Schéma de fonctionnement

```
┌──────────────────────────────────────────────────────────────────┐
│  CONNEXION D'UN UTILISATEUR AVEC 2FA ACTIVÉE                     │
└──────────────────────────────────────────────────────────────────┘

1. User → POST /api/auth/login (email + password)
                                    ↓
2. Backend vérifie le mot de passe
                                    ↓
3. Si user.twoFactorEnabled = true :
     - Génère un code à 6 chiffres
     - Hash le code avec bcrypt
     - Stocke dans TwoFactorCode (expire dans 5 min)
     - Envoie le code via :
        * EMAIL → API Brevo
        * SMS → API Twilio (ou console)
     - Retourne { requiresTwoFactor: true, userId, method }
                                    ↓
4. Frontend affiche TwoFactorModal
                                    ↓
5. User entre le code → POST /api/auth/verify-2fa { userId, code }
                                    ↓
6. Backend :
     - Compare le code (bcrypt)
     - Vérifie l'expiration
     - Marque comme utilisé (single-use)
                                    ↓
7. Si OK : Session créée → User connecté
```

### Modèles de données (Prisma)

```prisma
enum TwoFactorMethod {
  EMAIL
  SMS
}

model User {
  // ... champs existants
  twoFactorEnabled  Boolean           @default(false)
  twoFactorMethod   TwoFactorMethod?
  // phone existe déjà (utilisé pour SMS)
  twoFactorCodes    TwoFactorCode[]
}

model TwoFactorCode {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  codeHash   String   // bcrypt hash, jamais en clair
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())
}
```

### Stack technique

| Couche | Technologie |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + Material UI |
| **Backend** | Node.js + Express + TypeScript |
| **BD** | PostgreSQL + Prisma ORM |
| **Email** | API REST Brevo (fetch) |
| **SMS** | SDK Twilio (`twilio` npm package) |
| **Hash codes** | bcrypt (10 rounds) |
| **Sessions** | express-session |

---

## 4. Configuration de la base de données

### Étape 1 : Vérifier que PostgreSQL fonctionne

```bash
# Sur Windows (avec service installé)
pg_ctl status

# Tester la connexion
psql -U postgres -h localhost -p 5432
```

### Étape 2 : Configurer DATABASE_URL

Dans `.env` du backend :

```env
DATABASE_URL="postgresql://postgres:VOTRE_PASSWORD@localhost:5432/project_react?schema=public"
```

> **Sécurité :** Ne JAMAIS commiter `.env` dans Git. Vérifier que `.env` est dans `.gitignore`.

### Étape 3 : Appliquer les migrations Prisma

```bash
cd backend
npx prisma generate         # Génère le client Prisma
npx prisma migrate dev      # Applique les migrations existantes
```

### Étape 4 : Vérifier la BD

```bash
npx prisma studio
```

Ouvre une interface web pour inspecter la BD. Tu devrais voir :
- Table `User` avec les champs `twoFactorEnabled`, `twoFactorMethod`, `phone`
- Table `TwoFactorCode` (initialement vide)

---

## 5. Configuration des variables d'environnement

### Fichier `.env` du backend

Créer un fichier `backend/.env` avec :

```env
# ─── Base de données ──────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mon_petit_uber?schema=public"

# ─── Session ──────────────────────────────────────────────
SESSION_SECRET="VOTRE_SECRET_LONG_ET_ALEATOIRE_ICI_MINIMUM_32_CARACTERES"

# ─── URL Frontend (pour les liens dans les emails) ────────
FRONTEND_URL="http://localhost:5173"

# ─── Email - Brevo ────────────────────────────────────────
BREVO_API_KEY="xkeysib-VOTRE_CLE_API_BREVO"

# ─── SMS - Twilio ─────────────────────────────────────────
SMS_PROVIDER="console"          # "console" en dev, "twilio" en prod/démo
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_PHONE_NUMBER="+1XXXXXXXXXX"   #  Le numéro de TON compte Twilio (l'expéditeur), PAS un destinataire

# ─── Mode développement ───────────────────────────────────
NODE_ENV="development"
```

### Fichier `.env` du frontend

Créer un fichier `frontend/.env` avec :

```env
VITE_API_URL="http://localhost:5000"
```

### Variables expliquées

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://...` |
| `SESSION_SECRET` | Clé secrète pour les sessions | Min. 32 caractères aléatoires |
| `FRONTEND_URL` | URL du frontend (pour les liens email) | `http://localhost:5173` |
| `BREVO_API_KEY` | Clé API Brevo (commence par `xkeysib-`) | Voir [Section 6](#6-configuration-du-service-email-brevo) |
| `SMS_PROVIDER` | `"console"` ou `"twilio"` | Voir [Section 7](#7-configuration-du-service-sms-twilio) |
| `TWILIO_ACCOUNT_SID` | Identifiant compte Twilio | Commence par `AC` |
| `TWILIO_AUTH_TOKEN` | Token d'auth Twilio | 32 caractères |
| `TWILIO_PHONE_NUMBER` | **Numéro Twilio de TON compte** (expéditeur, jamais un destinataire) | `+16206478635` |

---

## 6. Configuration du service Email (Brevo)

### Pourquoi Brevo ?

- **300 emails gratuits par jour** (largement suffisant pour un projet d'école)
- API REST simple à intégrer (pas de SMTP)
- Fiable et utilisé en production par des milliers d'entreprises

### Étape 1 : Créer un compte Brevo

1. Aller sur https://www.brevo.com/
2. Cliquer sur **Sign up free**
3. Remplir le formulaire d'inscription
4. Confirmer votre courriel

### Étape 2 : Configurer l'expéditeur

Brevo exige un expéditeur vérifié avant tout envoi :

1. Dans Brevo, aller dans **Senders, Domains & Dedicated IPs** → **Senders**
2. Cliquer sur **Add a sender**
3. Remplir :
   - **Sender name** : Mon Petit Uber
   - **Sender email** : votre adresse (ex: `noreply@monpetituber.app`)
4. Cliquer **Save**
5. Vérifier votre courriel et confirmer

### Étape 3 : Récupérer la clé API

1. Dans Brevo, cliquer sur votre **avatar** (en haut à droite) → **SMTP & API**
2. Onglet **API Keys**
3. Cliquer **Generate a new API key**
4. Donner un nom (ex: `MonPetitUber-DEV`)
5. **Copier la clé** (commence par `xkeysib-`)

> **Important :** La clé n'est affichée qu'une seule fois. Si vous la perdez, il faut en générer une nouvelle.

### Étape 4 : Ajouter la clé dans `.env`

```env
BREVO_API_KEY="xkeysib-VOTRE_CLE_COMPLETE_ICI"
```

### Étape 5 : Tester l'envoi

Le code dans `src/controllers/auth.controller.ts` utilise déjà l'API Brevo via `fetch()` :

```javascript
const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    "api-key": process.env.BREVO_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sender: { email: "noreply@monpetituber.app", name: "Mon Petit Uber" },
    to: [{ email: userEmail }],
    subject: "Code de vérification",
    htmlContent: `<p>Votre code : <strong>${code}</strong></p>`,
  }),
});
```

>  Pour tester sans envoyer de vrais emails, utiliser le **mode console** (voir Section 8).

---

## 7. Configuration du service SMS (Twilio)

###  Comprendre les deux types de numéros (TRÈS IMPORTANT)

Avant de commencer, il est essentiel de comprendre cette distinction. C'est l'erreur n°1 des nouveaux développeurs Twilio.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   COMMENT FONCTIONNE L'ENVOI D'UN SMS                            │
│                                                                  │
│  ┌────────────────────────┐         ┌──────────────────────┐    │
│  │  TWILIO_PHONE_NUMBER   │   SMS   │  Numéro DESTINATAIRE │    │
│  │    (= expéditeur)      │ ──────► │   (= utilisateur)    │    │
│  │                        │         │                      │    │
│  │  Le numéro Twilio de   │         │  Numéro vrai d'une   │    │
│  │  TON compte            │         │  personne réelle     │    │
│  │                        │         │                      │    │
│  │  Ex: +16206478635      │         │  Ex: +15145551234    │    │
│  │                        │         │                      │    │
│  │  ⚙️  Va dans .env       │         │  ⚙️  Verified Caller │    │
│  │     (1 seul, fixe)     │         │     IDs (plusieurs)  │    │
│  └────────────────────────┘         └──────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Aspect | `TWILIO_PHONE_NUMBER` (expéditeur) | Verified Caller IDs (destinataires) |
|---|---|---|
| **Rôle** | D'où viennent les SMS | À qui sont envoyés les SMS |
| **Combien ?** | Un seul par compte | Autant qu'on veut |
| **Où le configurer ?** | `.env` du backend | Console Twilio uniquement |
| **Format** | E.164, ex: `+16206478635` | E.164, ex: `+15145551234` |
| **Changement** | Rarement (sauf nouveau numéro acheté) | Souvent (ajout/retrait de testeurs) |
| **Dans le code** | `from: process.env.TWILIO_PHONE_NUMBER` | `to: userPhone` (depuis la BD) |
| **Mode Trial** | Fourni gratuitement par Twilio | À ajouter et vérifier manuellement |
| **Mode payant** | Identique au Trial | Plus besoin de vérification |

>  **À retenir :** Le numéro dans `TWILIO_PHONE_NUMBER` du `.env` est l'**expéditeur fixe** de ton application. Il **ne représente JAMAIS** un utilisateur ou un destinataire de test.

---

### Pourquoi Twilio ?

- **15 $ de crédit gratuit** au signup (Trial)
- Permet d'envoyer environ **750 à 1875 SMS** pour tester
- API REST stable, utilisée en production par Uber, Airbnb, etc.

### Étape 1 : Créer un compte Twilio

1. Aller sur https://www.twilio.com/try-twilio
2. Remplir le formulaire d'inscription
3. **Vérifier votre numéro de téléphone** (Twilio appelle pour vérifier)
4. Répondre à quelques questions (langue préférée: Node.js, etc.)

### Étape 2 : Récupérer les identifiants

Dans la **Twilio Console** (https://console.twilio.com/) :

1. **Account SID** : visible sur la page d'accueil
   - Format : `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
2. **Auth Token** : visible sur la même page (cliquer "Show")
   - Format : `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Étape 3 : Obtenir le numéro Twilio (= EXPÉDITEUR des SMS)

>  **CONCEPT CLÉ — À LIRE ATTENTIVEMENT**
> 
> Il existe **DEUX TYPES de numéros** différents avec Twilio :
> 
> | Type | Rôle | Où ? | Combien ? |
> |---|---|---|---|
> | **Numéro Twilio** | Expéditeur (`from`) des SMS | Attribué par Twilio à ton compte | **1 seul** |
> | **Verified Caller IDs** | Destinataires de test (`to`) en mode Trial | Tu les ajoutes manuellement dans Twilio | **Plusieurs** |
> 
> **Le `TWILIO_PHONE_NUMBER` dans `.env` = TOUJOURS le numéro Twilio (expéditeur), JAMAIS un numéro de test.**
> Une fois configuré, **on n'y touche plus**.

En mode Trial, Twilio te fournit un **numéro gratuit** qui servira d'**expéditeur** pour tous les SMS de ton application :

1. Dans la console, aller dans **Phone Numbers** → **Manage** → **Active numbers**
2. Si aucun numéro : cliquer **Buy a number** → choisir un numéro **Canada** ou **US** avec capacités **SMS**
3. **Le numéro est gratuit en mode Trial** (mais sera décompté du crédit pour le coût mensuel)
4. **Copier le numéro** au format E.164 (ex: `+16206478635`)
5. **C'est CE numéro que tu mets dans `TWILIO_PHONE_NUMBER` dans le `.env`**

**Tu auras un seul numéro Twilio par compte.** Tu ne le changes pas plus tard. Si jamais tu changes (ex: tu achètes un nouveau numéro), tu mets à jour la `.env`.

### Étape 4 : Ajouter les numéros DESTINATAIRES de test (Verified Caller IDs)

>  **Rappel important :** Ces numéros sont **différents** du `TWILIO_PHONE_NUMBER`. Ce sont les **vrais numéros de téléphone** des personnes qui vont **recevoir** les SMS de test (toi, tes coéquipiers, le prof pour la démo, etc.).
> 
> Ces numéros ne vont **PAS** dans le `.env`. Ils sont enregistrés directement dans la console Twilio.

En mode Trial, Twilio ne peut envoyer des SMS QU'À des numéros **vérifiés** au préalable :

1. Aller dans **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Cliquer **Add a new Caller ID**
3. Entrer un numéro de destinataire (ex: ton numéro personnel, celui du prof, etc.)
4. Twilio enverra un code à 6 chiffres par appel ou SMS
5. Entrer le code pour valider

**Tu peux ajouter PLUSIEURS numéros de test :**
- Ton numéro personnel
- Le numéro d'un coéquipier
- Le numéro du prof (pour la démo)
- Etc.

>  **Mode Trial uniquement :** Cette étape est OBLIGATOIRE. Sans ça, vous aurez l'erreur Twilio `21608` ("The number is unverified").
>
> En production (compte payant), ces vérifications ne sont plus nécessaires : tous les numéros valides peuvent recevoir des SMS.

### Étape 5 : Ajouter les variables dans `.env`

Seul le numéro Twilio (expéditeur) va dans le `.env`. Les numéros de test restent dans la console Twilio.

```env
SMS_PROVIDER="twilio"
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_PHONE_NUMBER="+16206478635"   # ← Le numéro de TON compte Twilio (l'expéditeur)
```

>  **Ne JAMAIS mettre un numéro de test dans `TWILIO_PHONE_NUMBER`.** C'est toujours **TON** numéro Twilio.

### Étape 6 : Tester l'envoi

Le service `src/services/sms.service.ts` utilise le SDK Twilio :

```javascript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

await client.messages.create({
  body: `Votre code de vérification: ${code}`,
  from: process.env.TWILIO_PHONE_NUMBER,    // Numéro Twilio (expéditeur, défini dans .env)
  to: userPhone,                              // Numéro de l'utilisateur (destinataire, ex: +15145551234)
                                              // En mode Trial : doit être dans les Verified Caller IDs
});
```

### Surveillance de la consommation

Dans la console Twilio :

1. **Monitor** → **Logs** → **Messaging** : voir tous les SMS envoyés
2. **Account** → **Usage** : voir le solde restant
3. Coût approximatif au Canada : **~0.01 $ par SMS**

---

## 8. Mode console (développement)

### Pourquoi le mode console ?

Le mode console permet de **développer et tester la 2FA sans aucune configuration externe** (pas besoin de compte Brevo ni Twilio).

C'est aussi très utile pour les **coéquipiers** qui n'ont pas accès aux clés API.

### Comment ça fonctionne ?

Au lieu d'envoyer le code par EMAIL ou SMS, le code est **affiché dans le terminal du backend** :

```
═══════════════════════════════════════════════════
 [MODE CONSOLE] SMS qui serait envoyé à +15145551234
═══════════════════════════════════════════════════
Code de vérification 2FA: 472891
═══════════════════════════════════════════════════
```

### Activer le mode console

Dans `.env` du backend :

```env
SMS_PROVIDER="console"
```

>  Avec cette config, **aucun vrai SMS n'est envoyé**, même si les clés Twilio sont définies. C'est sécurisé.

### Pour l'EMAIL

Le mode console pour l'EMAIL n'est pas implémenté par défaut. Pour développer sans envoyer de vrais emails, deux options :

**Option A :** Commenter temporairement l'envoi de l'email dans `auth.controller.ts` et logger le code :

```javascript
console.log(`[DEV] Code 2FA pour ${userEmail}: ${code}`);
// const emailResponse = await fetch(...);
```

**Option B :** Utiliser un service de capture d'email comme **Mailtrap** (gratuit, voir https://mailtrap.io)

### Quand utiliser quoi ?

| Contexte | EMAIL | SMS |
|---|---|---|
| Développement local | Console ou Mailtrap | `SMS_PROVIDER=console` |
| Tests par les coéquipiers | Brevo (300/jour gratuit) | `SMS_PROVIDER=console` |
| Démo prof / présentation | Brevo | `SMS_PROVIDER=twilio` |
| Production | Brevo | `SMS_PROVIDER=twilio` |

---

## 9. Démarrage et tests

### Installation initiale

```bash
# 1. Cloner le repo
git clone <URL_DU_REPO>
cd <NOM_DU_REPO>

# 2. Installer les dépendances backend
cd backend
npm install

# 3. Installer les dépendances frontend
cd ../frontend
npm install

# 4. Configurer les .env (voir Sections 5-7)

# 5. Appliquer les migrations BD
cd ../backend
npx prisma generate
npx prisma migrate dev
```

### Démarrage en développement

**Terminal 1 — Backend :**

```bash
cd backend
npm run dev
```

Le backend démarre sur `http://localhost:5000`.

**Terminal 2 — Frontend :**

```bash
cd frontend
npm run dev
```

Le frontend démarre sur `http://localhost:5173`.

### Lancer les tests

```bash
cd backend
npm test
```

Vous devriez voir tous les tests passer (367+ tests verts incluant 35 tests 2FA).

### Tests manuels recommandés

1. **Test 1 — Activation EMAIL :**
   - Créer un compte test
   - Aller dans Profil → Sécurité → Activer 2FA EMAIL
   - Se déconnecter et se reconnecter
   - Vérifier réception du code par email (ou dans console si mode console)
   - Entrer le code → connexion réussie

2. **Test 2 — Activation SMS :**
   - Activer 2FA SMS avec un numéro valide
   - Se déconnecter et se reconnecter
   - Vérifier réception du SMS (ou dans console si mode console)
   - Entrer le code → connexion réussie

3. **Test 3 — Code expiré :**
   - Demander un code
   - Attendre 6+ minutes
   - Tenter d'utiliser le code → erreur attendue

4. **Test 4 — Code invalide :**
   - Entrer un mauvais code (ex: `000000`)
   - Vérifier le message d'erreur

5. **Test 5 — Désactivation :**
   - Désactiver la 2FA
   - Se reconnecter
   - Vérifier qu'aucun code n'est demandé

---

## 10. Déploiement en production

### Préparation

1. **Variables d'environnement de production**

   Définir sur la plateforme d'hébergement :
   ```env
   NODE_ENV="production"
   DATABASE_URL="postgresql://..."   # URL de la BD prod
   SESSION_SECRET="..."               # Nouveau secret unique
   FRONTEND_URL="https://www.monpetituber.app"
   BREVO_API_KEY="xkeysib-..."       # Clé prod (différente de dev)
   SMS_PROVIDER="twilio"              # Twilio en prod
   TWILIO_ACCOUNT_SID="AC..."        # Compte prod
   TWILIO_AUTH_TOKEN="..."           # Token prod
   TWILIO_PHONE_NUMBER="+1..."       # Numéro prod
   ```

2. **Mettre à niveau le compte Twilio**

   Pour ne plus avoir besoin de vérifier chaque numéro destinataire :
   - Aller dans **Account** → **Billing**
   - Ajouter un moyen de paiement
   - Le compte passe en mode payant
   - Tous les numéros valides peuvent maintenant recevoir des SMS

3. **Vérifier le domaine d'envoi Brevo**

   Pour améliorer la délivrabilité :
   - Dans Brevo : **Senders, Domains & Dedicated IPs** → **Domains**
   - Ajouter le domaine `monpetituber.app`
   - Configurer les enregistrements DNS (SPF, DKIM, DMARC)

4. **Appliquer les migrations BD en prod**

   ```bash
   npx prisma migrate deploy   # PAS "migrate dev" en prod !
   ```

### Checklist de déploiement

- [ ] `.env` configuré sur l'hébergeur (jamais committé)
- [ ] `SESSION_SECRET` est unique et long
- [ ] `NODE_ENV=production`
- [ ] BD de prod accessible
- [ ] Migrations Prisma appliquées (`migrate deploy`)
- [ ] HTTPS activé (certificat SSL valide)
- [ ] Cookies de session en mode `secure: true`
- [ ] CORS configuré pour le domaine de prod
- [ ] Twilio en mode payant (pas Trial)
- [ ] Brevo avec expéditeur vérifié
- [ ] Test bout-en-bout : créer compte + activer 2FA EMAIL + login + recevoir code
- [ ] Test bout-en-bout : activer 2FA SMS + login + recevoir SMS
- [ ] Monitoring des logs activé

---

## 11. Dépannage

###  Erreur : "Twilio Error 21608 - The number is unverified"

**Cause :** Le numéro **destinataire** (l'utilisateur qui reçoit le SMS) n'est pas dans les "Verified Caller IDs" du compte Twilio (mode Trial uniquement).

>  Cette erreur ne concerne **JAMAIS** le `TWILIO_PHONE_NUMBER` (qui est ton expéditeur). Elle concerne le **destinataire** du SMS, c'est-à-dire l'utilisateur qui a activé la 2FA SMS avec son numéro.

**Solution :**
1. Aller dans Twilio Console → **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Ajouter le numéro destinataire (celui de l'utilisateur qui tente de se connecter)
3. Vérifier via le code envoyé par Twilio (appel ou SMS)
4. Réessayer la connexion

**Solution alternative :** Passer en mode payant (carte de crédit ajoutée). En production, tous les numéros valides sont acceptés sans vérification préalable.

---

###  Erreur : "BREVO API 401 Unauthorized"

**Cause :** La clé API Brevo est invalide ou expirée.

**Solution :**
1. Vérifier la valeur de `BREVO_API_KEY` dans `.env`
2. La clé doit commencer par `xkeysib-`
3. Si la clé semble correcte, en générer une nouvelle dans Brevo
4. Redémarrer le backend après modification du `.env`

---

###  Erreur : "BREVO API 400 - Sender not allowed"

**Cause :** L'expéditeur dans le code n'est pas vérifié dans Brevo.

**Solution :**
1. Aller dans Brevo → **Senders**
2. Ajouter l'adresse expéditeur utilisée dans le code (ex: `noreply@monpetituber.app`)
3. Vérifier l'email reçu par Brevo

---

###  Aucun email ni SMS reçu, pas d'erreur

**Vérifications :**
1. `SMS_PROVIDER` est-il à `"twilio"` (pas `"console"`) ?
2. Le code 2FA s'affiche-t-il dans le terminal du backend ?
   - Si oui, c'est le mode console
3. Vérifier les logs Brevo/Twilio dans leurs consoles respectives
4. Vérifier le dossier spam pour les emails
5. Le numéro de téléphone est-il au format **E.164** (`+15145551234`) ?

---

###  Migration Prisma échoue

**Cause possible :** Conflit avec une migration existante.

**Solution :**
```bash
# Voir l'état actuel
npx prisma migrate status

# Si nécessaire, réinitialiser (ATTENTION : efface les données)
npx prisma migrate reset
```

>  `migrate reset` efface toutes les données. À ne JAMAIS faire en production.

---

###  Le frontend n'arrive pas à appeler le backend

**Cause :** CORS ou URL incorrecte.

**Solution :**
1. Vérifier `VITE_API_URL` dans `frontend/.env`
2. Doit pointer vers l'URL du backend (`http://localhost:5000` en dev)
3. Redémarrer le frontend après modification

---

###  Session perdue après chaque rechargement

**Cause possible :** `SESSION_SECRET` change à chaque démarrage, ou cookies bloqués.

**Solution :**
1. Définir `SESSION_SECRET` dans `.env` (valeur fixe)
2. Vérifier que `credentials: "include"` est dans tous les `fetch()` du frontend
3. En prod : `secure: true` et `sameSite: "none"` dans la config de session

---

## 12. Annexes

### Annexe A : Commandes utiles

```bash
# Backend
npm run dev              # Démarrer en dev
npm run build            # Builder pour la prod
npm test                 # Lancer les tests
npm run lint             # Linter le code

# Prisma
npx prisma studio        # Interface web pour la BD
npx prisma generate      # Régénérer le client
npx prisma migrate dev   # Créer + appliquer une migration en dev
npx prisma migrate deploy # Appliquer les migrations en prod

# Frontend
npm run dev              # Démarrer en dev
npm run build            # Build pour la prod
npx tsc --noEmit         # Vérifier les erreurs TypeScript
```

### Annexe B : Structure des dossiers

```
ProjectReact/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modèles BD
│   │   └── migrations/             # Migrations SQL
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts  # Login, register, verify-2fa
│   │   │   └── user.controller.ts  # Toggle 2FA, profil
│   │   ├── services/
│   │   │   ├── sms.service.ts      # Service Twilio + console
│   │   │   ├── twoFactor.service.ts # Logique métier 2FA
│   │   │   └── user.service.ts     # User et préférences
│   │   ├── routes/
│   │   │   ├── auth.routes.ts      # /verify-2fa, /login, etc.
│   │   │   └── user.routes.ts      # /two-factor, etc.
│   │   └── tests/                  # Tests Jest
│   └── .env                        # Variables d'environnement
│
└── frontend/
    ├── src/
    │   ├── components/Auth/
    │   │   ├── TwoFactorModal.tsx     # Saisie du code
    │   │   ├── TwoFactorSettings.tsx  # Section profil
    │   │   ├── LoginModal.tsx          # Modifié pour 2FA
    │   │   └── AuthManager.tsx         # Gestion du flow
    │   └── services/
    │       ├── authService.ts          # verifyTwoFactor
    │       └── userService.ts          # toggleTwoFactor
    └── .env                            # Variables d'env frontend
```

### Annexe C : Variables d'env récapitulatives

**Backend (`backend/.env`) :**

```env
DATABASE_URL="postgresql://..."
SESSION_SECRET="..."
FRONTEND_URL="..."
BREVO_API_KEY="xkeysib-..."
SMS_PROVIDER="console" | "twilio"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."
NODE_ENV="development" | "production"
```

**Frontend (`frontend/.env`) :**

```env
VITE_API_URL="http://localhost:5000"
```

### Annexe D : Endpoints API 2FA

| Méthode | Route | Body / Params | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password }` | Login normal. Si 2FA active, retourne `{ requiresTwoFactor: true, userId, method }` |
| `POST` | `/api/auth/verify-2fa` | `{ userId, code }` | Valide le code 2FA et crée la session |
| `GET` | `/api/user/two-factor` | (Auth requis) | Retourne `{ twoFactorEnabled, twoFactorMethod, phone }` |
| `PATCH` | `/api/user/two-factor` | `{ enabled, method?, phone? }` | Active/désactive la 2FA |

### Annexe E : Liens utiles

- **Brevo :** https://www.brevo.com/
- **Twilio Console :** https://console.twilio.com/
- **Twilio Pricing :** https://www.twilio.com/pricing
- **Prisma Docs :** https://www.prisma.io/docs
- **PostgreSQL Docs :** https://www.postgresql.org/docs/

---

##  À propos de ce document

**Version :** 1.0  
**Dernière mise à jour :** Mai 2026  
**Auteur :** Équipe Mon Petit Uber (US 396 - Cohorte 6412 FC)  
**Public :** Développeurs et administrateurs système

Pour des questions, contacter l'équipe ou consulter le repo GitHub du projet.

---

** Bonne configuration !**
