# Guidelines Delta RM

## PRD - Règles de rédaction

- **Pas de modèle de données** : Les PRD doivent rester purement métier/fonctionnel. Ne jamais inclure de schémas techniques, tables, colonnes ou relations de base de données.

## Nomenclature des tickets

Format : `{E}-{F}-{T}` (séparés par des tirets)

- **EPIC** : `{E}-0-0` — ex. `1-0-0` = Epic 1
- **FEATURE** : `{E}-{F}-0` — ex. `2-1-0` = Epic 2 / Feature 1
- **TASK** : `{E}-{F}-{T}` — ex. `2-1-3` = Epic 2 / Feature 1 / Task 3

## Structure des tickets

Un doc par ticket. L'arborescence des dossiers porte la hiérarchie EPIC > FEATURE > TASK.

**EPIC**
- Titre
- Description

**FEATURE**
- Titre
- Description

**TASK**
- Titre
- Référence Figma
- Description
- Détails fonctionnels
- Critères de done
- Dépendances

## Raccourcis de contexte vue

Préfixes utilisés dans les instructions pour indiquer la vue concernée :

- **`a `** → vue **Admin**
- **`i `** → vue **Intégrateur**
- **`uf `** → vue **User Final**

Exemple : "i-navbar" = la navbar dans la vue intégrateur.

## Conventions UI

- **Icônes dans les boutons** : toujours placer les icônes à **droite** du texte (ex : `<Button>Enregistrer <Save className="h-4 w-4" /></Button>`).


