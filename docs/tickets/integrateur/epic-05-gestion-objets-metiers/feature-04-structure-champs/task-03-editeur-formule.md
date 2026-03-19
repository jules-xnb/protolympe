# [5-4-3] Éditeur de formule pour champs calculés

## Description

Composant d'édition de formules pour les champs de type "calculé", avec panneau de référence des champs disponibles, fonctions et opérateurs.

## Détails fonctionnels

- Textarea de saisie de la formule (monospace, 3 lignes, redimensionnable)
- Panneau de référence avec 3 onglets :
  - **Champs** : liste des champs disponibles de l'objet, clic insère `{slug}` à la position du curseur
  - **Fonctions** : groupées par catégorie, clic insère la syntaxe
    - Logique : si, et, ou, non, vide
    - Mathématiques : somme, moyenne, min, max, abs, arrondi
    - Texte : concat, majuscule, minuscule, longueur
    - Date : maintenant, aujourdhui, diff_jours
    - Conversion : texte, nombre, decimal, entier, booleen, date, format_date
  - **Opérateurs** : grille de +, -, *, /, ==, !=, >, <, >=, <=, (, )
- Recherche transversale dans les champs et fonctions
- L'insertion se fait à la position du curseur, le curseur est repositionné après l'insertion
- **Analyse de formule** : affiche le type de sortie inféré (texte/nombre/date/booléen) avec couleur, ou les erreurs détectées (parenthèses non fermées, chaînes non fermées, fonctions inconnues)

## Critères de done

- [ ] Textarea de formule fonctionnelle
- [ ] 3 onglets avec le contenu correct
- [ ] Insertion à la position du curseur
- [ ] Recherche fonctionnelle
- [ ] 30 fonctions disponibles et documentées (incluant 7 fonctions de conversion)
- [ ] Analyse de formule avec type de sortie inféré et détection d'erreurs

## Dépendances

- 5-4-2
