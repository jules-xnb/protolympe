# [5-1-1] Tableau des objets métiers

## Description

Afficher la liste des objets métiers actifs dans un tableau avec les informations essentielles, les compteurs et les actions rapides.

## Détails fonctionnels

- Colonnes du tableau :
  - **Nom** : nom de l'objet + slug en sous-titre (police mono)
  - **Description** : texte tronqué sur une ligne, tiret si absent
  - **Champs** : nombre de field_definitions associées
  - **Instances** : nombre de business_objects associés
  - **Actions** : menu déroulant (⋮) avec :
    - Dupliquer → ouvre le dialog de duplication (nom pré-rempli avec " (copie)")
    - Archiver (destructif) → ouvre la confirmation d'archivage
- Clic sur une ligne : navigation vers la page de détail de l'objet
- Bouton "Nouvel objet métier" dans le header (ouvre le dialog de création)
- Bouton "Archives" dans le header (navigation vers la page des archives)
- Les données sont filtrées sur le client sélectionné et uniquement les objets actifs (is_active = true)

## Critères de done

- [ ] Tableau affiché avec toutes les colonnes
- [ ] Compteurs de champs et d'instances corrects
- [ ] Menu d'actions avec Dupliquer et Archiver
- [ ] Duplication fonctionnelle depuis le tableau
- [ ] Archivage avec confirmation depuis le tableau
- [ ] Clic sur ligne navigue vers la page de détail
- [ ] État de chargement visible
- [ ] État vide si aucun objet métier

## Dépendances

- Aucune
