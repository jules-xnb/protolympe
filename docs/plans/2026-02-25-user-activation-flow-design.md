# Design : Activation en 2 étapes des users

## Contexte

Actuellement, quand on invite un user, il est créé comme membre actif immédiatement. On veut séparer le flux en deux étapes : création puis activation, avec configuration des profils entre les deux.

## Flux

```
Créer user (email+nom) → is_active=false
         ↓
Configurer profils (EOs + rôles)
         ↓
Activer (toggle) → is_active=true + supabase.auth.admin.inviteUserByEmail()
```

## Changements

### 1. Création (InviteUserDialog)

Le dialog reste identique. Seul changement : `is_active` démarre à `false` dans le `user_client_membership` (au lieu de `true`).

### 2. Liste users (UsersPage)

Le badge de statut reflète l'état combiné :

| is_active | activated_at | profils | Badge |
|-----------|-------------|---------|-------|
| false | null | 0 | "À configurer" |
| false | null | ≥1 | "Prêt à activer" |
| true | timestamp | ≥1 | "Actif" |
| false | timestamp | any | "Inactif" |

### 3. Toggle activation (UserDetailsDrawer)

Le toggle `is_active` existant :
- **Grisé/désactivé** si l'user n'a aucun profil → tooltip "Ajoutez au moins un profil avant d'activer"
- Passage `false → true` pour la **première fois** (`activated_at` est null) : appel `supabase.auth.admin.inviteUserByEmail()` qui envoie un magic link
- Réactivation (`activated_at` non null) : pas d'envoi de mail

### 4. Nouveau champ `activated_at`

Ajout sur `user_client_memberships` :
- Type : `timestamp with time zone`, nullable, default null
- `null` = jamais activé (brouillon)
- Timestamp = date de première activation
- Permet de distinguer "jamais activé" de "désactivé après coup"

## Ce qui ne change pas

- `UserProfileFormDialog` (création/édition de profils)
- `UserDetailsDrawer` (structure générale)
- Import/export CSV
- Custom fields
