# [3-3-1] Drawer de détails d'un intégrateur

## Référence Figma

- [home-intégrateurs-drawer](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=87-2544)

## Description

Implémenter le panneau latéral affichant les informations complètes d'un intégrateur / admin et permettant de modifier son rôle.

## Détails fonctionnels

- Panneau latéral (drawer) s'ouvrant depuis le tableau
- Section "Informations générales" :
  - **Statut / Rôle** : select modifiable ("Intégrateur Delta" / "Admin Delta") avec auto-save (debounce 500ms)
  - **Date de création** : en lecture seule (format "dd/MM/yy")
  - **Nom** : en lecture seule
  - **Prénom** : en lecture seule
  - **Adresse mail** : en lecture seule (non modifiable)
- Section "Clients associés" (voir task-02) — uniquement pour les intégrateurs car les admins ont tous les clients par défaut

## Critères de done

- [ ] Drawer s'ouvre depuis le clic sur le nom ou le bouton "Modifier"
- [ ] Toutes les informations de l'intégrateur affichées
- [ ] Modification du rôle fonctionnelle avec auto-save
- [ ] Champs en lecture seule non modifiables

## Dépendances

- task-01-affichage-tableau (feature-01)
