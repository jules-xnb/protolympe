# Design — Fork de vue lors de l'édition par rôle

**Date** : 2026-02-25
**Contexte** : Complément au design de la vue centralisée des usages d'un rôle. Résout le problème de partage des options de bloc entre rôles.

---

## Problème

Une vue (view_config) contient des blocs dont les options de configuration (création, import, export, colonnes, etc.) sont globales. Quand plusieurs rôles ont accès à la même vue via nav_permissions, modifier une option pour un rôle impacte tous les autres rôles.

L'intégrateur doit pouvoir personnaliser les options d'un bloc pour un rôle spécifique sans impacter les autres.

## Solution

**Fork de vue avec confirmation** : quand l'intégrateur veut modifier les options d'un bloc sur une vue partagée par 2+ rôles, le système propose de créer une copie de la vue dédiée à ce rôle.

---

## Comportement

### Vue partagée (2+ rôles)

Quand la ligne est expandée et que la vue est partagée :
1. Un badge **"Partagée avec N rôles"** s'affiche en haut de la zone expandée
2. Les toggles et options sont **désactivés** (lecture seule)
3. Un bouton **"Personnaliser pour ce rôle"** est affiché

### Dialog de confirmation

```
┌─────────────────────────────────────────────────────┐
│  Personnaliser la vue pour ce rôle                   │
│                                                      │
│  Cette vue est actuellement partagée avec :           │
│  • Rôle B                                            │
│  • Rôle C                                            │
│                                                      │
│  Une copie de la vue sera créée avec les mêmes       │
│  options, dédiée au rôle "Rôle A".                   │
│  Les autres rôles ne seront pas impactés.            │
│                                                      │
│               [Annuler]  [Personnaliser]             │
└─────────────────────────────────────────────────────┘
```

### Opérations du fork

Sur confirmation :
1. **Copier** `view_config` → nouvelle `view_config` avec les mêmes `config` (blocs, options, etc.)
2. **Créer** un nouveau `navigation_config` :
   - `parent_id` = même parent que l'original
   - `label` = identique à l'original (nom affiché)
   - `slug` = slug original + " - " + nom du rôle (nom interne)
   - `view_config_id` = nouvelle view_config
   - Même `display_order` et autres propriétés
3. **Créer** une `nav_permission` pour le rôle sur le nouveau nav_config (is_visible = true)
4. **Supprimer** la `nav_permission` du rôle sur l'ancien nav_config
5. **Rafraîchir** la query `['role-usages']`

### Vue avec un seul rôle

Si un seul rôle a accès → pas de badge, pas de bouton, les options sont directement éditables. Comportement inchangé (auto-save immédiat).

---

## Nommage

| Champ | Valeur originale | Valeur du fork |
|---|---|---|
| `navigation_config.label` (affiché) | "Organigramme" | "Organigramme" |
| `navigation_config.slug` (interne) | "organigramme" | "organigramme - Rôle A" |
| `view_config.name` (si présent) | "Organigramme" | "Organigramme - Rôle A" |

L'utilisateur final ne voit aucune différence — le label affiché reste identique.

---

## Impact sur les composants existants

| Composant | Modification |
|---|---|
| `useRoleUsages` | Ajouter le nombre de rôles partageant chaque vue dans `RoleUsageItem` |
| `useUpdateBlockConfig` | Aucune modification (fonctionne déjà pour les vues avec un seul rôle) |
| `EoCardInlineOptions` | Ajouter la logique de verrouillage + badge + bouton "Personnaliser" |
| `RoleUsagesTable` | Passer le `roleId` aux composants d'options de bloc |
| Nouveau : `useForkViewForRole` | Hook de mutation pour l'opération de fork |
| Nouveau : `ForkViewConfirmDialog` | Dialog de confirmation |
