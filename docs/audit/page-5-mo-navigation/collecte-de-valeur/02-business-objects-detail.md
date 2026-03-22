# Spec : Business Object -- Detail

## Maquettes

### Detail (instances)

```
+---------------------------------------------------------------------+
|  [<-]  Incident                                                      |
|        (breadcrumb : slug affiché)                                   |
|                                                                      |
|  [Archiver] [Historique] [Structure] [Ajouter +]   [...menu]        |
+---------------------------------------------------------------------+
|  [Rechercher par identifiant ou entite...]                           |
+---------------------------------------------------------------------+
|  Identifiant | EO       | Statut | Type camp. | Campagne | Champ1.. |
|--------------|----------|--------|------------|----------|----------|
|  INC-001     | Paris    | Ouvert | Annuelle   | Camp 24  | val1     |
|  INC-002     | Lyon     | Ferme  |            |          | val2     |
+---------------------------------------------------------------------+
|  < 1/3 >                                      20 resultats          |
+---------------------------------------------------------------------+
|  Cree le 15 janvier 2026 a 10:30                                    |
|  Mis a jour le 20 mars 2026 a 14:15                                 |
+---------------------------------------------------------------------+

Menu [...] :
  - Modifier (ouvre dialog edition BO definition)
  - Dupliquer (ouvre dialog creation pre-remplie)
  - Archives (N) -> page instances archivees
```

### Instances archivees

```
+---------------------------------------------------------------------+
|  Instances archivees -- Incident      [<- Retour detail]             |
+---------------------------------------------------------------------+
|  [Rechercher par identifiant...]                                     |
+---------------------------------------------------------------------+
|  Identifiant | Entite   | Archive le   | Actions                    |
|--------------|----------|--------------|----------------------------|
|  INC-003     | Marseille| 10/03/2026   | [Restaurer]                |
+---------------------------------------------------------------------+
```

Colonnes : Identifiant (font-mono), Entite, Archive le (format `dd/MM/yyyy`), Action restaurer.

### Dialog creation instance

Le dialog affiche les champs systeme (EO, Nom) puis tous les champs custom tries par `display_order`. Le rendu du champ depend du `field_type` (texte, nombre, date, select, multiselect, checkbox, email, url, phone, textarea, datetime).

```
+-- Dialog (modal-width, max-h 85vh) ----------------------+
|  Ajouter un element                                       |
|                                                           |
|  Entite organisationnelle *                               |
|  [Selectionner une entite...              v]              |
|    Paris (PAR)                                            |
|    Lyon (LYO)                                             |
|                                                           |
|  Nom *                                                    |
|  [____________________________________]                   |
|                                                           |
|  --- Champs custom (scrollable) ---                       |
|                                                           |
|  Priorite *                        (type: select)         |
|  [Selectionner...                     v]                  |
|    (options issues de la liste)                           |
|                                                           |
|  Description                       (type: textarea)       |
|  +------------------------------------+                   |
|  |                                    |                   |
|  +------------------------------------+                   |
|  Aide pour les utilisateurs                               |
|                                                           |
|  Date signalement                  (type: date)           |
|  [____ / ____ / ________]                                 |
|                                                           |
|  Montant                           (type: number)         |
|  [_______________]                                        |
|                                                           |
|  Accepte les CGU                   (type: checkbox)       |
|  [x] Description du champ                                 |
|                                                           |
|  Tags *                            (type: multiselect)    |
|  [x] Option A                                             |
|  [ ] Option B                                             |
|  [x] Option C                                             |
|                                                           |
|  [Annuler]                         [Creer]                |
+-----------------------------------------------------------+
```

### Page historique BO

