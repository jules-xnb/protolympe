# Spec : Business Objects -- Liste

## Maquettes

### Liste actifs

```
+---------------------------------------------------------------------+
|  Objets Metiers                            [Archives] [Nouvel OM +]  |
|  Definissez les types d'objets metiers...                            |
+---------------------------------------------------------------------+
|  [Rechercher par nom ou description...]                              |
+---------------------------------------------------------------------+
|  Nom             | Description   | Champs | Instances | Actions      |
|------------------|---------------|--------|-----------|--------------|
|  Incident        | Gestion des.. |  5     |  42       |  [...]       |
|    incident      |               |        |           |              |
|------------------|---------------|--------|-----------|--------------|
|  Demande         | Demandes div  |  3     |  12       |  [...]       |
|    demande       |               |        |           |              |
+---------------------------------------------------------------------+
```

Menu [...] par ligne :
- Dupliquer
- Archiver (destructive)

### Liste archives

```
+---------------------------------------------------------------------+
|  Archives -- Objets Metiers          [<- Retour objets metiers actifs]|
|  Objets metiers archives. Restaurez-les...                           |
+---------------------------------------------------------------------+
|  [Rechercher dans les archives...]                                   |
+---------------------------------------------------------------------+
|  Nom             | Description   | Archive le  | Actions             |
|------------------|---------------|-------------|---------------------|
|  OldObj          | ...           | 15 jan 2026 | [Restaurer]         |
+---------------------------------------------------------------------+
```

Colonnes : Nom (nom + slug mono), Description, Archive le (format `dd MMM yyyy`), Action restaurer.

### Dialog creation / edition / duplication

Le titre et le bouton changent selon le mode (creation, edition, duplication).

```
+-- Dialog (max-w 500px) ---------------------------------+
|  Nouvel objet metier                                     |
|  (ou "Modifier l'objet metier" / "Dupliquer l'OM")      |
|                                                          |
|  Nom *                                                   |
|  [____________________________________]                  |
|                                                          |
|  Description                                             |
|  +------------------------------------+                  |
|  | Description de l'objet metier...   |                  |
|  +------------------------------------+                  |
|                                                          |
|  [Annuler]                         [Creer]               |
|  (ou [Mettre a jour] / [Dupliquer])                      |
+----------------------------------------------------------+
```

Mode duplication : le nom est pre-rempli avec `"{nom} (copie)"` et la description est copiee. A la soumission, les champs du BO source sont dupliques vers le nouveau BO.

### Dialog archivage

```
+-- Dialog ------------------------------------------------+
|  Archiver l'objet metier                                 |
|                                                          |
|  Etes-vous sur de vouloir archiver "Incident" ?          |
|  Il pourra etre restaure depuis les archives.            |
|                                                          |
|  [Annuler]                    [Archiver]                 |
+----------------------------------------------------------+
```

## Regles metier

- **Recherche** : filtrage par nom ou description
- **Archivage** : soft-delete (`is_active = false`), jamais de suppression physique
- **Restauration** : remet `is_active = true`
- **Duplication** : copie le BO + tous ses champs (field definitions)
- **Slug** : genere et valide cote serveur (unicite garantie)
- **Filtrage actifs/archives** : filtre cote serveur via query param (`is_active=true|false`), ne pas charger toutes les definitions

## Endpoints API (a construire)

| Methode | Route | Description | Notes |
|---|---|---|---|
| `GET` | `/api/business-object-definitions?client_id=X&is_active=true` | Liste definitions actives | Filtrage serveur par `is_active` |
| `GET` | `/api/business-object-definitions?client_id=X&is_active=false` | Liste definitions archivees | Idem |
| `POST` | `/api/business-object-definitions` | Creer une definition | Slug genere cote serveur |
| `PATCH` | `/api/business-object-definitions/:id` | Modifier / archiver / restaurer | `{is_active: false}` pour archiver |

## Comportements attendus

- **Loading** : skeleton/spinner pendant le chargement de la liste
- **Erreurs** : toast d'erreur si echec API (creation, archivage, restauration, duplication)
- **Etat vide** : message explicite si aucun BO defini
- **Validation** : nom obligatoire cote front ET serveur
- **Permissions** : verifier que l'integrateur a acces au client (auth + client_id)
- **Pagination** : a implementer si le nombre de BO definitions devient important

## Points d'attention backend

- Generer et valider l'unicite du slug cote serveur
- Filtre `is_active` en query param (ne pas renvoyer toutes les definitions)
- Auth + verification acces client sur chaque route
- Validation zod des entrees cote serveur
- Duplication : operation atomique (transaction) couvrant la definition + tous les field definitions
