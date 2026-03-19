# Périmètres de visibilité par utilisateur (PER-001 / PER-002 / PER-003)

**Statut : ❌ Manquant**
**Réf. client : Les personae La Poste, US-Orga-101, US-Orga-201**

## Exigence client

Trois personae avec des niveaux de visibilité distincts :

| Persona | Visibilité | Droits |
|---|---|---|
| PER-001 Administrateur | Globale (toutes entités) | CRUD complet, gestion des listes |
| PER-002 Gestionnaire | Nœud assigné + tous descendants | Lecture étendue + propositions de corrections |
| PER-003 Lecteur élargi | Globale (ou restreinte) | Lecture seule |

Pour PER-002 : l'utilisateur ne voit que le sous-arbre assigné, les filtres/tri s'appliquent dans ce périmètre, et les exports sont limités à ce périmètre.

## Couverture actuelle

Le système de rôles (epic [5-0-0]) gère les *définitions* de rôles (catégories + rôles avec couleur), mais ne gère pas :
- L'assignation d'un rôle à un utilisateur
- La restriction de visibilité selon le rôle
- Le concept de "nœud racine de périmètre" pour PER-002

## Manques

1. **Assignation de rôle à un utilisateur** : un utilisateur doit pouvoir se voir attribuer un rôle (PER-001, PER-002, PER-003) et un nœud de départ pour PER-002
2. **Filtrage automatique de la vue** : pour PER-002, la liste et l'arbre ne montrent que le sous-arbre du nœud assigné (requête avec filtre sur les descendants)
3. **Restriction de l'export** : l'export CSV de PER-002 ne contient que les entités de son périmètre
4. **Masquage des actions d'édition** : pour PER-003, les boutons Modifier/Fermer/Créer sont absents de l'UI

## Proposition

- Ajouter une table `user_permissions` (ou étendre le profil utilisateur) avec : `user_id`, `role_type` (admin/manager/reader), `scope_entity_id` (nœud racine pour PER-002)
- Implémenter les Row-Level Security (RLS) en Supabase pour les entités : un PER-002 ne peut lire que les entités dont le chemin parent inclut son `scope_entity_id`
- Côté UI : utiliser le `role_type` pour afficher ou masquer les boutons d'action
- Un PER-002 voit un compteur "X entités ouvertes dans votre périmètre (+ Y fermées)"
