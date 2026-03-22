# Spec : Module Collecte de Valeur FO

## Perimetre

Ce dossier documente les specs de construction du module **Collecte de valeur** cote Front Office (vue utilisateur final).

Le module couvre le cycle de vie complet : creation de questionnaires, lancement de campagnes, saisie de reponses, validation par workflow, import/export CSV.

## Sous-pages

| # | Page | Route |
|---|------|-------|
| 1 | Module Page | `/dashboard/:clientId/user/modules/:moduleId` |
| 2 | Vues dynamiques | `/dashboard/:clientId/user/views/:viewSlug` |
| 3 | Editeur de survey | `/dashboard/:clientId/user/surveys/new` et `/surveys/:surveyId/edit` |
| 4 | Detail campagne | `/dashboard/:clientId/user/campaigns/:campaignId` |
| 4b | Import campagne | `/dashboard/:clientId/user/campaigns/:campaignId/import` |
| 5 | Workflow forms | `/dashboard/:clientId/user/workflow-forms/:workflowId` |

## Architecture generale

```
ModulePage (slug=collecte_valeur)
  |-- SurveyCreatorView (gestionnaire)
  |     |-- Table des types de collecte (workflows)
  |     |-- CampaignTypeDetailView (drill-down)
  |     |     |-- NewCampaignDialog (lancement campagne, wizard 4 etapes)
  |     |     +-- Navigation vers CampaignDetailPage
  |     +-- SurveyEditorPage (creation/edition survey)
  |
  +-- SurveyResponsesView (repondant)
        |-- Table des campagnes groupees par type
        +-- Navigation vers CampaignDetailPage

DynamicViewPage (Page Builder)
  +-- DynamicPageView
        |-- DataTableView (blocs data_table)
        |-- SurveyCreatorView (blocs survey_creator)
        |-- SurveyResponsesView (blocs survey_responses)
        |-- EoCardView, UsersBlockView, ProfilesBlockView
        +-- Sections, separateurs

CampaignDetailPage
  |-- Tableau inline-editable des reponses
  |-- Onglets dynamiques par etape workflow
  |-- SurveyResponseFullPage (detail reponse full-screen)
  |-- Export CSV multi-onglets
  +-- CampaignImportPage (wizard d'import CSV)

WorkflowFormsPage
  +-- WorkflowFormBuilder (configuration formulaires par etape)
```

## Fichiers de spec

- [01-module-page.md](01-module-page.md) — Page module + SurveyCreatorView + SurveyResponsesView
- [02-vues-dynamiques.md](02-vues-dynamiques.md) — DynamicViewPage + DynamicPageView + blocs
- [03-survey-editor.md](03-survey-editor.md) — Editeur de questionnaire
- [04-campagnes.md](04-campagnes.md) — Detail campagne + Import campagne
- [05-workflow-forms.md](05-workflow-forms.md) — Configuration formulaires workflow
