# [6-1-4] Filtres dynamiques

## Description

Permettre à l'intégrateur de filtrer les entités par critères multiples basés sur les champs natifs et personnalisés, avec logique AND/OR.

## Détails fonctionnels

- Bouton "Filtrer" ouvrant un panneau de filtres
- Badge indiquant le nombre de filtres actifs
- Champs filtrables :
  - Champs natifs : nom, code, niveau, nom du parent
  - Champs personnalisés : tous les champs actifs, avec un contrôle adapté au type (texte, nombre, date, sélection…)
- Logique combinatoire : toggle AND / OR entre les filtres
- Chaque filtre se compose de : champ + opérateur + valeur
- Les filtres s'appliquent en temps réel sur les trois vues (liste, arborescence, canvas)
- Bouton de réinitialisation des filtres

## Critères de done

- [ ] Panneau de filtres avec champs natifs et personnalisés
- [ ] Contrôles adaptés au type de champ
- [ ] Toggle AND/OR fonctionnel
- [ ] Filtrage en temps réel sur les 3 vues
- [ ] Badge compteur de filtres actifs
- [ ] Réinitialisation des filtres

## Dépendances

- 6-1-1
