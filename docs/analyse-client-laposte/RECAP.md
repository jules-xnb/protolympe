# Récap analyse Specs La Poste DAG vs Olympe — État du code

Source : `Spec-Delta_Référentiel Orga-arborescence & Personae_060226.docx`
Date : 23/02/2026

## Légende

- ✅ = Implémenté dans le code
- ⚠️ = Partiellement implémenté (le gros est là, ajustements nécessaires)
- ❌ = Non implémenté

## Synthèse des 22 points

| # | Sujet | US spec | Code | Commentaire |
|---|---|---|---|---|
| 01 | Structure hiérarchique N1–N11 | US-Orga-001 | ✅ | Arborescence jusqu'à 11 niveaux, création d'entité à n'importe quel niveau avec choix du parent. |
| 02 | Vues Liste / Arbre / Canvas | US-Orga-002, 201 | ✅ | Trois modes de consultation : tableau paginé, arbre dépliable et vue graphique navigable. |
| 03 | Filtres dynamiques et recherche | US-Orga-002, 101 | ✅ | Recherche texte libre + filtres combinables (code, DF, statut, pays…) avec logique ET/OU. |
| 04 | Paramétrage Branche et Métier | US-Orga-010 | ✅ | Chaque entité est rattachée à une Branche (ligne d'activité : La Poste SA, LBP, Geopost…) et un Métier (segmentation opérationnelle). Ces deux listes sont administrables par l'Admin (ajout, modification, inactivation si valeur déjà utilisée). |
| 05 | Champs personnalisés (DF, adresse, Régate…) | ORG-CO-004/101/102/103 | ✅ | Champs configurables par client : texte, date, liste, numérique… avec contraintes (obligatoire, unique, format). |
| 06 | Import CSV en masse (wizard) | US-Orga-030 | ✅ | Assistant d'import en plusieurs étapes : upload, mapping des colonnes, prévisualisation, import, rapport de résultat. |
| 07 | Historique des modifications | US-Orga-011 | ✅ | Journal complet des actions (création, modification, suppression) avec qui, quand, quoi et possibilité de revenir en arrière. |
| 08 | Statut Ouvert/Fermé + dates | US-Orga-003, ORG-CO-007/008 | ✅ | Gestion du cycle de vie des entités (ouvert/fermé), dates d'effet/fin, commentaire de fermeture. |
| 09 | Toggle masquage entités fermées | US-Orga-003 | ✅ | Les entités fermées sont masquées par défaut, un bouton permet de les afficher/masquer. |
| 10 | Code invariant | ORG-CO-001 | ✅ | Identifiant unique généré automatiquement à la création, immuable, servant de clé de rattachement. |
| 11 | Navigation ascendante/descendante | US-Orga-002 | ✅ | Depuis la fiche d'une entité, accès direct au parent et à la liste des enfants. Fil d'Ariane. |
| 12 | Règle enfant ouvert sous parent fermé | US-Orga-001, 104 | ✅ | Interdit d'avoir une entité ouverte sous un parent fermé. Contrôle bloquant à la création et au changement de statut. |
| 13 | Périmètres de visibilité | US-Orga-101, 201 | ✅ | Chaque utilisateur ne voit que les entités de son périmètre et leurs descendants. Assignation par l'Admin. |
| 14 | Workflows de correction | US-Orga-102, 104, 106 | ❌ | Le gestionnaire doit pouvoir proposer une correction (nom, statut, dates, parent) sur une entité. La demande suit un cycle Brouillon→Soumise→Approuvée→Rejetée, validé par l'Admin. Inclut aussi la demande de fermeture/réouverture avec justification. |
| 15 | Détection anomalies | US-Orga-103, 011 | ❌ | Aujourd'hui les anomalies ne sont détectées qu'au moment de l'import. Il faut un contrôle continu sur les données existantes (libellé manquant, pays manquant, incohérence statut/dates, enfant ouvert sous parent fermé) avec une vue dédiée, des filtres par type et un export CSV. |
| 16 | Export de contrôle post-import | US-Orga-030, 011 | ✅ | Export CSV des entités avec champs clés (code, nom, parent, statut, champs custom). Historique des exports tracé (date, auteur). Rapport en fin d'import. |
| 17 | Tags de collecte avec validation Admin | US-Orga-106, ORG-CO-104 | ✅ | Le gestionnaire peut proposer des tags de collecte (niveau, groupe, zone…) sur une entité, soumis à validation de l'Admin. |
| 18 | Indicateurs d'intégrité | US-Orga-204 | ❌ | Le lecteur élargi doit voir des indicateurs visuels dans la liste et sur la fiche : badge si anomalie détectée, badge si entité fermée, info-bulle au survol expliquant le détail. Aucune action correctrice pour ce profil. |
| 19 | Favoris et filtres mémorisés | US-Orga-205 | ❌ | L'utilisateur doit pouvoir marquer des entités en favori pour y accéder rapidement, et retrouver ses derniers filtres appliqués en revenant sur la page (persistance en session, option de sauvegarde durable avec nom). |
| 20 | Deep-link vers fiche entité | US-Orga-202 | ✅ | Lien stable vers la fiche d'une entité, partageable entre utilisateurs pour accès direct. |
| 21 | Intégration NIFI | US-Orga-020 | ❌ | Delta doit exposer un point d'entrée pour recevoir les flux incidents enrichis par NIFI. Rejet si code invariant manquant, journalisation des flux reçus. Le mapping Régate→invariant reste côté NIFI. Hors périmètre UI. |
| 22 | Export par périmètre utilisateur (gestionnaire + lecteur) | US-Orga-105, 203 | ✅ | Le gestionnaire et le lecteur élargi peuvent exporter les entités de leur périmètre en CSV/Excel, avec marqueur de périmètre et date d'extraction. |

## Exigences non fonctionnelles (section 9 de la spec)

| Exigence | Spec | État code |
|---|---|---|
| Performance | Liste < 2s / 1 000 entités, Tree < 2s par niveau | Non mesuré formellement. |
| Traçabilité | Historiser créations/modifications/fermetures (qui, quand, quoi) | ✅ Traité |
| Sécurité | Contrôle d'accès par rôle et par périmètre | ✅ Traité |
