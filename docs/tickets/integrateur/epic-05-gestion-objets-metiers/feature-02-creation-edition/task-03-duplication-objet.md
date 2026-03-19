# [5-2-3] Duplication d'un objet métier

## Description

Permettre à l'intégrateur de dupliquer un objet métier existant, en copiant l'intégralité de sa structure de champs.

## Détails fonctionnels

- Accessible depuis le menu déroulant (⋮) de la page de détail → "Dupliquer"
- Le dialog s'ouvre pré-rempli avec le nom suffixé " (copie)"
- La duplication crée :
  - Un nouvel objet métier avec les mêmes propriétés (nom, description)
  - Une copie de chaque champ personnalisé avec ses attributs (type, requis, lecture seule, référentiel, formule…)
  - Les liens parent_field_id sont recalculés pour pointer vers les nouveaux IDs
- Les instances ne sont pas copiées, seule la structure l'est

## Critères de done

- [ ] Accès via le menu déroulant de la page de détail
- [ ] Nom pré-rempli avec " (copie)"
- [ ] Tous les champs personnalisés dupliqués avec leurs attributs
- [ ] Relations parent_field_id correctement recalculées
- [ ] Aucune instance copiée

## Dépendances

- 5-2-1
- 5-4-1
