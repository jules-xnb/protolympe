# [2-2-1] Formulaire de création d'un client

## Référence Figma

- [home-clients](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=3-4421)

## Description

Implémenter le dialog de création d'un nouveau client, accessible depuis le bouton "Nouveau client" sur la page de liste. Cette action est réservée à l'Admin Delta — un intégrateur ne peut pas créer de client.

## Détails fonctionnels

- Dialog modal avec :
  - Champ **Nom** (obligatoire, minimum 2 caractères)
  - Champ **Slug** (obligatoire, minimum 2 caractères, uniquement lettres minuscules, chiffres et tirets)
  - Le slug est **auto-généré** à partir du nom saisi (en temps réel) et reste modifiable manuellement ; s'il est modifié, le slug doit être **unique** (validation à la soumission)
- Boutons : "Annuler" et "Créer"
- État de soumission : bouton "Créer" désactivé et libellé change en "Enregistrement..."
- Fermeture automatique du dialog après création réussie

## Critères de done

- [ ] Dialog s'ouvre depuis le bouton "Nouveau client"
- [ ] Auto-génération du slug depuis le nom (sans accents, espaces remplacés par tirets)
- [ ] Validation des champs avec messages d'erreur
- [ ] Création enregistrée et dialog fermé en cas de succès
- [ ] Nouveau client visible dans le tableau après création

## Dépendances

- task-01-affichage-tableau (feature-01)
