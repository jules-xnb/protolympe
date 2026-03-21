# Spec : Modules -- Liste (Navigation)

## Maquettes

### Page principale

```
+---------------------------------------------------------------------+
|  Navigation                                                          |
|  Configurez la structure de navigation de l'application utilisateur  |
|                            [Tout deplier] [Tout replier] [Ajouter v]|
+---------------------------------------------------------------------+
|                                                                      |
|  +-- [icon] Gestion des risques          [configurer] [...]         |
|  |   Module: collecte_valeur                                        |
|  |                                                                   |
|  +-- [icon] Dashboard                                                |
|  |   Vue personnalisee                                               |
|  |                                                                   |
|  +-- [folder] Administration                                        |
|  |   |-- [icon] Utilisateurs                                        |
|  |   |-- [icon] Entites                                             |
|                                                                      |
+---------------------------------------------------------------------+

Menu [Ajouter v] :
  - Nouveau groupe (dossier dans l'arbre)
  - Nouvelle vue (page personnalisee)
  - Nouveau module (ouvre dialog selection module)
```

### Dialog ajout module

```
+-- Dialog (max-w lg) -----------------------------------------+
|  Ajouter un module                                            |
|                                                               |
|  +----------------------------------------------------------+|
|  | [icon] Collecte de valeur                                 ||
|  | Gestion de la collecte et validation de donnees           ||
|  +----------------------------------------------------------+|
|                                                               |
|  +----------------------------------------------------------+|
|  | [icon] Gestion des risques                                ||
|  | Identification et suivi des risques                       ||
|  +----------------------------------------------------------+|
|                                                               |
|  +----------------------------------------------------------+|
|  | [loader] Module en cours d'activation...                  ||
|  | (etat loading sur le module clique)                       ||
|  +----------------------------------------------------------+|
|                                                               |
|  (si tous actives :)                                          |
|  Tous les modules disponibles sont deja actives pour          |
|  ce client.                                                   |
+---------------------------------------------------------------+
```

Chaque entree est un bouton. Cliquer :
1. Active le module (`POST /api/clients/:clientId/modules`)
2. Cree une entree de navigation (`POST /api/nav-configs`)
3. Ferme le dialog

Les modules deja actives sont filtres et ne s'affichent pas.

## Regles metier

- **Catalogue modules** : les modules disponibles sont definis dans un catalogue (`MODULE_CATALOG`). Seuls les modules non encore actives pour le client sont proposes.
- **Activation** : active le module + cree l'entree de navigation en une seule operation
- **Arbre navigation** : structure hierarchique (groupes, vues, modules) avec drag & drop pour reordonnancer
- **`display_order`** : calculer le prochain ordre d'affichage (pas forcer a 0)

## Endpoints API (existants)

| Methode | Route | Description | Statut |
|---|---|---|---|
| `GET` | `/api/clients/:clientId/modules` | Modules actifs du client | **Fonctionnel** |
| `POST` | `/api/clients/:clientId/modules` | Active un module | **Fonctionnel** |
| `POST` | `/api/nav-configs` | Cree une entree navigation | **Fonctionnel** |

## Comportements attendus

- **Loading** : etat loading sur le bouton du module clique dans le dialog
- **Erreurs** : toast d'erreur si l'activation ou la creation de nav config echoue
- **Etat vide** : message si l'arbre de navigation est vide
- **Permissions** : verifier que l'integrateur a acces au client

## Points d'attention backend

- **Atomicite** : l'activation du module et la creation de la nav config devraient etre une operation atomique cote serveur. Si le second echoue, le module est active mais invisible dans la nav.
- **`display_order`** : calculer automatiquement le prochain ordre (`max(display_order) + 1`) au lieu de forcer a 0
