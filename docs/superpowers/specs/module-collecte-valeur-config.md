# Spec — Module `collecte_valeur` : Configuration MO

## Contexte

Le module collecte de valeur repose sur deux blocs du page builder : `survey_creator` (vue gestionnaire) et `survey_responses` (vue répondant). Ces blocs exposent respectivement 11 et 15 options de configuration. Tout migre dans les pages du module, en suivant le même pattern que le module `organisation`.

Le module `collecte_valeur` a : `hasBo: true`, `hasWorkflows: true`, `hasRoles: true`.

Pages de config visibles :
- Général
- Affichage
- Objets métiers
- Workflows
- Rôles
- Permissions

---

## Permissions du module

| Slug | Label | Source |
|------|-------|--------|
| `create_campaign` | Créer une campagne | catalogue existant |
| `edit_campaign` | Modifier une campagne | catalogue existant |
| `delete_campaign` | Supprimer une campagne | catalogue existant |
| `view_responses` | Voir les réponses | catalogue existant |
| `respond` | Répondre | catalogue existant |
| `validate_response` | Valider une réponse | catalogue existant |
| `reject_response` | Rejeter une réponse | catalogue existant |
| `export` | Exporter | catalogue existant |
| `import` | Importer | catalogue existant |
| `edit_form` | Modifier le formulaire | `survey_creator.allow_form_edit` |

---

## Page Général

Contenu standard :

- **Label** : nom affiché dans la navigation FO (text, requis)
- **Icône** : sélecteur d'icône Lucide (défaut : `ClipboardList`)
- **Actif** : toggle on/off du module
- **Description** : textarea optionnel

---

## Page Affichage

Liste de configurations d'affichage (`module_display_configs`), chacune assignée à des rôles du module.

### Liste des configurations

| Colonne | Description |
|---------|-------------|
| Nom | Nom de la configuration |
| Rôles | Chips des rôles associés |
| Actions | Modifier, Supprimer |

### Édition d'une configuration (`/modules/:moduleId/display/:configId`)

Le module collecte a deux contextes d'affichage (gestionnaire et répondant). Les onglets couvrent les deux.

#### Vue gestionnaire

Options d'affichage pour les utilisateurs qui gèrent les campagnes (ex-bloc `survey_creator`).

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `gestionnaire.show_all_surveys` | boolean | `true` | Afficher toutes les campagnes |
| `gestionnaire.show_my_surveys` | boolean | `true` | Afficher uniquement mes campagnes |
| `gestionnaire.group_by_status` | boolean | `false` | Regrouper les campagnes par statut |
| `gestionnaire.columns_visible` | string[] | toutes | Colonnes visibles dans le tableau |
| `gestionnaire.enable_validation_workflow` | boolean | `false` | Activer la validation multi-étapes |
| `gestionnaire.full_page` | boolean | `false` | Affichage pleine page |

#### Vue répondant

Options d'affichage pour les utilisateurs qui répondent aux questionnaires (ex-bloc `survey_responses`).

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `repondant.show_pending` | boolean | `true` | Afficher les réponses en attente |
| `repondant.show_submitted` | boolean | `false` | Afficher les réponses soumises |
| `repondant.show_validated` | boolean | `false` | Afficher les réponses validées |
| `repondant.show_rejected` | boolean | `true` | Afficher les réponses rejetées |
| `repondant.group_by_campaign` | boolean | `false` | Regrouper par campagne |
| `repondant.show_deadline` | boolean | `true` | Afficher la date limite |
| `repondant.show_progress` | boolean | `true` | Afficher la barre de progression |
| `repondant.allow_draft` | boolean | `true` | Permettre la sauvegarde en brouillon |
| `repondant.show_validation_queue` | boolean | `false` | Afficher la file de validation |
| `repondant.enable_history` | boolean | `false` | Séparer en onglets "En cours" / "Terminées" |
| `repondant.full_page` | boolean | `false` | Affichage pleine page |

---

## Page Objets métiers

Liste des BO liés au module (`module_bo_links`).

| Colonne | Description |
|---------|-------------|
| Nom | Nom du BO |
| Champs | Nombre de champs définis |
| Instances | Nombre d'instances |
| Actions | Délier |

- Bouton "Lier un objet métier" → sélecteur parmi les BO du client
- Clic sur un BO → navigation vers `/modules/:id/bo/:boId`

---

## Page Workflows

Liste des workflows du module (`module_workflows`).

| Colonne | Description |
|---------|-------------|
| Nom | Nom du workflow |
| Statut | Valide / Invalide (icône) |
| Nœuds | Nombre de nœuds |
| Actions | Modifier, Supprimer |

- Bouton "Créer un workflow"
- Clic → `/modules/:id/workflows/:wfId` (éditeur existant)

Les workflows liés remplacent la configuration `workflow_ids` des blocs.

---

## Page Rôles

Tableau CRUD des rôles du module (`module_roles`).

