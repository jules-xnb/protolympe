# [2-1-3] Vue des clients archivés

## Référence Figma

- [home-clients-archive](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=89-4271)

## Description

Permettre à l'Admin Delta de consulter la liste des clients archivés et de les distinguer clairement des clients actifs via une bascule dans l'interface.

## Détails fonctionnels

- Dans la vue "Clients actifs" :
  - Si des clients archivés existent, afficher un bouton "Archivés (n)" avec le compte
  - Cliquer dessus bascule vers la vue archivés
- Dans la vue "Clients archivés" :
  - Titre de page change en "Clients archivés"
  - Description change en "Clients archivés pouvant être restaurés."
  - Bouton "Nouveau client" masqué
  - Bouton "← Retour aux clients actifs" affiché
  - Colonne Actions : uniquement le bouton "Restaurer"

## Critères de done

- [ ] Bascule actifs/archivés fonctionnelle
- [ ] Vue archivés avec titre et description adaptés
- [ ] Seul le bouton "Restaurer" apparaît dans la vue archivés
- [ ] Bouton "Nouveau client" masqué dans la vue archivés

## Dépendances

- task-01-affichage-tableau
