# Tags de collecte avec validation Admin

**Statut : ❌ Manquant**
**Réf. client : ORG-CO-104, US-Orga-106**

## Exigence client

Des attributs de "tagging" spécifiques aux collectes 2027 (ex. niveau, groupe, zone LPS, racine CP) peuvent être proposés par le Gestionnaire (PER-002) sur une entité, soumis à validation par l'Admin avant application effective.

- Sélection multi-tags selon le paramétrage en vigueur
- Demandes visibles dans l'historique de l'entité
- Approbation / Rejet par Admin avec commentaire

## Couverture actuelle

Le système de champs personnalisés permet de créer des champs de type liste déroulante. Mais la valeur est directement enregistrée — aucun circuit de validation.

## Manques

1. **Champs "supervisés"** : un type de champ spécial où la valeur proposée par PER-002 n'est pas immédiatement appliquée mais entre dans un workflow d'approbation
2. **Workflow identique à US-Orga-102** : même mécanique Soumise → Approuvée / Rejetée (voir [14-workflows-correction.md])
3. **Affichage de la valeur en attente** : la fiche entité montre la valeur actuelle + la valeur proposée en attente avec un badge "En attente de validation"

## Proposition

Ce besoin peut être couvert par l'extension du module "Demandes" de [14-workflows-correction.md] avec un type de demande "Proposition de tag". Les tags paramétrables (niveau, groupe, zone...) seraient des référentiels administrables par l'Admin (via le système de référentiels existant). La demande référencerait l'entité, le tag proposé et sa valeur.

Note : ce besoin est qualifié d'"ouvert" dans le document client ("à cadrer") et peut être traité dans une phase 2.
