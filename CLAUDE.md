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

## Processus de développement

### Règle n°1 : PRD avant tout code

**Aucune ligne de code ne doit être écrite sans PRD validé.** Le processus est :

1. **Rédiger le PRD** de la feature/task (métier uniquement, pas de technique)
2. **Faire valider** le PRD par l'utilisateur
3. **Planifier** l'implémentation technique
4. **Implémenter** feature par feature, page par page
5. **Vérifier** avant de considérer comme terminé

### Approche incrémentale stricte

- Une page à la fois, une feature à la fois
- Chaque feature doit être **complète et testée** avant de passer à la suivante
- Jamais de migration ou refactoring en batch

### Niveau d'exigence

Ce projet est destiné à des **entreprises du CAC 40**. Le niveau d'exigence est maximal :

- **Sécurité** : OWASP top 10, validation systématique des entrées, RLS/autorisation rigoureuse
- **Qualité** : Pas de raccourcis, pas de TODO en production, pas de code mort
- **Robustesse** : Gestion d'erreurs explicite, pas de fail silencieux
- **Performance** : Requêtes optimisées, pas de N+1, pagination systématique

### Apprentissage continu

Chaque erreur rencontrée doit être documentée dans ce fichier (section "Erreurs connues") pour ne jamais la répéter. Le CLAUDE.md est enrichi au fil du projet.

## Erreurs connues

_(À remplir au fur et à mesure du projet)_


