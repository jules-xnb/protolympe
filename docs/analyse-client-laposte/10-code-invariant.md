# Code invariant (identifiant pivot)

**Statut : ⚠️ Partiel**
**Réf. client : ORG-CO-001**

## Exigence client

- Identifiant unique de **5 caractères, zéros à gauche** (ex. `00042`)
- **Généré par Delta** à la création d'une entité — l'utilisateur ne le saisit pas
- **Immuable** après création (clé de rattachement pour polices, sinistres, primes, expositions)
- **Enrichi par NIFI** dans les flux entrants pour associer les incidents à la bonne entité
- Clé de correspondance dans la chaîne INDIS/NIFI/Delta
- Sa génération est **indispensable** à la création d'une nouvelle entité

## Couverture actuelle

Les entités ont un champ "code technique" auto-généré depuis le nom (format MAJUSCULES_UNDERSCORES). Ce n'est pas un code invariant :
- Format libre, non contraint à 5 chars
- Dérivé du libellé, pas d'un compteur séquentiel
- Non immuable (modifiable en édition)
- Pas de sémantique d'intégration NIFI

## Manques

1. **Format** : séquentiel sur 5 chars avec zéros à gauche (ex. compteur auto-incrémenté en base)
2. **Immutabilité** : champ non modifiable après création (lecture seule en édition)
3. **Génération à la création** : générée côté serveur (pas côté client), garantissant l'unicité globale
4. **Affichage explicite** : le code invariant doit être visible en tête de la fiche détail et dans la vue liste comme colonne à part entière

## Proposition

- Ajouter un champ système `code_invariant` en base (séquence PostgreSQL, format `LPAD(nextval(), 5, '0')`)
- L'afficher en lecture seule dans le formulaire entité dès la création
- L'inclure dans toutes les vues (liste, tree, canvas) et dans les exports
- Il devient la clé pour les imports en masse et l'intégration NIFI
