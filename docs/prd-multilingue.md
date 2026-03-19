# PRD — Multilingue / Traductions

## Objectif

Permettre la personnalisation et la traduction complète de l'interface User Final (UF). Chaque texte visible — qu'il vienne de la configuration intégrateur ou de l'UI système — doit pouvoir être modifié et traduit par client. Aucune exception.

---

## Principes

1. **Tout est overridable** — même les textes "système" (boutons, statuts, erreurs) peuvent être personnalisés par client. Un client veut "Sauvegarder" au lieu de "Enregistrer" ? Il peut.
2. **Tout est traduisible** — chaque texte overridé ou par défaut peut être traduit dans toutes les langues actives du client
3. **Fallback en cascade** — override client/langue → override client/langue par défaut → valeur système par défaut
4. **Gestion centralisée** — l'intégrateur gère tout depuis un onglet "Traductions" unique, organisé par sections

---

## Architecture unifiée

### Plus de distinction statique/dynamique

Tout le texte passe par le **même mécanisme** :

```
Résolution d'un texte :
1. Override client + langue utilisateur    → "Sauvegarder" (ES pour Client X)
2. Override client + langue par défaut     → "Sauvegarder" (FR pour Client X)
3. Valeur système par défaut               → "Enregistrer" (FR défaut global)
4. Valeur source (colonne BDD originale)   → pour le texte intégrateur
```

Cela signifie :
- Les textes UI système (boutons, statuts...) ont des **valeurs par défaut** livrées avec l'app
- L'intégrateur peut **override** n'importe quelle valeur pour son client
- Chaque override peut être **traduit** dans les langues actives

---

## 1. Configuration des langues

### Modèle de données existant

La table `clients` possède déjà :
- `default_language` — langue source (ex: `fr`)
- `active_languages` — langues activées (ex: `['fr', 'en', 'es']`)

La table `profiles` possède déjà `preferred_language`.

### Interface intégrateur

Dans les **paramètres client** :
- Sélection de la langue par défaut
- Activation/désactivation des langues disponibles
- Langues supportées : FR, EN, ES, DE, IT, PT, AR, NL (extensible)

### Sélecteur de langue UF

Dans le header ou les paramètres du profil utilisateur :
- Affiche les langues actives du client
- Met à jour `profile.preferred_language`
- L'UI se rafraîchit immédiatement

---

## 2. Modèle de données

### Table `translations`

Table unique pour TOUTES les traductions (texte intégrateur ET texte UI système) :

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| client_id | uuid | FK vers clients |
| scope | text | `'ui'` (texte système) ou `'data'` (texte intégrateur BDD) |
| key | text | Clé unique du texte. Pour `ui` : `'buttons.save'`, `'status.validated'`. Pour `data` : `'{table}.{row_id}.{column}'` |
| language | text | Code langue (ex: `fr`, `en`, `es`) |
| value | text | Texte traduit/overridé |
| created_at | timestamp | |
| updated_at | timestamp | |

**Index unique** : `(client_id, scope, key, language)`

### Exemples de lignes

#### Texte UI système overridé par un client
| client_id | scope | key | language | value |
|-----------|-------|-----|----------|-------|
| client-abc | ui | buttons.save | fr | Sauvegarder |
| client-abc | ui | buttons.save | en | Save |
| client-abc | ui | status.validated | fr | Approuvé |
| client-abc | ui | status.validated | en | Approved |

#### Texte intégrateur traduit
| client_id | scope | key | language | value |
|-----------|-------|-----|----------|-------|
| client-abc | data | field_definitions.{uuid}.name | en | Hire date |
| client-abc | data | field_definitions.{uuid}.placeholder | en | Select the entry date |
| client-abc | data | workflow_nodes.{uuid}.name | en | Manager validation |
| client-abc | data | referential_values.{uuid}.label | en | Permanent contract |

**Note** : pour le scope `data`, la langue par défaut du client n'a PAS d'entrée — la valeur source reste dans la table d'origine. Seules les traductions vers d'autres langues sont stockées. Par contre, pour le scope `ui`, une entrée en langue par défaut = un override de la valeur système.

