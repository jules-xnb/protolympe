# [5-3-1] Page de détail d'un objet métier

## Description

Afficher la page de détail d'un objet métier avec son header, les actions disponibles et les métadonnées.

## Détails fonctionnels

- Header :
  - Bouton retour vers la liste des objets métiers
  - Nom de l'objet en titre (avec icône et couleur si configurés)
  - Bouton "Structure" (outline) → navigation vers la page de structure
  - Menu déroulant (⋮) avec :
    - Modifier → ouvre le dialog d'édition
    - Dupliquer → ouvre le dialog de duplication
    - Séparateur
    - Archiver (destructif) → ouvre la confirmation d'archivage
- Pied de page : dates de création et mise à jour
- Après archivage : redirection vers la liste des objets métiers

## Critères de done

- [ ] Header avec nom, icône, couleur
- [ ] Bouton "Structure" fonctionnel
- [ ] Menu déroulant avec les 3 actions
- [ ] Archivage avec confirmation et redirection
- [ ] Métadonnées de dates en bas de page

## Dépendances

- 5-1-1
