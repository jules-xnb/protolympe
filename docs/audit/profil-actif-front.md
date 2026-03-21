# Changement front — Profil actif (switch profil)

## Contexte
Le modèle d'accès a changé : un `client_user` n'a plus l'union de tous ses profils. Il doit **sélectionner un profil actif** pour accéder au FO. Ses droits sont uniquement ceux du profil sélectionné.

## Changements à implémenter côté front

### 1. Page de sélection de profil
- Après le login, vérifier si `activeProfileId` est présent dans le JWT (décoder le token)
- Si **présent** (1 seul profil) → aller directement au FO, pas de page de sélection
- Si **absent** (plusieurs profils) → afficher la page de sélection
- Appeler `GET /auth/me/profiles` pour lister les profils disponibles
- Afficher les profils avec leurs EOs, groupes et rôles
- Au clic sur "Activer" → appeler `POST /auth/select-profile` avec `{profile_id}`
- Stocker le nouveau `access_token` retourné (il contient `activeProfileId`)

### 2. JWT et stockage
- L'ancien token (sans `activeProfileId`) ne donne accès à rien d'autre que `/auth/me/profiles` et `/auth/select-profile`
- Le nouveau token (avec `activeProfileId`) donne accès au FO
- Stocker l'access token en mémoire (pas localStorage — il change à chaque sélection de profil)

### 3. Switch de profil
- Dans le sidebar FO, un bouton "Changer de profil" qui ramène à la page de sélection
- L'ancien token est remplacé par le nouveau après sélection

### 4. Suppression du cumul de profils
- L'ancien code faisait probablement l'union de tous les profils pour calculer les droits côté front
- Maintenant : les droits sont calculés par le backend en fonction du `activeProfileId` dans le JWT
- Le front n'a plus besoin de calculer le périmètre EO — il reçoit directement les données filtrées

### 5. Impact sur les appels API
- Tous les appels API existants continuent de fonctionner sans changement
- Le backend lit `activeProfileId` depuis le JWT automatiquement
- Si un `client_user` appelle une API sans profil actif, les données seront vides (pas d'erreur, juste pas de résultats)