---

## 3. Valeurs système par défaut

### Fichier de référence

Créer `src/i18n/defaults.ts` contenant toutes les clés UI avec leur valeur FR par défaut :

```typescript
export const UI_DEFAULTS: Record<string, string> = {
  // Boutons
  'buttons.save': 'Enregistrer',
  'buttons.cancel': 'Annuler',
  'buttons.create': 'Créer',
  'buttons.delete': 'Supprimer',
  'buttons.edit': 'Modifier',
  'buttons.archive': 'Archiver',
  'buttons.restore': 'Restaurer',
  'buttons.submit': 'Soumettre',
  'buttons.validate': 'Valider',
  'buttons.reject': 'Rejeter',
  'buttons.close': 'Clôturer',
  'buttons.launch': 'Lancer',
  'buttons.add': 'Ajouter',
  'buttons.continue': 'Continuer',
  'buttons.update': 'Mettre à jour',
  'buttons.search': 'Rechercher',

  // Statuts
  'status.validated': 'Validé',
  'status.rejected': 'Rejeté',
  'status.pending': 'En attente',
  'status.in_progress': 'En cours',
  'status.submitted': 'Soumis',
  'status.draft': 'Brouillon',
  'status.closed': 'Clôturée',
  'status.paused': 'En pause',
  'status.active': 'Actif',
  'status.inactive': 'Inactif',

  // Booléens
  'boolean.yes': 'Oui',
  'boolean.no': 'Non',

  // Placeholders
  'placeholders.search': 'Rechercher...',
  'placeholders.select': 'Sélectionner...',
  'placeholders.select_entity': 'Sélectionner une entité...',
  'placeholders.your_answer': 'Votre réponse...',

  // Labels
  'labels.name': 'Nom',
  'labels.description': 'Description',
  'labels.date': 'Date',
  'labels.start_date': 'Date de début',
  'labels.end_date': 'Date de fin',
  'labels.email': 'Email',
  'labels.type': 'Type',
  'labels.status': 'Statut',
  'labels.reference': 'Référence',
  'labels.required': 'Obligatoire',
  'labels.created_at': 'Créé le',

  // Erreurs
  'errors.save': "Erreur lors de l'enregistrement",
  'errors.submit': 'Erreur lors de la soumission',
  'errors.required_field': 'Ce champ est obligatoire',
  'errors.min_length': 'Doit contenir au moins {min} caractères',
  'errors.unknown': 'Erreur inconnue',

  // États vides
  'empty.no_results': 'Aucun résultat',
  'empty.no_items': 'Aucun élément trouvé',
  'empty.no_surveys': 'Aucun questionnaire à compléter',
  'empty.no_campaigns': 'Aucune campagne en cours',
  'empty.no_entities': 'Aucune entité trouvée',

  // Toast succès
  'toast.created': 'Créé avec succès',
  'toast.updated': 'Mis à jour avec succès',
  'toast.deleted': 'Supprimé avec succès',
  'toast.submitted': 'Soumis avec succès',
  'toast.validated': 'Validé avec succès',
  'toast.saved': 'Brouillon enregistré',

  // Titres dialogs
  'dialogs.new_campaign': 'Nouvelle campagne',
  'dialogs.add_field': 'Ajouter un champ',
  'dialogs.confirm_delete': 'Confirmer la suppression',

  // Types de champs
  'field_types.text': 'Texte',
  'field_types.textarea': 'Texte long',
  'field_types.number': 'Nombre',
  'field_types.date': 'Date',
  'field_types.checkbox': 'Case à cocher',
  'field_types.select': 'Liste de choix',

  // Historique
  'history.create': 'Création',
  'history.update': 'Modification',
  'history.delete': 'Suppression',
  'history.restore': 'Restauration',

  // ... ~212 clés au total
};
```

Ce fichier sert de **référence et de fallback**. L'intégrateur voit ces valeurs par défaut dans l'onglet Traductions et peut les override.

---

## 4. Tables et colonnes traduisibles (scope `data`)

