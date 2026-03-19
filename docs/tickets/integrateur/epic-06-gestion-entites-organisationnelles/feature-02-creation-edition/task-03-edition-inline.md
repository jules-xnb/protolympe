# [6-2-3] Édition inline des champs dans le drawer

## Description

Permettre la modification en place des champs d'une entité directement depuis l'onglet "Champs" du drawer de détail.

## Détails fonctionnels

- Onglet "Champs" du drawer de détail affichant :
  - **Entité parente** : sélecteur avec recherche (combobox), permettant le reparentage
  - **Nom** : champ texte éditable
  - **Champs personnalisés** : un champ par définition active, avec le contrôle adapté au type :
    - Texte, texte long, nombre, date, case à cocher, sélection (combobox recherchable), sélection multiple, email, URL
  - Champs requis marqués d'un astérisque
- Sauvegarde automatique à la perte de focus (blur) de chaque champ
- Toast de confirmation après chaque sauvegarde
- Champs en erreur signalés visuellement

## Critères de done

- [ ] Tous les champs éditables en inline
- [ ] Reparentage fonctionnel via le sélecteur
- [ ] Sauvegarde automatique au blur
- [ ] Toast de confirmation
- [ ] Champs requis signalés

## Dépendances

- 6-2-2
