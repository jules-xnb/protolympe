# Toggle masquage des entités fermées

**Statut : ⚠️ Partiel**
**Réf. client : ORG-CO-007, US-Orga-003, US-Orga-201**

## Exigence client

- À l'affichage, les entités fermées sont **masquées par défaut**
- Un toggle "Afficher les entités fermées" permet de les rendre visibles
- Le comptage total indique la présence d'éléments masqués (ex. "42 entités ouvertes (+ 8 fermées)")
- Le choix est **mémorisé dans la session**

## Couverture actuelle

Aucun toggle de ce type n'existe pour les entités. Le système de référentiels a un mécanisme similaire (page archives séparée), mais pour les entités, il n'y a pas de distinction visuelle ni de toggle documenté dans [7-1-1].

## Manques

1. **Toggle dans la barre d'actions** de la page principale, activé par défaut (masquer fermées)
2. **Compteur différencié** : "X entité(s) ouverte(s) (+ Y fermée(s))" quand le toggle est OFF
3. **Persistance en session** : mémoriser l'état du toggle dans `sessionStorage`
4. **Application cross-vues** : le toggle doit s'appliquer en vues Liste, Tree et Canvas

## Proposition

Ajouter un toggle switch dans la barre de la page principale (à côté du bouton Filtres). Il filtre le résultat en ajoutant/retirant la condition `statut = Ouvert` à la requête. Le compteur affiche les deux totaux pour informer l'utilisateur.
