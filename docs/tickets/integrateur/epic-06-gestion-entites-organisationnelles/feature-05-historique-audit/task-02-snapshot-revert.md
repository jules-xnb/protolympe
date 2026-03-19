# [6-5-2] Snapshot et restauration de valeurs

## Description

Permettre de consulter l'état complet d'une entité à un instant donné (snapshot) et de restaurer une valeur antérieure (revert).

## Détails fonctionnels

- **Snapshot** (bouton "Voir" dans le tableau d'audit) :
  - Dialog affichant l'état complet de l'entité au moment de la modification
  - Liste de tous les champs modifiés avec anciennes et nouvelles valeurs
  - Inclut les champs personnalisés
- **Revert** (bouton "Annuler" dans le tableau d'audit) :
  - Dialog de confirmation indiquant :
    - Le champ concerné
    - La valeur actuelle et la valeur de restauration
    - Avertissement : "Cette action créera une nouvelle entrée dans l'historique"
  - Après confirmation : le champ est restauré à la valeur antérieure
  - Une nouvelle entrée d'audit est créée pour tracer le revert
- Les deux fonctionnalités sont aussi accessibles depuis l'onglet "Historique" du drawer de détail

## Critères de done

- [ ] Dialog de snapshot avec état complet
- [ ] Dialog de revert avec confirmation et avertissement
- [ ] Restauration effective de la valeur
- [ ] Nouvelle entrée d'audit créée après revert
- [ ] Accessible depuis la page d'historique et le drawer

## Dépendances

- 6-5-1
