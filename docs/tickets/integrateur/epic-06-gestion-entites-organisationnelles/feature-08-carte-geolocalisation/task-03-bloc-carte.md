# [6-8-3] Bloc carte dans le page builder

## Référence Figma

À définir

## Description

Nouveau type de bloc `eo_map` dans le page builder, permettant d'afficher les entités organisationnelles sur une carte interactive Leaflet avec les tuiles OpenStreetMap.

## Détails fonctionnels

### Configuration intégrateur (page builder)
- Nouveau type de bloc "Carte" disponible dans la palette de blocs
- Configuration du bloc :
  - **Champ coordonnées** : sélecteur parmi les champs de type `coordinates` de l'EO (obligatoire)
  - **Filtres** : même système de configuration que le bloc `eo_card` — l'intégrateur choisit quels champs EO sont filtrables
  - **Zoom par défaut** : niveau de zoom initial de la carte (ex: France entière, région…)
  - **Centre par défaut** : coordonnées du centre initial (défaut : France métropolitaine 46.6, 2.2)

### Affichage utilisateur final
- Carte interactive pleine largeur dans le bloc
- Chaque EO ayant des coordonnées valides est représentée par un **pin/marqueur**
- **Clustering** : quand des pins sont proches, ils se regroupent en un cercle indiquant le nombre d'entités. Le zoom décompose les clusters en pins individuels
- **Clic sur un pin** : ouvre le drawer de détail de l'EO (même drawer que dans le bloc `eo_card`)
- **Popup au survol** : affiche le nom de l'EO
- **Filtres** : barre de filtres au-dessus de la carte, mêmes composants et comportement que les filtres du bloc `eo_card`
- Les EO sans coordonnées (géocodage échoué ou pas d'adresse) ne sont pas affichées sur la carte

### Librairies
- **Leaflet** + **react-leaflet** pour le rendu de la carte
- **Tuiles** : OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Clustering** : `leaflet.markercluster` (ou équivalent react-leaflet)

## Critères de done

- [ ] Bloc `eo_map` ajouté à la palette du page builder
- [ ] Configuration : champ coordonnées, filtres, zoom/centre par défaut
- [ ] Carte Leaflet fonctionnelle avec tuiles OpenStreetMap
- [ ] Pins affichés pour chaque EO avec coordonnées valides
- [ ] Clustering des pins proches
- [ ] Clic sur pin → ouverture du drawer EO
- [ ] Popup au survol avec nom de l'EO
- [ ] Filtres fonctionnels (même système que bloc `eo_card`)
- [ ] Responsive (la carte s'adapte à la largeur du conteneur)

## Dépendances

- 6-8-1 (champ coordonnées)
- 6-8-2 (géocodage — pour avoir des données à afficher)
