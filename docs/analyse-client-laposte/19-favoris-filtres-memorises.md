# Favoris et mémorisation des filtres

**Statut : ❌ Manquant**
**Réf. client : US-Orga-205**

## Exigence client

- **Favoris** : liste de favoris par utilisateur (entités fréquemment consultées), accessible rapidement
- **Mémorisation des derniers filtres** : persistance des filtres actifs par session (option : préférence durable)
- Aucune conséquence sur le référentiel (lecture pure)

## Couverture actuelle

Ni le système de favoris ni la persistance des filtres ne sont prévus dans les tickets actuels.

## Manques

1. **Favoris** : icône étoile sur la fiche entité → ajout/retrait des favoris de l'utilisateur. Accès rapide via un panneau "Mes favoris" ou un filtre dédié
2. **Persistance des filtres en session** : les filtres actifs se perdent à la navigation. Les stocker dans `sessionStorage` ou dans l'URL (query params)
3. **Préférences durables** : option pour sauvegarder des filtres nommés (ex. "Mes entités ouvertes en France") stockés en base par utilisateur

## Proposition

- **Favoris** : table `user_favorites` (user_id, entity_id). L'icône étoile appelle une mutation rapide. Section "Favoris" dans la sidebar ou en haut de la liste.
- **Filtres en session** : sérialiser l'état des filtres DynamicFilters dans l'URL (query params encodés). Cela résout aussi le partage de lien filtré (US-Orga-202).
- **Filtres sauvegardés** : table `user_saved_filters` (user_id, name, filter_config JSON). UI : bouton "Sauvegarder cette recherche" → dialog avec nom → accessible dans un menu déroulant.

Note : la persistance des filtres dans l'URL est un gain pour tous les utilisateurs et peut être traité en même temps que le deep-link (voir [20-deep-link-fiche.md]).
