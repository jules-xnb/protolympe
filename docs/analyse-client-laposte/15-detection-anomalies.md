# Détection et gestion des anomalies de données

**Statut : ❌ Manquant**
**Réf. client : US-Orga-011, US-Orga-103**

## Exigence client

### US-Orga-011 (Admin) : Corriger les incohérences
- Rapport listant les anomalies par type
- Bouton d'export sur la vue Liste avec champs clés
- Historique des exports (date, auteur)

### US-Orga-103 (Gestionnaire) : Visualiser et assigner des anomalies
- Liste des anomalies dans son périmètre :
  - Libellé manquant
  - Pays manquant
  - Incohérence statut/dates (fermé mais dates incohérentes)
  - Enfant ouvert sous parent fermé
- Filtre par type d'anomalie
- Export CSV des anomalies du périmètre
- Action "Assigner à l'Admin" avec commentaire

## Couverture actuelle

Aucune détection d'anomalies automatique dans le produit. Le wizard d'import détecte des erreurs en étape 3 (avant import), mais pas sur les données existantes.

## Manques

Module entier à construire.

## Proposition

### Moteur de règles qualité

Implémenter un ensemble de règles de qualité évaluées en temps réel ou à la demande :

| Code règle | Anomalie | Condition |
|---|---|---|
| ANO-001 | Libellé manquant | `name IS NULL OR name = ''` |
| ANO-002 | Pays manquant | `pays IS NULL` |
| ANO-003 | Incohérence statut/dates | `statut = Ouvert AND date_fin < now()` |
| ANO-004 | Enfant ouvert sous parent fermé | `entity.statut = Ouvert AND parent.statut = Fermé` |
| ANO-005 | Doublon (même nom dans le même niveau) | `name déjà utilisé par un frère` |

### Vue Anomalies

- Page dédiée "Anomalies" accessible depuis le menu principal
- Tableau avec colonnes : Entité, Code invariant, Type d'anomalie, Détail, Actions
- Filtre par type d'anomalie
- Bouton "Exporter CSV"
- Action "Assigner à l'Admin" (PER-002) → crée une demande (voir [14-workflows-correction.md])
- Badge/compteur dans le menu indiquant le nombre d'anomalies actives