| Table | Colonnes traduisibles |
|-------|----------------------|
| `navigation_configs` | label, display_label |
| `view_configs` | name, description |
| `view_config_widgets` | title |
| `field_definitions` | name, description, placeholder |
| `eo_field_definitions` | name, description |
| `user_field_definitions` | name, description |
| `business_object_definitions` | name, description |
| `referentials` | name, description |
| `referential_values` | label, description |
| `workflows` | name, description |
| `workflow_nodes` | name, description |
| `workflow_transitions` | label |
| `surveys` | name, description |
| `survey_campaigns` | name |
| `organizational_entities` | name, description |
| `eo_groups` | name, description |
| `profile_templates` | name, description |
| `roles` | name, description |
| `role_categories` | name, description |
| `client_design_configs` | app_name |

**Total : 21 tables, ~45 colonnes**

---

## 5. Hook `useT` — API de traduction

### Pour le texte UI système

```typescript
const { t } = useT();

// Utilisation simple
<Button>{t('buttons.save')}</Button>
// → "Sauvegarder" (override client) ou "Enregistrer" (défaut système)

// Avec paramètres
<span>{t('errors.min_length', { min: 2 })}</span>
// → "Doit contenir au moins 2 caractères"
```

### Pour le texte intégrateur (BDD)

```typescript
const { td } = useT();

// Traduit une valeur BDD
<span>{td('field_definitions', field.id, 'name', field.name)}</span>
// → traduction si elle existe, sinon field.name (valeur source)

// Ou en batch
const translated = useTd('field_definitions', field.id, field);
<span>{translated.name}</span>
<span>{translated.description}</span>
```

### Résolution interne

```
t('buttons.save') :
  1. translations WHERE client_id=X, scope='ui', key='buttons.save', language=userLang
  2. translations WHERE client_id=X, scope='ui', key='buttons.save', language=clientDefaultLang
  3. UI_DEFAULTS['buttons.save'] → "Enregistrer"

td('field_definitions', uuid, 'name', 'Date d'embauche') :
  1. translations WHERE client_id=X, scope='data', key='field_definitions.{uuid}.name', language=userLang
  2. translations WHERE client_id=X, scope='data', key='field_definitions.{uuid}.name', language=clientDefaultLang
  3. 'Date d'embauche' (valeur source passée en argument)
```

---

## 6. TranslationProvider

### Chargement initial

Au login, charger en une seule requête toutes les traductions du client pour la langue de l'utilisateur :

```sql
SELECT key, value FROM translations
WHERE client_id = :clientId
  AND language = :userLang
```

Stocker dans un `Map<string, string>` en mémoire dans un contexte React.

### Invalidation

- Quand l'intégrateur modifie une traduction → invalidation du cache React Query
- Quand l'utilisateur change de langue → recharger les traductions

---

## 7. Onglet "Traductions" (vue intégrateur)

### Accès
Nouvel onglet dans la navigation intégrateur.

### Structure

**Deux sections principales** :

#### Section "Textes de l'interface"
Affiche toutes les clés UI système (`scope = 'ui'`) regroupées par catégorie :
- Boutons & actions
- Statuts
- Placeholders
- Labels
- Messages d'erreur
- États vides
- Messages toast
- Types de champs
- Historique

Pour chaque clé :
| Clé | Défaut système | FR (override) | EN | ES |
|-----|---------------|---------------|----|----|
| buttons.save | Enregistrer | Sauvegarder | Save | Guardar |
| status.validated | Validé | Approuvé | Approved | Aprobado |

- Si la cellule FR est vide → le défaut système s'applique (affiché en grisé)
- Si la cellule FR est remplie → c'est l'override du client

#### Section "Contenu métier"
Affiche le texte intégrateur (`scope = 'data'`) regroupé par module :
- Navigation
- Objets métiers (définitions + champs)
- Entités organisationnelles (champs EO, groupes)
- Workflows (étapes, transitions)
- Référentiels (noms + valeurs)
- Campagnes & questionnaires
- Profils & rôles

