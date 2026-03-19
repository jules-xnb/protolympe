# Navigation ascendante et descendante depuis la fiche

**Statut : ⚠️ Partiel**
**Réf. client : US-Orga-002**

## Exigence client

Depuis la fiche détail d'une entité :
- **Navigation descendante** : accès aux entités enfants directes
- **Navigation ascendante** : accès au parent

## Couverture actuelle

Le drawer entité [7-1-2] liste les enfants directs avec des liens de navigation. Le parent est affiché comme champ mais pas forcément comme lien cliquable.

## Manques

1. **Lien cliquable vers le parent** dans le drawer (pas seulement affichage texte du nom du parent)
2. **Breadcrumb de navigation** : afficher le chemin complet depuis la racine (N1 > N2 > ... > entité courante) pour se situer dans l'arborescence — chaque nœud du breadcrumb est un lien

## Proposition

- Dans le drawer : afficher le parent comme un lien "→ Nom du parent" qui ouvre le drawer du parent
- Ajouter un breadcrumb en haut du drawer affichant le chemin complet depuis la racine
- En vue Canvas, la navigation descendante est naturelle (clic sur nœud = descend dans l'arbre) ; prévoir un bouton "Remonter au parent" ou un retour en arrière
