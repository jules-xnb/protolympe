# [6-4-1] Import d'entités organisationnelles

## Description

Wizard d'import CSV pour créer ou mettre à jour des entités en masse, avec gestion automatique de la hiérarchie, détection des reparentages et résolution des champs personnalisés.

## Détails fonctionnels

- Accessible depuis le menu "Import/Export" de la page de liste
- Champs CSV natifs :
  - **Nom** (requis) : nom de l'entité
  - **Nom parent** (optionnel) : nom ou code de l'entité parente
  - **Statut** (optionnel) : actif/inactif
- Champs CSV personnalisés : tous les champs personnalisés actifs sont proposés au mapping
- Wizard en 4 étapes :
  1. **Upload** : sélection de fichier CSV
  2. **Mapping** : correspondance des colonnes CSV vers les champs. Auto-mapping intelligent des en-têtes
  3. **Prévisualisation** :
    - Cartes de résumé : entités à créer, reparentages détectés, erreurs
    - Alerte d'erreurs avec téléchargement du rapport d'erreurs
    - Tableau des reparentages : code, entité, ancien parent (barré), nouveau parent (surligné)
    - Prévisualisation de l'arborescence résultante avec 3 vues (Liste, Arborescence, Canvas)
    - Boutons "Tout déplier / replier"
    - Clic sur une entité : ouverture du drawer de détail
  4. **Résultats** :
    - Compteurs de succès/erreurs
    - Téléchargement du rapport de contrôle (CSV avec : Code, Nom, Parent, Niveau, Statut, Anomalie)
    - Redirection automatique si 100% succès
- Détection des doublons (dans le CSV et avec les entités existantes)
- Si une entité avec le même nom existe, mise à jour des champs (pas de création de doublon)

## Critères de done

- [ ] Wizard 4 étapes fonctionnel
- [ ] Auto-mapping des colonnes CSV
- [ ] Gestion de la hiérarchie parent-enfant
- [ ] Détection et affichage des reparentages
- [ ] Prévisualisation avec 3 vues (liste, arbre, canvas)
- [ ] Détection des doublons
- [ ] Rapport d'erreurs et rapport de contrôle téléchargeables
- [ ] Champs personnalisés mappés et importés

## Dépendances

- 6-1-1
