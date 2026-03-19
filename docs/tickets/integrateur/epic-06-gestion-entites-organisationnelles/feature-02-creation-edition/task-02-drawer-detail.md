# [6-2-2] Drawer de détail d'une entité

## Description

Drawer latéral affichant les informations complètes d'une entité avec navigation par onglets : Info, Champs, Historique.

## Détails fonctionnels

- Drawer glissant depuis la droite (450px de largeur)
- Header :
  - Nom de l'entité
  - Badge de statut (Actif / Inactif)
  - Bouton d'export (téléchargement des données de l'entité)
  - Bouton de fermeture
- 3 onglets :
  - **Info** :
    - Fil d'Ariane montrant les ancêtres de l'entité (cliquables pour naviguer)
    - Section "Enfants" listant les entités enfants actives et inactives
    - Bouton "Tout voir" si beaucoup d'enfants
    - Clic sur un enfant : navigation vers son détail dans le drawer
  - **Champs** : voir ticket 6-2-3
  - **Historique** : journal d'audit récent de l'entité (mêmes informations que la page d'historique, filtrées sur cette entité)
- Indicateur de sauvegarde en cours visible lors des modifications

## Critères de done

- [ ] Drawer avec les 3 onglets
- [ ] Header avec nom, badge statut, export, fermeture
- [ ] Onglet Info : fil d'Ariane, enfants actifs/inactifs
- [ ] Navigation entre entités via le drawer
- [ ] Onglet Historique fonctionnel
- [ ] Indicateur de sauvegarde

## Dépendances

- 6-1-1
