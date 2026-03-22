# Spec : Module Profiles (config MO pour affichage FO)

> Ce fichier décrit la configuration du **module Profiles** côté MO — c'est-à-dire comment l'intégrateur configure l'affichage et les permissions du module pour les utilisateurs FO.
>
> À ne pas confondre avec l'**enabler Profiles** ([page-7-profiles/](../page-7-profiles/index.md)) qui gère la création et configuration des profils (EOs, rôles, groupes).

## Contexte

Le module Profiles utilise les profils configurés dans l'enabler (page-7) et les expose côté FO. L'utilisateur final peut :

- Voir ses profils assignés
- Activer un profil (sélection du profil actif)
- Consulter les profils archivés

L'intégrateur configure via le module :

1. **Activer/désactiver** le module Profiles pour un client
2. **Configurer l'affichage** (quelles infos afficher sur les cartes profil)
3. **Définir les rôles** du module
4. **Configurer les permissions** par rôle

## Pages concernées

La configuration passe par la page générique de configuration de module :

- **Route** : `/dashboard/:clientId/modules/:moduleId`
- **Spec détaillée** : voir [collecte-de-valeur/06-module-config.md](collecte-de-valeur/06-module-config.md)

## Onglets disponibles pour le module Profiles

| Onglet | Disponible | Description |
|--------|:---:|-------------|
| **Affichage** | ✅ | Configurer ce qui s'affiche sur les cartes profil en FO |
| **Objets métiers** | ❌ | Pas de BO |
| **Workflows** | ❌ | Pas de workflows |
| **Rôles** | ✅ | Rôles spécifiques au module |
| **Permissions** | ✅ | Matrice permissions par rôle |

## Règles métier

- Le module Profiles ne peut être activé que si au moins un profil existe dans l'enabler (page-7)
- Un utilisateur FO ne voit que les profils qui lui sont assignés
- L'activation d'un profil met à jour le JWT (`activeProfileId`) et sauvegarde `last_active_profile_id` en BDD

## Endpoints API

Mêmes endpoints génériques que pour tous les modules (voir [06-module-config.md](collecte-de-valeur/06-module-config.md)).

## Comportements attendus

- **Loading** : skeleton sur les onglets, spinner sur les mutations
- **Erreurs** : toast d'erreur sur chaque mutation échouée
- **Permissions** : seul un intégrateur assigné au client peut configurer le module
