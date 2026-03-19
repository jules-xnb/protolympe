# [6-1-3] Vue canvas des entités

## Description

Afficher les entités dans une vue graphique interactive (organigramme) avec navigation panoramique et zoom.

## Détails fonctionnels

- Représentation graphique des entités en nœuds reliés par des liens hiérarchiques
- Deux modes d'interaction :
  - **Déplacement** (icône main) : glisser-déposer pour naviguer dans le canvas
  - **Sélection** (icône curseur) : cliquer sur un nœud pour le sélectionner
- Contrôles de zoom : boutons zoom avant/arrière
- Bouton "Ajuster" : recentre et ajuste le zoom pour afficher toutes les entités
- Chaque nœud affiche le nom et le code de l'entité
- Nœuds dépliables/repliables (masquer/afficher les enfants)
- Clic sur un nœud : ouverture du drawer de détail
- La vue canvas respecte les filtres actifs

## Critères de done

- [ ] Rendu graphique des nœuds avec liens hiérarchiques
- [ ] Modes déplacement et sélection
- [ ] Zoom avant/arrière et ajustement automatique
- [ ] Nœuds dépliables/repliables
- [ ] Clic sur nœud ouvre le drawer
- [ ] Filtres respectés

## Dépendances

- 6-1-1
