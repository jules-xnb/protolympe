# [3-2-1] Dialog d'ajout d'un intégrateur

## Référence Figma

- [home-intégrateurs](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=19-1203)

## Description

Implémenter le dialog de création d'un nouveau compte intégrateur, accessible depuis le bouton "Nouveau intégrateur".

## Détails fonctionnels

- Dialog modal avec :
  - Champ **Prénom** (obligatoire)
  - Champ **Nom** (obligatoire)
  - Champ **Email** (obligatoire)
  - Select **Rôle** avec deux options :
    - "Intégrateur Delta" (valeur par défaut)
    - "Admin Delta"
- Boutons : "Annuler" et "Créer le compte"
- État de soumission : bouton change en "Création..."
- À la création : un email d'invitation est envoyé à l'adresse renseignée
- Fermeture automatique et réinitialisation du formulaire après succès

## Critères de done

- [ ] Dialog s'ouvre depuis le bouton "Nouveau intégrateur"
- [ ] Tous les champs obligatoires validés
- [ ] Select de rôle avec les deux options
- [ ] Email d'invitation envoyé après création
- [ ] Nouvel intégrateur visible dans le tableau

## Dépendances

- task-01-affichage-tableau (feature-01)
