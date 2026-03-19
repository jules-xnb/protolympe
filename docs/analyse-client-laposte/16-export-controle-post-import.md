# Export de contrôle post-import

**Statut : ❌ Manquant**
**Réf. client : US-Orga-030, US-Orga-011**

## Exigence client

Après chargement en masse du référentiel, générer un **export Excel/CSV de contrôle** contenant :
- Code invariant, Nom, Statut, Pays, Parent
- Anomalies détectées (doublon, libellé manquant, statut incohérent...)

Cet export permet à la DAG de valider le chargement et d'itérer en corrigeant les anomalies avant gel V1.

L'Admin doit également pouvoir relancer un export de contrôle à tout moment (pas seulement post-import) avec historique des exports (date, auteur).

## Couverture actuelle

Le wizard d'import (étape 4) se termine par une redirection vers la page principale. Aucun export de contrôle n'est généré.

L'export CSV global existe ([7-4-1]) mais ne contient pas les anomalies.

## Manques

1. **Export de contrôle post-import** : à la fin de l'étape 4 du wizard, proposer un bouton "Télécharger le rapport de contrôle" en plus de la redirection
2. **Colonnes du rapport** : Code invariant, Nom, Statut, Pays, Code parent, Statut anomalie (OK / liste des anomalies détectées)
3. **Relance manuelle** : bouton "Export de contrôle" sur la vue Liste (accessible à l'Admin) générant le même rapport sur toutes les entités existantes
4. **Historique des exports** : table `export_logs` (date, auteur, type d'export, nombre d'entités) visible par l'Admin

## Proposition

- Ajouter une étape optionnelle en fin du wizard : "Télécharger le rapport de contrôle (CSV)" qui génère le fichier avec les colonnes ci-dessus + colonne anomalies calculée à la volée
- Ajouter un bouton dans le menu "Import/Export" > "Rapport de contrôle" pour la relance manuelle
- Stocker les métadonnées de chaque export dans une table dédiée pour l'historique