| Colonne | Description |
|---------|-------------|
| Nom | Nom du rôle |
| Slug | Identifiant technique (auto-généré) |
| Couleur | Pastille couleur |
| Description | Description optionnelle |
| Actions | Modifier, Supprimer |

---

## Page Permissions

Matrice croisée permissions × rôles (`PermissionsMatrix`).

- Lignes : les 10 permissions listées ci-dessus
- Colonnes : les rôles du module
- Cellules : `Switch` toggle

---

## Mapping blocs → module

### Bloc `survey_creator`

| Source bloc | Destination module |
|------------|-------------------|
| `workflow_ids` | Page **Workflows** (workflows liés au module) |
| `allow_form_edit` | Permission `edit_form` |
| `allow_import` | Permission `import` |
| `allow_export` | Permission `export` |
| `show_all_surveys` | Affichage → Vue gestionnaire |
| `show_my_surveys` | Affichage → Vue gestionnaire |
| `group_by_status` | Affichage → Vue gestionnaire |
| `columns_visible` | Affichage → Vue gestionnaire |
| `enable_validation_workflow` | Affichage → Vue gestionnaire |
| `full_page` | Affichage → Vue gestionnaire |

### Bloc `survey_responses`

| Source bloc | Destination module |
|------------|-------------------|
| `workflow_ids` | Page **Workflows** (workflows liés au module) |
| `enable_import` | Permission `import` |
| `enable_export` | Permission `export` |
| `show_pending` | Affichage → Vue répondant |
| `show_submitted` | Affichage → Vue répondant |
| `show_validated` | Affichage → Vue répondant |
| `show_rejected` | Affichage → Vue répondant |
| `group_by_campaign` | Affichage → Vue répondant |
| `show_deadline` | Affichage → Vue répondant |
| `show_progress` | Affichage → Vue répondant |
| `allow_draft` | Affichage → Vue répondant |
| `show_validation_queue` | Affichage → Vue répondant |
| `enable_history` | Affichage → Vue répondant |
| `full_page` | Affichage → Vue répondant |

---

## Impact sur le catalogue

```typescript
collecte_valeur: {
  slug: 'collecte_valeur',
  label: 'Collecte de valeur',
  icon: 'ClipboardList',
  description: 'Questionnaires et collecte de réponses',
  hasBo: true, hasWorkflows: true, hasRoles: true,
  permissions: [
    { slug: 'create_campaign', label: 'Créer une campagne' },
    { slug: 'edit_campaign', label: 'Modifier une campagne' },
    { slug: 'delete_campaign', label: 'Supprimer une campagne' },
    { slug: 'view_responses', label: 'Voir les réponses' },
    { slug: 'respond', label: 'Répondre' },
    { slug: 'validate_response', label: 'Valider une réponse' },
    { slug: 'reject_response', label: 'Rejeter une réponse' },
    { slug: 'export', label: 'Exporter' },
    { slug: 'import', label: 'Importer' },
    { slug: 'edit_form', label: 'Modifier le formulaire' },
  ],
},
```

---

## FO — Résolution

```typescript
// Vue gestionnaire (si permission create_campaign ou edit_campaign ou view_responses)
const creatorConfig: SurveyCreatorBlockConfig = {
  workflow_ids: moduleWorkflowIds,
  allow_form_edit: hasPermission('edit_form'),
  allow_import: hasPermission('import'),
  allow_export: hasPermission('export'),
  // Affichage
  show_all_surveys: displayConfig.gestionnaire?.show_all_surveys ?? true,
  show_my_surveys: displayConfig.gestionnaire?.show_my_surveys ?? true,
  group_by_status: displayConfig.gestionnaire?.group_by_status ?? false,
  columns_visible: displayConfig.gestionnaire?.columns_visible,
  enable_validation_workflow: displayConfig.gestionnaire?.enable_validation_workflow ?? false,
  full_page: displayConfig.gestionnaire?.full_page ?? false,
};

// Vue répondant (si permission respond)
const responsesConfig: SurveyResponsesBlockConfig = {
  workflow_ids: moduleWorkflowIds,
  enable_import: hasPermission('import'),
  enable_export: hasPermission('export'),
  // Affichage
  show_pending: displayConfig.repondant?.show_pending ?? true,
  show_submitted: displayConfig.repondant?.show_submitted ?? false,
  show_validated: displayConfig.repondant?.show_validated ?? false,
  show_rejected: displayConfig.repondant?.show_rejected ?? true,
  group_by_campaign: displayConfig.repondant?.group_by_campaign ?? false,
  show_deadline: displayConfig.repondant?.show_deadline ?? true,
  show_progress: displayConfig.repondant?.show_progress ?? true,
  allow_draft: displayConfig.repondant?.allow_draft ?? true,
  show_validation_queue: displayConfig.repondant?.show_validation_queue ?? false,
  enable_history: displayConfig.repondant?.enable_history ?? false,
  full_page: displayConfig.repondant?.full_page ?? false,
};
```

Les composants `SurveyCreatorView` et `SurveyResponsesView` existants continuent de fonctionner sans modification.
