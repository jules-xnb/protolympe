# Workflows de correction et de cycle de vie (PER-002)

**Statut : ❌ Manquant**
**Réf. client : US-Orga-102, US-Orga-103, US-Orga-104, US-Orga-106**

## Exigence client

Le Gestionnaire (PER-002) ne peut pas modifier directement les données — il **propose** des changements, soumis à validation Admin.

### US-Orga-102 : Proposer une correction sur une entité
- Bouton "Proposer une correction" sur la fiche
- Champs modifiables : nom, statut, dates, parent
- Statuts de la demande : **Brouillon → Soumise → Approuvée / Rejetée** (par Admin)
- Journalisation : qui / quand / quoi, commentaire obligatoire
- Notification à l'Admin de rattachement

### US-Orga-104 : Demander la fermeture ou la réouverture
- Formulaire de demande avec commentaire obligatoire
- Contrôle bloquant côté admin : impossible d'approuver la fermeture si des enfants sont ouverts
- Workflow : Soumise → Approuvée / Rejetée

### US-Orga-106 : Proposer des tags de collecte
- Sélection multi-tags selon paramétrage
- Soumis à validation Admin (même workflow)
- Visible dans l'historique de l'entité

## Couverture actuelle

Aucun système de workflow de demande/approbation n'existe dans Olympe. Le produit actuel est un outil d'administration directe (CRUD sans circuit de validation).

## Manques

Module entier à construire.

## Proposition

### Module "Demandes"

Créer un module transverse "Demandes" avec :
- **Table `entity_requests`** : id, entity_id, type (correction / fermeture / réouverture / tag), statut (brouillon / soumise / approuvée / rejetée), auteur, date, payload (diff des champs proposés), commentaire
- **Vue Gestionnaire** : bouton "Proposer une correction" sur la fiche → formulaire pré-rempli avec les champs actuels, modifiables → soumission = création d'une demande en statut "Soumise"
- **Vue Admin** : dashboard "Demandes en attente" listant toutes les demandes avec leur statut. Clic → diff des modifications proposées + boutons Approuver / Rejeter + champ commentaire
- **Notification** : email ou badge dans l'interface à l'Admin quand une demande est soumise
- **Application automatique** : à l'approbation, les modifications proposées sont appliquées à l'entité et un événement est créé dans l'historique
