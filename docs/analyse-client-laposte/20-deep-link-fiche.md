# Deep-link vers une fiche entité

**Statut : ❌ Manquant**
**Réf. client : US-Orga-202**

## Exigence client

Le Lecteur élargi (PER-003) peut partager un lien direct et stable vers la fiche détail d'une entité. Ce lien est utilisable par tout utilisateur ayant accès à la plateforme.

## Couverture actuelle

La navigation actuelle est probablement gérée via l'état React (drawer ouvert/fermé) sans URL dédiée par entité. À confirmer.

## Manques

1. **Routing par entité** : chaque entité doit avoir une URL stable du type `/entities/:id` (ou `?entity=:id` si le routing est partiel)
2. **Bouton "Copier le lien"** dans le drawer ou la fiche détail
3. **Ouverture directe** : accéder à l'URL doit ouvrir la page entités avec le drawer de l'entité ciblée pré-ouvert

## Proposition

- Implémenter un routing React Router avec `/integrator/entities/:entityId`
- Quand l'URL contient un `entityId`, ouvrir automatiquement le drawer de cette entité au chargement
- Ajouter un bouton "🔗 Copier le lien" dans le header du drawer (copie dans le presse-papier via `navigator.clipboard`)
- Les filtres actifs peuvent aussi être encodés dans l'URL pour permettre le partage de vues filtrées (voir [19-favoris-filtres-memorises.md])
