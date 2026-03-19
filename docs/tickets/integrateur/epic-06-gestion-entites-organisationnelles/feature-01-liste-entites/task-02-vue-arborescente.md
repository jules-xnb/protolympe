# [6-1-2] Vue arborescente des entités

## Description

Afficher les entités dans une vue hiérarchique dépliable/repliable montrant les relations parent-enfant.

## Détails fonctionnels

- Arbre entièrement replié par défaut (seules les racines sont visibles)
- Boutons "Tout déplier" / "Tout replier" en haut de la vue
- Chaque nœud affiche :
  - Chevron de dépliage (droite si replié, bas si déplié)
  - Icône d'entité
  - Nom de l'entité
  - Badge avec le code
  - Nombre d'enfants entre parenthèses (si applicable)
  - Badge "Inactif" si l'entité est désactivée
- Indentation visuelle selon la profondeur (max 8 niveaux)
- Clic sur un nœud : ouverture du drawer de détail
- Sélection visuelle du nœud actif (surbrillance)
- La vue arborescente respecte les filtres actifs (les ancêtres des résultats filtrés sont inclus pour maintenir la hiérarchie)

## Critères de done

- [ ] Arbre replié par défaut
- [ ] Dépliage/repliage par nœud et global
- [ ] Informations correctes sur chaque nœud
- [ ] Indentation proportionnelle à la profondeur
- [ ] Clic ouvre le drawer de détail
- [ ] Filtres appliqués avec maintien de la hiérarchie

## Dépendances

- 6-1-1
