# Refonte Collecte : Formulaires dans les Workflows

## Objectif

Déplacer la configuration des formulaires de collecte (champs, visibilité, étapes de validation) du bloc `survey_creator` du builder vers l'éditeur de workflows. Le bloc builder ne fait plus que référencer un workflow et configurer l'affichage.

## Architecture

**Approche** : Migration progressive. On étend l'éditeur de workflow existant (ReactFlow) pour porter la config formulaire par noeud. Le bloc survey_creator est simplifié en sélecteur de workflow + options d'affichage.

**Pas de rétrocompatibilité** : les anciens workflows, campagnes et configs inline sont supprimés.

## Modèle de données

### Modification : table `workflows`

Ajout de `bo_definition_id` (UUID, FK → business_object_definitions, nullable). Obligatoire pour le type `value_collection`.

### Tables existantes utilisées telles quelles

- **`node_fields`** : `node_id`, `field_definition_id`, `is_visible`, `is_editable`, `is_required_override`, `display_order`, `visibility_condition`, `settings` (JSONB pour : `allow_comment`, `show_previous_value`, `custom_label`, `section_id`)
- **`node_role_permissions`** : `node_id`, `role_id`, `can_view`, `can_edit`, `can_execute_transitions`
- **`workflow_nodes.config`** (JSONB) : stocke `sections: SectionConfig[]` pour le groupement des champs

### Aucune nouvelle table nécessaire

## Workflow Editor — Sélection du BO

### À la création (`WorkflowFormDialog`)

- Nouveau champ : sélecteur d'objet métier (dropdown des `bo_definitions` du client)
- Obligatoire pour le type `value_collection`

### Sur la page détail (`WorkflowDetailPage`)

- Affichage du BO sélectionné dans le header (badge avec nom + icône)
- Le BO est modifiable tant que le workflow n'est pas publié
- Le BO détermine les champs disponibles dans la config de chaque noeud

## Config formulaire par noeud

Quand on clique sur un noeud dans l'éditeur ReactFlow, le panneau latéral affiche :

1. **En haut** : nom du noeud, rôles valideurs/lecteurs (inchangé)
2. **Onglet "Formulaire"** (nouveau) :
   - Liste des champs du BO, chacun avec :
     - Toggle visibilité : `visible` / `readonly` / `hidden`
     - Checkbox `obligatoire`
     - Checkbox `commentaires autorisés`
     - Checkbox `afficher valeur N-1`
     - Label custom optionnel
   - Groupement par sections (drag & drop pour réorganiser)
   - Bouton **"+ Nouveau champ"** : mini-formulaire inline pour créer un `field_definition` (nom, type, options). Le champ est ajouté au BO et coché `visible` automatiquement.

### Sync

`useWorkflowEditorBridge` est étendu pour :
- Lire/écrire dans `node_fields` (config champ par noeud)
- Lire/écrire les sections dans `workflow_nodes.config.sections`
- Créer des `field_definitions` à la volée

## Simplification du bloc survey_creator

### Supprimé du bloc

- Config des campaign types (formulaire, champs, sections)
- Étapes de validation
- Rôles répondeurs
- Sélecteur de BO

### Conservé dans le bloc

- Sélecteur de workflow (dropdown des workflows publiés du client)
- Options d'affichage (colonnes visibles, regroupement, filtres de statut)

## Simplification du bloc survey_responses

- Pointe directement vers un workflow au lieu d'une vue source (`source_view_config_id` → `workflow_id`)
- Le reste (filtres de statut, options d'affichage, queue de validation) ne change pas

## Création de campagne

`useCreateCampaign` est adapté pour :
- Lire le workflow référencé au lieu de la config du bloc
- Le BO vient de `workflows.bo_definition_id`
- Les étapes, champs et rôles viennent des `workflow_nodes` + `node_fields` + `node_role_permissions`

## Nettoyage

- Supprimer tous les workflows et campagnes existants (migration SQL)
- Supprimer le code du `SurveyCreatorConfigPanel` (config inline des campaign types)
- Supprimer le `CampaignTypeFieldsEditor` et composants associés
