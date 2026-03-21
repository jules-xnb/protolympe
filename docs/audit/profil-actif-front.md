# Spec : Profil actif (switch profil) — Front

## Maquettes

Pas de maquette specifique (le mecanisme de profil actif impacte transversalement le login, la sidebar FO et les appels API).

---

## Regles metier

- Un `client_user` n'a plus l'union de tous ses profils. Il doit **selectionner un profil actif** pour acceder au FO.
- Ses droits sont uniquement ceux du profil selectionne (pas de cumul).
- Le profil actif est encode dans le JWT (`activeProfileId`).
- Le backend sauvegarde le dernier profil actif pour restauration automatique a la prochaine reconnexion.

---

## Endpoints API (existants)

| Methode | Route | Description | A corriger |
|---------|-------|-------------|------------|
| GET | `/auth/me/profiles` | Liste les profils disponibles pour l'utilisateur connecte | — |
| POST | `/auth/select-profile` | Selectionne un profil actif, retourne un nouveau JWT avec `activeProfileId` | — |

## Endpoints API (a creer)

Aucun endpoint supplementaire necessaire.

---

## A construire

### 1. Page de selection de profil
- Apres le login, verifier si `activeProfileId` est present dans le JWT (decoder le token)
- Si **present** (dernier profil restaure ou profil unique) -> aller directement au FO
- Si **absent** (premiere connexion avec plusieurs profils) -> afficher la page de selection
- Appeler `GET /auth/me/profiles` pour lister les profils disponibles
- Afficher les profils avec leurs EOs, groupes et roles
- Au clic sur "Activer" -> appeler `POST /auth/select-profile` avec `{profile_id}`
- Stocker le nouveau `access_token` retourne (il contient `activeProfileId`)

### 2. JWT et stockage
- L'ancien token (sans `activeProfileId`) ne donne acces a rien d'autre que `/auth/me/profiles` et `/auth/select-profile`
- Le nouveau token (avec `activeProfileId`) donne acces au FO
- Stocker l'access token en memoire (pas localStorage — il change a chaque selection de profil)

### 3. Switch de profil
- En bas a gauche du sidebar FO, un bouton "Changer de profil"
- Appelle `POST /auth/select-profile` avec le nouveau `{profile_id}`
- Le backend sauvegarde le choix (pour restauration automatique a la prochaine reconnexion)
- L'ancien token est remplace par le nouveau apres selection

### 4. Suppression du cumul de profils
- Les droits sont calcules par le backend en fonction du `activeProfileId` dans le JWT
- Le front n'a plus besoin de calculer le perimetre EO — il recoit directement les donnees filtrees

### 5. Impact sur les appels API
- Tous les appels API existants continuent de fonctionner sans changement
- Le backend lit `activeProfileId` depuis le JWT automatiquement
- Si un `client_user` appelle une API sans profil actif, les donnees seront vides (pas d'erreur, juste pas de resultats)

---

## Comportements attendus

### Loading states
- Spinner sur la page de selection de profil pendant le chargement de la liste des profils
- Spinner sur le bouton "Activer" pendant la selection d'un profil (appel API + echange de token)
- Spinner sur le bouton "Changer de profil" dans la sidebar pendant le switch

### Gestion d'erreurs
- Toast d'erreur si la selection de profil echoue (profil invalide, erreur serveur)
- Si le JWT expire pendant une session, rediriger vers le login
- Si le profil actif dans le JWT ne correspond plus a un profil valide (supprime entre-temps), rediriger vers la page de selection de profil

### Validation
- Verifier que `activeProfileId` est present dans le JWT avant d'autoriser l'acces au FO
- Si absent, bloquer la navigation et rediriger vers la page de selection (sauf pour `/auth/me/profiles` et `/auth/select-profile`)

### Permissions
- Sans profil actif : acces limite a la page de selection de profil uniquement
- Avec profil actif : acces au FO selon les permissions du profil selectionne
- Le switch de profil invalide l'ancien token et en genere un nouveau

---

## Points d'attention backend

- Le token JWT sans `activeProfileId` ne doit donner acces qu'aux endpoints de selection de profil (middleware de guard).
- La restauration automatique du dernier profil actif (`last_active_profile_id` dans `accounts`) est deja implementee cote backend.
- Le backend doit verifier que le profil selectionne appartient bien a l'utilisateur connecte.
