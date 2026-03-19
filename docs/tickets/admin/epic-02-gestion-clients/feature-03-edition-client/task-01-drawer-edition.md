# [2-3-1] Drawer d'édition d'un client

## Référence Figma

- [home-clients-drawer](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=87-2221)

## Description

Implémenter le panneau latéral (drawer) d'édition d'un client, accessible depuis le bouton "Modifier" sur chaque ligne du tableau. Les modifications sont sauvegardées automatiquement.

## Détails fonctionnels

- Panneau latéral s'ouvrant depuis la droite, avec :
  - En-tête : icône entreprise + nom du client + slug
  - Champ **Nom** (modifiable)
  - Champ **Slug** (modifiable, avec même contraintes de format que la création)
  - **Auto-save** : les modifications sont enregistrées automatiquement 1,5 secondes après la dernière frappe
  - Pas de bouton "Enregistrer" explicite
- Section "Intégrateurs" (voir task-02)
- Bouton "Archiver ce client" en bas du panneau (voir feature-04)

## Critères de done

- [ ] Drawer s'ouvre depuis le bouton "Modifier"
- [ ] Champs pré-remplis avec les données du client
- [ ] Auto-save fonctionnel (debounce 1,5s)
- [ ] Validation des champs avant sauvegarde
- [ ] Modifications reflétées dans le tableau après sauvegarde

## Dépendances

- task-01-affichage-tableau (feature-01)
