# Guide d'utilisation — Double authentification (2FA)

> **Mon Petit Uber** — Protégez votre compte avec la double authentification
> 
> Ce guide vous explique pas à pas comment activer, utiliser et désactiver la double authentification sur votre compte.

---

## Table des matières

1. [Qu'est-ce que la double authentification ?](#1-quest-ce-que-la-double-authentification-)
2. [Pourquoi l'utiliser ?](#2-pourquoi-lutiliser-)
3. [Comment l'activer ?](#3-comment-lactiver-)
4. [Comment ça fonctionne au moment de la connexion ?](#4-comment-ça-fonctionne-au-moment-de-la-connexion-)
5. [Comment changer de méthode ?](#5-comment-changer-de-méthode-)
6. [Comment la désactiver ?](#6-comment-la-désactiver-)
7. [Questions fréquentes](#7-questions-fréquentes)
8. [Problèmes courants et solutions](#8-problèmes-courants-et-solutions)
9. [Besoin d'aide ?](#9-besoin-daide-)

---

## 1. Qu'est-ce que la double authentification ?

La **double authentification** (ou **2FA** pour *Two-Factor Authentication*) est une **mesure de sécurité supplémentaire** pour protéger votre compte.

Au lieu de vous demander seulement votre **mot de passe**, l'application vous demande aussi un **code à 6 chiffres** qui vous est envoyé sur votre téléphone ou votre courriel.

### Une analogie simple

C'est comme avoir **deux serrures** à votre porte au lieu d'une seule :

- **Serrure 1 :** Votre mot de passe (ce que vous savez)
- **Serrure 2 :** Le code à 6 chiffres envoyé sur votre téléphone ou courriel (ce que vous avez)

Même si quelqu'un découvre votre mot de passe, il ne pourra **pas** entrer dans votre compte sans avoir aussi accès à votre téléphone ou votre boîte courriel.

---

## 2. Pourquoi l'utiliser ?

✅ **Plus de sécurité** : protège vos informations personnelles et votre crédit  
✅ **Tranquillité d'esprit** : même si votre mot de passe est volé, votre compte reste protégé  
✅ **Standard de l'industrie** : utilisé par Google, Facebook, votre banque, etc.  
✅ **Facile à utiliser** : ça prend 5 secondes de plus à la connexion

### Qui devrait l'activer ?

**Tout le monde !** Mais surtout si :
- Vous utilisez le **même mot de passe** sur plusieurs sites
- Vous avez **des informations bancaires** enregistrées
- Vous vous connectez parfois depuis des **ordinateurs publics** (école, café, etc.)
- Votre compte a **beaucoup de crédit** accumulé

---

## 3. Comment l'activer ?

### Étape 1 : Connectez-vous à votre compte

1. Ouvrez l'application **Mon Petit Uber**
2. Cliquez sur **Se connecter**
3. Entrez votre **courriel** et votre **mot de passe**

### Étape 2 : Allez dans votre profil

1. Une fois connecté, cliquez sur votre **avatar** (icône en haut à droite)
2. Cliquez sur **Mon profil**

### Étape 3 : Trouvez la section "Sécurité — Double authentification"

Faites défiler la page vers le bas, sous vos **Informations personnelles**, vous verrez une section :

```
┌─────────────────────────────────────────────────┐
│ 🛡️  Sécurité — Double authentification          │
│                                                 │
│ Ajoutez une couche de sécurité à votre compte...│
└─────────────────────────────────────────────────┘
```

### Étape 4 : Choisissez votre méthode de réception

Deux options s'offrent à vous :

#### **Option A : Par courriel**
- Le code arrive directement dans votre **boîte courriel**
- ✅ **Recommandé** si vous avez toujours votre téléphone à portée pour consulter vos courriels
- ✅ Aucun frais
- ⚠️ Vérifiez aussi votre dossier **spam** la première fois

#### **Option B : Par SMS**
- Le code arrive par **message texte** sur votre téléphone
- ✅ **Recommandé** si vous consultez peu vos courriels
- ✅ Très rapide (généralement instantané)
- ⚠️ Nécessite un numéro de téléphone valide

### Étape 5 : Si vous choisissez SMS, entrez votre numéro

Un champ apparaîtra :

```
Numéro de téléphone : [________________]
```

- Entrez votre numéro de téléphone à **10 chiffres** (format canadien)
- Pas besoin de mettre les tirets, le **format se fait automatiquement**
- Exemple : tapez `5141234567` → s'affiche `514-123-4567`

### Étape 6 : Cliquez sur "Activer la 2FA"

Un message de confirmation apparaîtra :

```
✓ Double authentification activée.
```

**Voilà ! Votre compte est maintenant protégé.** 

---

## 4. Comment ça fonctionne au moment de la connexion ?

Maintenant que la 2FA est activée, voici ce qui se passera à votre prochaine connexion :

### Étape 1 : Connexion habituelle

1. Vous entrez votre **courriel** et votre **mot de passe** comme d'habitude
2. Vous cliquez sur **Se connecter**

### Étape 2 : Une fenêtre apparaît

```
┌─────────────────────────────────────────────────┐
│ 🔐  Code de vérification                        │
│                                                 │
│ Un code à 6 chiffres a été envoyé à             │
│ votre [courriel / téléphone].                   │
│                                                 │
│ Entrez le code :                                │
│ [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]                  │
│                                                 │
│ [Vérifier]    [Annuler]                         │
└─────────────────────────────────────────────────┘
```

### Étape 3 : Récupérez votre code

#### Si vous avez choisi **EMAIL** :
1. Ouvrez votre boîte courriel
2. Cherchez un message de **Mon Petit Uber**
3. Le code à 6 chiffres y est indiqué

#### Si vous avez choisi **SMS** :
1. Regardez vos messages texte sur votre téléphone
2. Vous avez reçu un message contenant un code à 6 chiffres

### Étape 4 : Entrez le code

1. Tapez les **6 chiffres** dans la fenêtre
2. Cliquez sur **Vérifier**
3. **Vous êtes connecté !** 

### Important : Le code expire après 5 minutes

Si vous prenez trop de temps, vous devrez recommencer la connexion pour recevoir un nouveau code.

---

## 5. Comment changer de méthode ?

Si vous avez activé **EMAIL** mais préférez maintenant **SMS** (ou vice versa) :

1. Connectez-vous à votre compte
2. Allez dans **Profil → Sécurité**
3. **Désactivez** la 2FA actuelle (bouton orange)
4. **Réactivez-la** en choisissant la nouvelle méthode

---

## 6. Comment la désactiver ?

Si vous souhaitez **désactiver** la double authentification :

1. Connectez-vous à votre compte
2. Allez dans **Profil → Sécurité**
3. Cliquez sur le bouton orange **Désactiver**
4. Confirmation :

```
✓ Double authentification désactivée.
```

À votre prochaine connexion, vous n'aurez plus besoin de code.

 **Attention :** Désactiver la 2FA rend votre compte moins sécurisé. Nous recommandons fortement de la garder activée.

---

## 7. Questions fréquentes

### ❓ Est-ce gratuit ?

**Oui, c'est entièrement gratuit** pour vous. Les frais d'envoi (courriels et SMS) sont à notre charge.

### ❓ Combien de temps ai-je pour entrer le code ?

**5 minutes** à partir du moment où le code est envoyé. Au-delà, il faut recommencer.

### ❓ Puis-je utiliser le même code plusieurs fois ?

**Non.** Chaque code est à **usage unique**. Un nouveau code est généré à chaque tentative de connexion.

### ❓ Que se passe-t-il si je tape un mauvais code ?

Un message d'erreur s'affiche :
```
⚠ Code invalide ou expiré.
```
Vous pouvez réessayer. Si le code semble vraiment perdu, recommencez la connexion pour en recevoir un nouveau.

### ❓ Et si je n'ai pas reçu le code ?

Plusieurs raisons possibles :
- **Pour les courriels** : vérifiez votre dossier **spam/courriers indésirables**
- **Pour les SMS** : assurez-vous que votre téléphone a du signal
- Attendez **1-2 minutes** (les envois peuvent prendre un peu de temps)
- Si vraiment rien : retournez à la connexion et reprenez du début

### ❓ Le code est-il sécurisé ?

**Oui, plusieurs couches de protection :**
- Le code est **hashé** (encodé) dans notre base de données — même nos employés ne peuvent pas le voir en clair
- Il **expire après 5 minutes**
- Il est **à usage unique**
- Il est composé de **6 chiffres aléatoires** (1 million de combinaisons possibles)

### ❓ Puis-je activer la 2FA si je me connecte avec Google ?

**Oui !** La 2FA fonctionne aussi pour les comptes Google. Après la connexion Google habituelle, vous recevrez quand même le code de vérification.

### ❓ Que faire si je change de numéro de téléphone ?

Si vous utilisez la 2FA par SMS et que vous changez de numéro :

1. **Avant de changer** : Désactivez la 2FA dans votre profil
2. Mettez à jour vos **informations personnelles** avec le nouveau numéro
3. **Réactivez** la 2FA avec le nouveau numéro

### ❓ Que faire si j'ai perdu accès à mon courriel ou téléphone ?

Contactez le **support** (voir section 9). Une vérification de votre identité sera nécessaire avant de désactiver la 2FA sur votre compte.

---

## 8. Problèmes courants et solutions

### Problème : "Le code que j'entre est toujours invalide"

**Solutions possibles :**

1. **Vérifiez que vous tapez le BON code** (le plus récent)
   - Si vous avez reçu plusieurs codes, **seul le dernier** est valide
   - Les anciens codes sont automatiquement annulés

2. **Vérifiez l'heure**
   - Si plus de **5 minutes** se sont écoulées, le code est expiré
   - Recommencez la connexion pour avoir un nouveau code

3. **Vérifiez le nombre de chiffres**
   - Le code doit être de **6 chiffres exactement**
   - Pas d'espaces, pas de tirets

---

### Problème : "Je ne reçois pas le SMS"

**Solutions possibles :**

1. **Vérifiez que votre numéro est correct** dans votre profil
2. **Vérifiez votre signal cellulaire**
3. **Vérifiez que votre téléphone n'est pas en mode avion**
4. **Vérifiez vos messages bloqués** (certains téléphones filtrent les expéditeurs inconnus)
5. **Attendez 1-2 minutes** (envois parfois retardés)

Si rien ne fonctionne après plusieurs essais, **changez pour la méthode EMAIL** dans votre profil.

---

### Problème : "Je ne reçois pas le courriel"

**Solutions possibles :**

1. **Vérifiez le dossier spam/courriers indésirables**
2. **Vérifiez que l'adresse courriel dans votre profil est correcte**
3. **Vérifiez que votre boîte n'est pas pleine**
4. **Ajoutez `noreply@monpetituber.app`** à vos contacts
5. **Patientez 2-3 minutes** (les courriels peuvent être retardés)

---

### Problème : "Mon numéro de téléphone n'est pas accepté"

L'application n'accepte que les **numéros canadiens valides**.

**Vérifiez :**
- Le numéro a **10 chiffres** (sans le +1)
- L'**indicatif régional** est canadien : 514, 438, 450, 418, 581, 819, 873, 416, 647, 905, 289, 343, 613, 705, 226, 519, 548, 249, 365, 437, 367, 204, 431, 306, 639, 403, 587, 825, 780, 368, 604, 778, 236, 250, 672, 902, 782, 506, 709, 879, 867, etc.
- Le numéro ne contient pas de **chiffres répétés** (ex: `1111111111`)
- Le numéro ne suit pas une **séquence** (ex: `1234567890`)

**Exemple de numéro valide :** `514-123-4567`

---

## 9. Besoin d'aide ?

Si vous rencontrez un problème qui n'est pas résolu dans ce guide :

**Courriel :** support@monpetituber.app
**Site web :** https://www.monpetituber.app
**Chat en direct :** Disponible dans l'application (bouton en bas à droite)

---

## Quelques conseils de sécurité

### À faire

- **Activez la 2FA** sur tous vos comptes importants (Mon Petit Uber, Google, banque, etc.)
- **Gardez votre téléphone à portée** quand vous vous connectez
- **Mettez à jour vos coordonnées** si elles changent (numéro, courriel)
- **Utilisez un mot de passe fort et unique** pour chaque site

### ❌ À ne pas faire

- ❌ **Ne partagez JAMAIS votre code à 6 chiffres** avec qui que ce soit
- ❌ **Ne donnez JAMAIS votre code par téléphone**, même si on prétend être de Mon Petit Uber
  > **Important :** Nous ne vous demanderons JAMAIS votre code par téléphone ou par courriel.
- ❌ **Ne notez pas votre mot de passe** sur un papier visible
- ❌ **Ne désactivez pas la 2FA** par confort (la sécurité vaut quelques secondes de plus)

---

## Récapitulatif rapide

| Action | Comment ? |
|---|---|
| **Activer la 2FA** | Profil → Sécurité → Choisir EMAIL ou SMS → Activer |
| **Se connecter avec 2FA** | Email + mot de passe → Entrer le code reçu |
| **Changer de méthode** | Profil → Désactiver → Réactiver avec nouvelle méthode |
| **Désactiver la 2FA** | Profil → Sécurité → Bouton "Désactiver" |
| **Problème de réception** | Vérifier spam (email) ou signal (SMS) |
| **Code expiré** | Recommencer la connexion |

---

## À propos de ce guide

**Version :** 1.0  
**Dernière mise à jour :** Mai 2026  
**Application :** Mon Petit Uber  
**Fonctionnalité :** Double authentification (2FA)

---

**Merci d'utiliser la double authentification pour sécuriser votre compte Mon Petit Uber !**

*Votre sécurité est notre priorité.* 