Pour chaque élément :
| Élément | Type | FR (source) | EN | ES |
|---------|------|-------------|----|----|
| Date d'embauche | Champ BO | Date d'embauche | Hire date | Fecha de contratación |
| Validation manager | Étape workflow | Validation manager | Manager validation | Validación del manager |
| CDI | Valeur référentiel | CDI | Permanent contract | Contrato indefinido |

### Fonctionnalités

- **Édition inline** — clic sur une cellule pour traduire/override
- **Indicateur de statut** — vert (traduit), grisé (défaut système), rouge (manquant pour une langue active)
- **Compteur de progression** — "142/180 traduits (79%)" par langue
- **Filtrage** — par section, par statut (traduit/non traduit/overridé), recherche texte
- **Export CSV** — pour traduction externe en masse
- **Import CSV** — upload des traductions, rapport d'erreurs

---

## 8. Import/Export des traductions

### Export CSV

Format :
```csv
scope,key,default,fr,en,es
ui,buttons.save,Enregistrer,Sauvegarder,Save,Guardar
ui,status.validated,Validé,Approuvé,Approved,Aprobado
data,field_definitions.{uuid}.name,,Date d'embauche,Hire date,Fecha de contratación
data,workflow_nodes.{uuid}.name,,Validation manager,Manager validation,Validación del manager
```

- Filtrable par section/module
- Colonne `default` = valeur système (pour `ui`) ou vide (pour `data`, la source est dans la colonne de la langue par défaut)

### Import CSV

- Upload du CSV rempli
- Validation : clés existantes, langues valides
- Rapport : X ajoutées, Y mises à jour, Z erreurs
- Les cellules vides = pas de changement (ne supprime pas)

---

## 9. Fichiers impactés

### Composants UF à modifier (~48 fichiers)

Remplacer toutes les chaînes hardcodées par `t('key')` :

| Fichier | Nb chaînes | Priorité |
|---------|-----------|----------|
| `SurveyResponseDialog.tsx` | ~20 | Haute |
| `NewCampaignDialog.tsx` | ~18 | Haute |
| `SurveyValidationDialog.tsx` | ~15 | Haute |
| `CampaignDetailsDrawer.tsx` | ~15 | Haute |
| `SurveyEditorPage.tsx` | ~14 | Haute |
| `response-status.ts` | ~12 | Haute |
| `eo-history-constants.ts` | ~20 | Haute |
| `EoCreateDialog.tsx` | ~8 | Moyenne |
| `CreateBusinessObjectDialog.tsx` | ~8 | Moyenne |
| `DynamicListView.tsx` | ~7 | Moyenne |
| + 38 autres fichiers | ~75 | Moyenne/Basse |

### Composants UF affichant du texte BDD

Remplacer `{field.name}` par `{td('table', field.id, 'name', field.name)}` :

- Tous les composants `Dynamic*View` (formulaires, listes, détails)
- Navigation sidebar (`SidebarNavItem`)
- Widgets dashboard
- Workflow steps et transitions
- Référentiel selects
- Champs EO

---

## Ordre d'implémentation

| # | Étape | Effort | Description |
|---|-------|--------|-------------|
| 1 | Table `translations` + RLS | 2h | Migration Supabase, policies, index |
| 2 | `UI_DEFAULTS` + fichier de clés | 3h | Inventaire exhaustif des ~212 clés système |
| 3 | `TranslationProvider` + hook `useT` | 4h | Contexte, chargement, cache, résolution |
| 4 | Extraction texte statique dans UF | 8h | Remplacer les chaînes dans 48 fichiers par `t()` |
| 5 | Adoption `td()` dans UF | 8h | Tous les composants affichant du texte BDD |
| 6 | Configuration langues client | 2h | UI paramètres intégrateur |
| 7 | Sélecteur de langue UF | 2h | Header/profil |
| 8 | Onglet Traductions — texte UI | 6h | Section "Textes de l'interface" avec édition inline |
| 9 | Onglet Traductions — contenu métier | 8h | Section "Contenu métier" par module |
| 10 | Import/Export CSV | 4h | Export, import, validation, rapport |

**Total estimé : ~47h**
