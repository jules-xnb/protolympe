# Spec : Module Organisation (config MO pour affichage FO)

> Ce fichier décrit la configuration du **module Organisation** côté MO — c'est-à-dire comment l'intégrateur configure l'affichage et les permissions du module pour les utilisateurs FO.
>
> À ne pas confondre avec l'**enabler Organisation** ([page-4-organisation/](../page-4-organisation/index.md)) qui gère la configuration de base des entités, champs, groupes, imports.

## Contexte

Le module Organisation utilise les entités configurées dans l'enabler (page-4) et les expose côté FO via le système de modules. L'intégrateur peut :

1. **Activer/désactiver** le module pour un client
2. **Configurer l'affichage** (quelles colonnes, quels filtres, quelles vues)
3. **Définir les rôles** du module (ex: Lecteur, Gestionnaire)
4. **Configurer les permissions** par rôle (lecture, écriture, export, etc.)
5. **Construire les pages FO** via le Page Builder (blocs `eo_card`)

## Pages concernées

La configuration du module Organisation passe par la page générique de configuration de module :

- **Route** : `/dashboard/:clientId/modules/:moduleId`
- **Spec détaillée** : voir [collecte-de-valeur/06-module-config.md](collecte-de-valeur/06-module-config.md) — la page de config est la même pour tous les modules

## Onglets disponibles pour le module Organisation

| Onglet | Disponible | Description |
|--------|:---:|-------------|
| **Affichage** | ✅ | Configurer les display configs (colonnes EO, filtres, pré-filtres, vues) |
| **Objets métiers** | ❌ | Pas de BO dans le module Organisation |
| **Workflows** | ❌ | Pas de workflows dans le module Organisation |
| **Rôles** | ✅ | Définir les rôles spécifiques au module (ex: Lecteur EO, Gestionnaire EO) |
| **Permissions** | ✅ | Matrice permissions par rôle (lecture, écriture, export, import, archivage) |

## Blocs Page Builder spécifiques

Le module Organisation utilise le bloc `eo_card` dans le Page Builder :

### Bloc `eo_card` — Fiche entité

Configuration inline du bloc :

```
┌─ EoCardInlineOptions ──────────────────────────────────────────┐
│                                                                 │
│  Modes de vue                                                  │
│  ☑ Liste    ☑ Arbre    ☐ Canvas                               │
│  Vue par défaut : [Liste ▾]                                    │
│                                                                 │
│  Fonctionnalités                                               │
│  ☑ Recherche           ☑ Filtres                               │
│  ☑ Export CSV           ☑ Import CSV                            │
│  ☑ Création d'entité    ☑ Archivage                             │
│  ☐ Configuration colonnes par l'utilisateur                    │
│                                                                 │
│  Personnalisation                                              │
│  ☑ Afficher le code technique                                  │
│  ☑ Afficher le niveau hiérarchique                             │
│  ☐ Afficher les champs personnalisés inline                    │
│                                                                 │
│  [Configuration avancée →]                                     │
│  (ouvre la page ModuleDisplayConfigEditPage)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration avancée (Display Config Edit)

Quand l'intégrateur clique sur "Configuration avancée", il accède à la page de config display détaillée :

- **Route** : `/dashboard/:clientId/modules/:moduleId/display/:configId`
- **Spec** : voir [collecte-de-valeur/06-module-config.md](collecte-de-valeur/06-module-config.md) section "ModuleDisplayConfigEditPage"

### Spécificités Organisation dans la config display

| Section | Configuration |
|---------|--------------|
| **Colonnes liste** | Champs EO (natifs + custom) à afficher en colonnes, ordre par DnD |
| **Colonnes drawer** | Sections et champs visibles dans le drawer de détail EO |
| **Filtres** | Champs EO filtrables (texte, select, date, etc.) |
| **Pré-filtres** | Filtres appliqués automatiquement (ex: filtre par niveau, par statut actif) |
| **Visibilité champs EO** | Quels champs custom sont visibles/éditables selon le rôle |

## Règles métier

- Le module Organisation ne peut être activé que si au moins une entité existe dans l'enabler (page-4)
- Les rôles du module Organisation sont assignés aux profils utilisateurs
- Un utilisateur FO ne voit que les entités autorisées par son profil actif (périmètre EO)
- Les permissions du module déterminent ce que l'utilisateur peut faire (voir, éditer, créer, archiver, importer, exporter)

## Endpoints API

Les endpoints sont les mêmes que pour tous les modules :

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/modules/:moduleId` | Config du module |
| GET | `/api/modules/:moduleId/roles` | Rôles du module |
| POST | `/api/modules/:moduleId/roles` | Créer un rôle |
| GET | `/api/modules/:moduleId/permissions` | Matrice permissions |
| PUT | `/api/modules/:moduleId/permissions` | Sauvegarder permissions |
| GET | `/api/modules/:moduleId/display-configs` | Configs d'affichage |
| POST | `/api/modules/:moduleId/display-configs` | Créer une config |
| GET | `/api/modules/:moduleId/display-configs/:id` | Détail config |
| PATCH | `/api/modules/:moduleId/display-configs/:id` | Modifier config |

## Comportements attendus

- **Loading** : skeleton sur les onglets, spinner sur les mutations
- **Erreurs** : toast d'erreur sur chaque mutation échouée
- **Permissions** : seul un intégrateur assigné au client peut configurer le module
