# [5-3-2] Tableau des instances

## Description

Afficher les instances d'un objet métier dans un DataTable avec colonnes dynamiques, pagination côté serveur et formatage des valeurs.

## Détails fonctionnels

- DataTable paginé côté serveur (50 éléments par page par défaut)
- Colonnes fixes :
  - **Identifiant** : numéro de référence de l'instance
  - **Entité** : nom de l'EO rattachée
  - **Statut** : statut dynamique 
  - **Créé le** : date de création
- Colonnes contextuelles (apparaissent automatiquement selon l'utilisation du BO) :
  - Ces colonnes ne font pas partie de la structure de l'objet métier ; elles apparaissent quand le BO est utilisé dans un contexte qui apporte ses propres informations
  - Aujourd'hui, le seul contexte est la **collecte de valeur** (campagnes) :
    - **Campagne type** : type de campagne (affiché uniquement si au moins une instance en a un)
    - **Campagne** : nom de la campagne (affiché uniquement si au moins une instance en a une)
  - Demain, d'autres contextes d'utilisation du BO pourront faire apparaître automatiquement de nouvelles colonnes selon le même principe
  - Règle d'affichage : une colonne contextuelle n'est visible que si au moins une instance a une valeur pour cette colonne
- Colonnes dynamiques : une colonne par champ personnalisé visible
- Colonnes agrégation : les champs de type "agrégation" affichent la valeur d'un champ provenant de l'entité référencée (EO, utilisateur, autre BO). La valeur est résolue dynamiquement, pas stockée dans l'objet métier.
- Formatage des valeurs selon le type :
  - Date/datetime : format français
  - Checkbox : "Oui" / "Non"
  - Select : résolution du label depuis le référentiel
  - Multiselect : labels joints par virgule
  - Agrégation : affichage de la valeur source (lecture seule dans le tableau)
- État vide si aucune instance

## Critères de done

- [ ] Pagination côté serveur fonctionnelle
- [ ] Colonnes fixes affichées correctement
- [ ] Colonnes dynamiques générées depuis les champs personnalisés
- [ ] Formatage correct de chaque type de valeur
- [ ] Colonnes contextuelles (campagne type/nom) masquées si non pertinentes

## Dépendances

- 5-3-1
- 5-4-1
