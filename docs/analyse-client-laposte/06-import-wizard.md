# Import CSV en masse (wizard)

**Statut : ✅ Couvert**
**Réf. client : US-Orga-030**

## Exigence client

Import en masse du référentiel organisations avec :
- Import des champs obligatoires
- Journal des rejets (ligne / raison)
- Export de contrôle post-chargement avec codes, statuts, pays, parents, anomalies

## Couverture actuelle

Le wizard 4 étapes est prévu dans [7-4-2] :
1. Upload CSV (glisser-déposer ou sélection) + template téléchargeable
2. Mapping des colonnes avec auto-détection
3. Aperçu en arbre/liste avec détection d'erreurs (références circulaires, parents manquants, champs obligatoires manquants)
4. Import avec progress bar temps réel, respect de la hiérarchie (parents d'abord)

## Manques

- **Journal des rejets** : l'aperçu en étape 3 montre les erreurs, mais il n'y a pas de fichier téléchargeable listant les lignes rejetées avec la raison. À ajouter.
- **Export de contrôle post-import** : après un import réussi, proposer un CSV de contrôle listant toutes les entités importées avec codes, statuts, parents et anomalies éventuelles. C'est une exigence explicite du client (itérations de fiabilisation). Voir aussi [16-export-controle-post-import.md].
- **Génération du code invariant à l'import** : si le fichier ne contient pas de code invariant, Delta doit en générer un automatiquement. À préciser dans le comportement du wizard.




