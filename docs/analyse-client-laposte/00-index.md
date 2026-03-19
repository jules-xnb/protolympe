# Analyse : Specs La Poste DAG vs Olympe

Source : `Spec-Delta_Référentiel Orga-arborescence & Personae_060226.docx`

## ✅ Couvert

| # | Sujet | Réf. client |
|---|---|---|
| [01](01-structure-hierarchique.md) | Structure hiérarchique N1–N11 | ORG-CO-009, US-Orga-001 |
| [02](02-vues-liste-tree-canvas.md) | Vues Liste / Arbre / Canvas | US-Orga-002, US-Orga-201 |
| [03](03-filtres-dynamiques.md) | Filtres dynamiques et recherche | US-Orga-002, US-Orga-101 |
| [04](04-referentiels-branche-metier.md) | Paramétrage Branche et Métier | ORG-CO-005/006, US-Orga-010 |
| [05](05-champs-personnalises.md) | Champs personnalisés (DF, adresse, Régate…) | ORG-CO-004/101/102/103 |
| [06](06-import-wizard.md) | Import CSV en masse (wizard) | US-Orga-030 |
| [07](07-historique-modifications.md) | Historique des modifications | US-Orga-011 |

## ⚠️ Partiel — ajustements nécessaires

| # | Sujet | Réf. client |
|---|---|---|
| [08](08-statut-ouvert-ferme.md) | Statut Ouvert/Fermé + commentaire de fermeture + dates | ORG-CO-007/008, US-Orga-003 |
| [09](09-toggle-masquage-fermes.md) | Toggle masquage des entités fermées (par défaut) | ORG-CO-007, US-Orga-003 |
| [10](10-code-invariant.md) | Code invariant 5 chars, immuable, généré par Delta | ORG-CO-001 |
| [11](11-navigation-ascendante-descendante.md) | Navigation ascendante/descendante + breadcrumb | US-Orga-002 |

## ❌ Manquant — à construire

| # | Sujet | Réf. client | Effort |
|---|---|---|---|
| [12](12-regle-enfant-parent-ferme.md) | Règle : interdit enfant ouvert sous parent fermé | ORG-CO-009, US-Orga-104 | Moyen |
| [13](13-perimetres-visibilite.md) | Périmètres de visibilité par utilisateur (PER-001/002/003) | US-Orga-101, US-Orga-201 | Fort |
| [14](14-workflows-correction.md) | Workflows de correction et cycle de vie (PER-002) | US-Orga-102/104/106 | Fort |
| [15](15-detection-anomalies.md) | Détection et gestion des anomalies de données | US-Orga-011, US-Orga-103 | Moyen |
| [16](16-export-controle-post-import.md) | Export de contrôle post-import | US-Orga-030, US-Orga-011 | Faible |
| [17](17-tags-collecte-validation.md) | Tags de collecte avec validation Admin | ORG-CO-104, US-Orga-106 | Moyen |
| [18](18-indicateurs-integrite.md) | Indicateurs d'intégrité (badges anomalies, statut fermé) | US-Orga-204 | Moyen |
| [19](19-favoris-filtres-memorises.md) | Favoris et mémorisation des filtres | US-Orga-205 | Moyen |
| [20](20-deep-link-fiche.md) | Deep-link vers une fiche entité | US-Orga-202 | Faible |

## 🔲 Hors périmètre UI actuel

| # | Sujet | Réf. client |
|---|---|---|
| [21](21-integration-nifi.md) | Intégration NIFI — flux entrants | US-Orga-020 |
