# Champs personnalisés (DF, adresse, Régate, tags)

**Statut : ✅ Couvert**
**Réf. client : ORG-CO-004, ORG-CO-101, ORG-CO-102, ORG-CO-103, ORG-CO-104**

## Exigence client

Champs spécifiques à La Poste sur chaque entité :

| Champ | Type | Obligatoire |
|---|---|---|
| N° Direction Financière (DF) | Alphanumérique ≤ 6 chars | Oui |
| Adresse | Texte structuré (adresse, CP, ville) | Non |
| Code Régate | Chaîne | Non |
| Commentaire de fermeture | Texte ≤ 500 chars | Non |
| Attributs de tagging collectes | Liste(s)/Tags | Non |

## Couverture actuelle

Le système de champs personnalisés (epic [7-2-0]) permet de créer des champs de types : texte court, texte long, nombre, date, booléen, liste déroulante (depuis un référentiel), fichier, email, URL, téléphone.

- DF → champ texte court avec contrainte ≤ 6 chars
- Adresse → plusieurs champs texte (adresse, CP, ville) ou un champ texte long
- Code Régate → champ texte court
- Commentaire de fermeture → champ texte long ≤ 500 chars (à afficher uniquement si statut = Fermé)
- Tags de collecte → champ liste déroulante depuis un référentiel dédié

## Manques

- **Contrainte de longueur sur les champs** : le système de champs personnalisés supporte-t-il des contraintes de longueur max ? À vérifier. Si non, à ajouter pour DF (≤ 6 chars)
- **Visibilité conditionnelle** : le champ "Commentaire de fermeture" ne devrait idéalement s'afficher que lors du passage à Fermé, pas en permanence. Non couvert actuellement
- **Caractère obligatoire conditionnel** : Branche et Métier sont obligatoires selon la spec — à configurer dans les champs personnalisés
