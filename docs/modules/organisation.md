# Module Organisation

## Description métier

Module de gestion de la structure organisationnelle d'un client (entités, arborescence, niveaux). Permet à l'intégrateur de configurer comment les entités organisationnelles sont affichées, filtrées et éditées côté utilisateur final.

---

## Features

### 15-1 — Suppression du retour admin dans la sidebar module `todo`

Supprimer le bouton "Retour navigation" de la sidebar du module. La sidebar ne contient que les sections internes (Affichage, Rôles, Permissions…). Pour sortir du module → navigation globale.

### 15-2 — Onglet Général dans Affichage `todo`

Nouvel onglet "Général" en première position des onglets d'une configuration d'affichage. Contient pour l'instant uniquement le **nom de la page côté FO**. Ce nom est retiré de l'en-tête au-dessus des onglets.

### 15-3 — Drawer : champs systèmes toujours actifs `todo`

Champs systèmes obligatoires (pas de toggle, toujours visibles et actifs) :
- **Nom** — identifiant principal
- **Parent** — nécessaire pour l'arborescence
- **Niveau** — calculé automatiquement, lecture seule. **Doit remonter** de la section config vers les champs systèmes.

**Est actif** reste un champ système mais conserve son toggle visible/éditable.

Ordre fixe : Nom, Parent, Niveau, Est actif.

### 15-4 — Pré-filtre adaptatif `todo`

Un pré-filtre = un groupe de conditions. Chaque condition a un champ, un opérateur et une valeur.

**Adaptation au type de champ :**
- Texte → opérateurs texte + input texte
- Nombre → opérateurs numériques + input nombre (2 inputs si "Entre")
- Booléen → Égal à + sélecteur Oui/Non
- Sélection → opérateurs + dropdown des options du champ
- Date → opérateurs date + date picker (2 si "Entre")
- Référence → Égal à / Différent de + sélecteur entité

**Opérateur logique :** AND/OR global entre les conditions (pas de mix). Par défaut AND. Visible entre les lignes quand 2+ conditions.

Changement de champ → réinitialise opérateur et valeur.

### 15-5 — Sélecteurs avec recherche `todo`

**Barre de recherche** en haut de **tous les sélecteurs** de la plateforme :
- Filtrage temps réel, insensible casse + accents
- Focus auto à l'ouverture
- "Aucun résultat" si vide
- Se vide à la fermeture

**Sélecteur de type de champ** : affiche icône + nom du type dans le trigger.

Composant `SearchableSelect` réutilisable pour toute la plateforme.

---

## Décisions prises

- **2026-03-19** : Reprise propre du module après migration batch. PRD-first systématique.
- **2026-03-19** : Structure docs simplifiée (un fichier par module) au lieu de tickets éclatés.
- **2026-03-19** : Pré-filtre = un groupe de conditions avec AND/OR global, pas de mix.

---

## Bugs connus / dette technique

_(À remplir au fur et à mesure)_
