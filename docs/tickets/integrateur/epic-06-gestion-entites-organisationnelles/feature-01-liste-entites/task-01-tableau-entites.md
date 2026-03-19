# [6-1-1] Tableau des entités (vue liste)

## Description

Afficher les entités organisationnelles dans un tableau avec les informations essentielles, les champs personnalisés en colonnes dynamiques et les actions rapides.

## Détails fonctionnels

- Onglets en haut de page : **Entités** | **Regroupements**
- Toolbar du header :
  - Bouton "Nouvelle entité" → navigation vers la page de création
  - Menu déroulant "Import/Export" avec :
    - Importer → page d'import
    - Exporter → téléchargement CSV de toutes les entités avec leurs champs personnalisés
  - Bouton "Historique" → page d'historique
  - Bouton "Gérer les champs" → page de structure des champs
- Sélecteur de vue : Liste | Arborescence | Canvas
- Colonnes fixes du tableau :
  - **ID** : code de l'entité
  - **Nom** : nom de l'entité
  - **Parent** : nom de l'entité parente (tiret si racine)
  - **Niv.** : niveau hiérarchique
- Colonnes dynamiques : une colonne par champ personnalisé actif, dimensionnée selon le type
- Clic sur une ligne : ouverture du drawer de détail de l'entité
- Recherche textuelle par nom et code
- Barre de recherche avec placeholder "Rechercher une entité..."

## Critères de done

- [ ] Tableau affiché avec colonnes fixes et dynamiques
- [ ] Toolbar avec tous les boutons d'action
- [ ] Onglets Entités / Regroupements
- [ ] Sélecteur de vue fonctionnel
- [ ] Recherche textuelle
- [ ] Clic sur ligne ouvre le drawer de détail
- [ ] Export CSV fonctionnel
- [ ] État de chargement visible
- [ ] État vide si aucune entité

## Dépendances

- Aucune
