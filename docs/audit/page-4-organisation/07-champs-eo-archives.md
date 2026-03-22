# Spec : Champs EO archives (`/dashboard/:clientId/entities/fields/archived`)

## Maquettes

```
+---------------------------------------------------------------------------------+
|  <- Retour                                                                       |
|  Champs archives                                                                 |
|  Champs personnalises archives. Restaurez-les pour les rendre disponibles.       |
+---------------------------------------------------------------------------------+
|  [Rechercher un champ archive...]                                                |
+---------------------------------------------------------------------------------+
|  Nom (+ slug)    | Type        | Obligatoire | Actions                           |
|------------------+-------------+-------------+-----------------------------------|
|  Ancien champ    | Texte       | Non         | [Restaurer]                       |
+---------------------------------------------------------------------------------+
```

## Regles metier

- Afficher les champs archives du client selectionne (toujours filtrer par `clientId`)
- Colonnes : Nom (avec slug), Type (avec icone), Obligatoire
- Recherche sur nom/slug
- Bouton "Restaurer" par champ
- Bouton retour vers la page des champs actifs
- Fallback si pas de client selectionne : etat vide standard
- Utiliser des composants visuels coherents (memes badges que la page champs actifs)

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/organizational-entities/fields?client_id=X&is_active=false` | Liste des champs archives |
| PATCH | `/api/organizational-entities/fields/:id` | Restauration (`is_active: true`) |

## Endpoints API (a creer)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| PATCH | `/api/organizational-entities/fields/:id/reactivate` | Endpoint dedie de reactivation avec audit trail (B18) |

## Comportements attendus

- Loading state : skeleton table pendant le chargement
- Gestion d'erreur : toast si la restauration echoue
- Etat vide : message "Aucun champ archive" si la liste est vide
- Etat vide : etat vide standard si pas de client selectionne
- Confirmation avant restauration (optionnel)
- Apres restauration : rafraichir la liste, toast succes

## Points d'attention backend

| # | Severite | Point |
|---|----------|-------|
| B18 | Moyenne | Pas d'endpoint dedie de reactivation. Le PATCH generique est utilise, sans audit trail specifique "restauration". |
