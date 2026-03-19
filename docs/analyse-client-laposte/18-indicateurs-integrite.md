# Indicateurs d'intégrité (badges anomalies, statut fermé)

**Statut : ❌ Manquant**
**Réf. client : US-Orga-204**

## Exigence client

Le Lecteur élargi (PER-003) visualise des indicateurs d'intégrité sur la fiche et dans la liste :
- Badge / icône si l'entité a des anomalies
- Badge / icône si l'entité est fermée
- Info-bulles explicatives au survol
- Aucun bouton d'action correctrice pour PER-003

## Couverture actuelle

La vue liste actuelle n'affiche pas de colonnes ni d'indicateurs visuels liés aux anomalies ou au statut fermé.

## Manques

1. **Colonne "Statut"** dans la vue Liste : doit afficher "Ouvert" ou "Fermé" avec un style différencié (texte gris / icône cadenas pour Fermé)
2. **Badge anomalie** : icône d'alerte (⚠) sur les lignes ayant au moins une anomalie détectée (voir [15-detection-anomalies.md])
3. **Info-bulle** au survol du badge : liste des types d'anomalies de l'entité
4. **Absence d'actions** pour PER-003 : les boutons Modifier, Fermer, Créer doivent être masqués selon le rôle

## Proposition

- Ajouter une colonne "Statut" dans la vue Liste avec un badge coloré (vert = Ouvert, gris = Fermé)
- Ajouter une colonne "Anomalies" avec un compteur cliquable (ou icône ⚠ si > 0) qui ouvre le détail des anomalies
- Les styles différenciés (lignes grisées pour Fermé) améliorent la lisibilité sans action requise
- Ces indicateurs ne nécessitent pas le module "Anomalies" complet pour être affichés — une colonne calculée suffit