```
+---------------------------------------------------------------------+
|  [<-]  Historique -- Incident                  [Exporter CSV ->]     |
+---------------------------------------------------------------------+
|  [Rechercher par instance, nom ou champ...]                          |
+---------------------------------------------------------------------+
|  Date          | Instance | Nom     | Action         | Champ  | Avant   | Apres   | Par          |
|---------------|----------|---------|----------------|--------|---------|---------|--------------|
|  15 jan 10:30 | INC-001  | Titre1  | [+] Nvelle inst|  --   | --      | --      | Alice B.     |
|  14 jan 09:00 | INC-002  | Titre2  | [~] Modification| Statut| Ouvert  | Ferme   | Charles D.   |
|  13 jan 14:00 | INC-001  | Titre1  | [x] Suppression| Desc  | "Ancien"| --      | Bob C.       |
+---------------------------------------------------------------------+
|  < 1/3 >                                              45 resultats   |
+---------------------------------------------------------------------+

Etat vide :
+---------------------------------------------------------------------+
|  [icon History]                                                      |
|  Aucun historique de modification                                    |
+---------------------------------------------------------------------+
```

Actions affichees avec Badge : "Nouvelle instance" (default), "Valeur initiale" (default), "Modification" (secondary), "Suppression" (destructive). Le nom de l'auteur est cliquable et ouvre un detail utilisateur.

## Regles metier

- **Colonnes dynamiques** : les colonnes du tableau d'instances sont generees a partir des field definitions du BO. Les colonnes "Type campagne" et "Campagne" s'affichent uniquement si au moins une instance les utilise (metadata de la definition, pas iteration front).
- **Formules calculees** : les champs de type `calculated` doivent etre evalues cote **serveur**, pas cote front (coherence des resultats, securite).
- **Recherche** : recherche serveur sur toutes les colonnes visibles (pas de recherche front limitee a la page courante).
- **Pagination** : pagination serveur obligatoire.
- **Archivage definition** : doit mentionner l'impact sur les N instances associees (confirmation explicite).
- **Archivage instance** : soft-delete (`is_active = false`).
- **`created_by_user_id`** : extrait du JWT cote serveur, jamais envoye par le client.
- **`reference_number`** : genere cote serveur (auto-increment ou pattern configurable).
- **Validation** : champs obligatoires (`is_required`) valides cote front ET serveur.
- **Export CSV historique** : doit etre un endpoint serveur pour exporter toutes les donnees (pas seulement la page courante).

## Endpoints API (a construire)

| Methode | Route | Description | Notes |
|---|---|---|---|
| `GET` | `/api/business-object-definitions/:id` | Detail definition | Inclut metadata (has_campaign_type, etc.) |
| `GET` | `/api/field-definitions?definition_id=X&is_active=true` | Champs de la definition | Filtre serveur |
| `GET` | `/api/business-objects?definition_id=X&page=Y&pageSize=Z&is_active=true` | Instances paginées | Recherche serveur incluse |
| `GET` | `/api/business-objects?definition_id=X&is_active=false` | Instances archivees | |
| `POST` | `/api/business-objects` | Creer une instance | `created_by_user_id` depuis JWT, `reference_number` genere serveur |
| `PATCH` | `/api/business-objects/:id` | Modifier / archiver / restaurer | |
| `GET` | `/api/business-objects/definitions/:id/audit?page=Y` | Historique pagine | |
| `GET` | `/api/business-objects/definitions/:id/audit/export` | Export CSV complet | Endpoint serveur |
| `GET` | `/api/clients/:clientId/lists/:id/values` | Labels liste pour select/multiselect | |

## Comportements attendus

- **Loading** : skeleton/spinner pendant le chargement de la definition, des champs et des instances
- **Erreurs** : toast d'erreur si echec API (creation instance, archivage, restauration)
- **Etat vide** : message explicite si aucune instance
- **Breadcrumb** : affiche le nom du BO dans la navigation
- **Validation front** : bouton "Creer" desactive tant que Nom ou EO sont vides ; toast listant les champs obligatoires manquants
- **Permissions** : verifier que l'integrateur a acces au client et au BO

## Points d'attention backend

- `created_by_user_id` : extraire du JWT, ne jamais accepter du body client
- `reference_number` : generer cote serveur avec pattern configurable (auto-increment, prefixe, etc.)
- Formules calculees : evaluer cote serveur pour coherence
- Recherche full-text sur toutes les colonnes visibles (pas juste les colonnes de la page front)
- Historique : audit log automatique a chaque creation/modification/archivage d'instance
- Export CSV : endpoint dedie qui genere le CSV complet (pas de limite de pagination)
