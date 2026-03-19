# Vues Liste / Arbre / Canvas

**Statut : ✅ Couvert**
**Réf. client : US-Orga-002, US-Orga-201**

## Exigence client

Consultation de l'arborescence en 3 vues :
- **Liste** : vue paginée avec tri sur colonnes
- **Tree** : arborescence dépliable
- **Canva** : navigation par niveaux (clic pour descendre dans l'arborescence)

Un clic sur une ligne/nœud affiche la fiche détail de l'entité.

## Couverture actuelle

Les 3 modes de visualisation sont prévus dans le ticket [7-1-1] :
- Liste : tableau avec colonnes Nom, Code, Parent, Statut
- Tree : vue hiérarchique collapsible avec indentation
- Diagram : canvas interactif (drag, zoom, minimap)

## Manques

- **Tri sur colonnes en vue Liste** : à confirmer que c'est implémenté (le ticket mentionne les colonnes mais pas explicitement le tri ascendant/descendant)
- **Pagination en vue Liste** : à confirmer (le client mentionne explicitement la pagination)
- **Mémorisation de la vue active** : le client n'exige pas explicitement la persistance de la vue choisie entre sessions, mais c'est un confort à envisager
