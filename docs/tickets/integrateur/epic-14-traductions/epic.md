# [14-0-0] Intégrateur - Traductions

## Description

Permettre à l'intégrateur de gérer les traductions et surcharges de textes de l'interface utilisateur final d'un client. La page affiche une **table de traductions groupée par catégorie** (17 catégories : boutons, statuts, placeholders, labels, erreurs, états vides, toasts, dialogues, types de champs, historique, campagnes, etc.) avec des **cellules éditables inline** pour chaque langue active du client (FR, EN, ES, DE, IT, PT, NL, AR). Des barres de progression par langue montrent l'avancement des traductions. L'intégrateur peut filtrer par statut (traduits, non traduits, surchargés) et rechercher par clé ou contenu. L'import/export CSV est disponible (batch upsert par 500, BOM UTF-8). Un onglet "Contenu métier" est prévu pour les traductions de données (noms d'entités, valeurs de référentiels) mais pas encore implémenté.
