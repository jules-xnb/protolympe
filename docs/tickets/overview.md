# Olympe - Vue d'ensemble fonctionnelle

## Produit

Olympe est une plateforme SaaS multi-tenant de gestion des risques développée par Delta RM. Chaque client (entreprises CAC40) dispose d'un espace isolé dans lequel un intégrateur configure la structure organisationnelle, les référentiels et les processus de collecte. Les utilisateurs finaux interagissent ensuite avec des questionnaires, formulaires et tableaux de bord dynamiques.

## Personas

| Persona | Accès | Rôle |
|---------|-------|------|
| **Admin Delta RM** | Plateforme entière | Gère les clients et les comptes intégrateurs |
| **Intégrateur** | Espace(s) client assigné(s) | Configure la structure : entités, rôles, référentiels, objets métier, workflows, modules, utilisateurs |
| **Utilisateur Final (UF)** | Espace client | Répond aux campagnes, remplit les formulaires, consulte les vues dynamiques |

## Architecture multi-tenant

```
Plateforme Delta RM
└── Client (1 par organisation)
    ├── Intégrateur(s) → Configuration
    │   ├── Entités organisationnelles (hiérarchie)
    │   ├── Rôles & catégories (RBAC)
    │   ├── Référentiels (listes de valeurs)
    │   ├── Objets métier (définitions + instances)
    │   ├── Modules & navigation (arbre configurable)
    │   ├── Workflows (collecte & validation)
    │   └── Utilisateurs & champs personnalisés
    │
    └── Utilisateur(s) final(s) → Opérationnel
        ├── Questionnaires & campagnes
        ├── Formulaires de workflow
        └── Vues dynamiques (dashboard, liste, détail, formulaire, page)
```

## Glossaire

| Terme | Définition |
|-------|-----------|
| **EO** | Entité Organisationnelle — noeud dans la hiérarchie d'un client (direction, département, filiale...) |
| **Référentiel** | Liste de valeurs réutilisable (ex: niveaux de risque, pays, statuts) avec support hiérarchique |
| **Objet métier (BO)** | Structure de données configurable attachée aux EO (ex: un risque, un contrôle, un plan d'action) |
| **Workflow** | Processus de collecte multi-étapes avec nodes START → VALIDATION → END |
| **Campagne** | Instance de lancement d'un questionnaire auprès d'un ensemble d'EO |
| **Vue dynamique** | Interface configurable : dashboard, liste, détail, formulaire ou page libre |
| **Module** | Noeud dans l'arbre de navigation, avec permissions par rôle |
| **Champ personnalisé** | Attribut configurable sur les EO ou les utilisateurs (texte, date, select, nombre...) |
| **Catégorie de rôle** | Regroupement de rôles de même nature (ex: métier, géographique) |

## Carte des épics

### Admin (plateforme)

| Epic | Titre | Statut tickets |
|------|-------|---------------|
| 1-0-0 | Authentification | Documenté |
| 2-0-0 | Gestion des clients | Documenté |
| 3-0-0 | Gestion des intégrateurs | Documenté |
| 4-0-0 | Paramètres | Documenté |

### Intégrateur (espace client)

| Epic | Titre | Statut tickets |
|------|-------|---------------|
| 5-0-0 | Gestion des objets métiers | Documenté |
| 6-0-0 | Gestion des rôles | Documenté |
| 7-0-0 | Gestion des référentiels | Documenté |
| 8-0-0 | Gestion des entités | Documenté |

### A documenter

Les épics suivants correspondent à des fonctionnalités implémentées dans le prototype mais pas encore documentées en tickets.

## Flux transversaux

### Import CSV

Mécanisme commun à : utilisateurs, entités, rôles, référentiels, objets métier. Chaque import suit le même wizard : upload → mapping des colonnes → prévisualisation avec validation → import avec rapport d'erreurs.

### Permissions

Les permissions se calculent par intersection rôle × module × vue. Un utilisateur voit un module si au moins un de ses rôles a accès. Les permissions de vue (read/write/admin) sont héritées du module parent sauf override explicite.

### Champs personnalisés

Pattern réutilisé sur les EO et les utilisateurs : définition de champs (type, validation, visibilité par rôle), valeurs stockées séparément, règles de validation croisée entre champs.
