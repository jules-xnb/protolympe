# Design : Champs conditionnels dans le workflow form builder

**Date** : 2026-03-03

## Contexte

Dans la configuration des formulaires workflow (onglet formulaire), permettre de rendre des champs conditionnels : si certains champs d'une même section sont remplis d'une certaine manière, d'autres champs apparaissent (et peuvent être obligatoires ou non).

## Modèle de données

Stockage dans `node_fields.visibility_condition` (colonne JSON existante, actuellement `null` partout).

```json
{
  "conditions": [
    {
      "source_field_id": "field-definition-uuid",
      "operator": "equals",
      "value": "oui"
    }
  ],
  "logic": "AND"
}
```

- `source_field_id` : référence un `field_definition.id` (pas un `node_field.id`) — le même champ logique du BO.
- `operator` : `equals | not_equals | is_empty | is_not_empty | contains | greater_than | less_than | greater_or_equal | less_or_equal`
- `value` : valeur à comparer (omis pour `is_empty` / `is_not_empty`)
- `logic` : `AND` uniquement (toutes les conditions doivent être remplies)

Le type `FieldVisibilityCondition` existe déjà dans `src/components/builder/page-builder/types.ts`.

## Décisions

- **Scope des conditions** : même section uniquement. Un champ ne peut conditionner que des champs de sa propre section.
- **Obligatoire** : le `is_required_override` existant s'applique quand le champ est visible. Si les conditions ne sont pas remplies, le champ est masqué et n'est ni affiché ni requis.
- **Valeurs cachées** : si un champ caché avait une valeur, elle est conservée (pas effacée) au cas où les conditions redeviennent vraies.

## Admin — Form Builder (FormCanvas)

- Ajout d'un bouton icône (`GitBranch`) sur chaque ligne de champ dans la grille.
- Au clic → **dialog** pour configurer les conditions du champ.
- Le dialog affiche la liste des conditions, chacune avec :
  - **Champ source** : dropdown des autres champs de la même section.
  - **Opérateur** : adapté au type du champ source (checkbox → equals/not_equals, select → equals/not_equals/is_empty, number → toute la gamme).
  - **Valeur** : input adapté (dropdown des valeurs référentiel pour select, checkbox pour boolean, input texte/nombre sinon). Masqué pour `is_empty`/`is_not_empty`.
- Bouton "Ajouter une condition" / supprimer une condition.
- Badge numérique sur l'icône indiquant le nombre de conditions actives.
- Le `visibility_condition` est déjà inclus dans le save existant de `WorkflowFormBuilder`.

## Utilisateur — Formulaire full-page (SurveyResponseFullPage)

- Un `useMemo` évalue les conditions de chaque champ contre l'état `values` actuel.
- Les champs dont les conditions ne sont pas remplies sont filtrés du rendu.
- Quand l'utilisateur modifie un champ source, les champs dépendants apparaissent/disparaissent instantanément.

## Utilisateur — Grille inline (CampaignDetailPage)

- Les valeurs de chaque ligne (business object) sont accessibles au rendu de chaque cellule.
- Les cellules conditionnelles dont les conditions ne sont pas remplies affichent `"-"` en grisé (non éditables).
- Quand une cellule source est modifiée dans la grille, les cellules dépendantes de la même ligne se mettent à jour.

## Composants à créer / modifier

| Composant | Action |
|---|---|
| `VisibilityConditionDialog` (nouveau) | Dialog d'édition des conditions par champ |
| `evaluateVisibilityConditions` (nouveau, utilitaire) | Fonction pure évaluant les conditions contre des valeurs |
| `FormCanvas.tsx` | Ajouter bouton + badge conditions, ouvrir le dialog |
| `SurveyResponseFullPage.tsx` | Filtrer les champs visibles avec `evaluateVisibilityConditions` |
| `CampaignDetailPage.tsx` | Passer les valeurs de la ligne, griser les cellules non visibles |
| `InlineEditableCell.tsx` | Accepter une prop `isHiddenByCondition` pour afficher "-" grisé |
