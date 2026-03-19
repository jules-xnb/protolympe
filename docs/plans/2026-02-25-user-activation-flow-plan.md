# User Activation Flow - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 2-step user creation flow: create (inactive) → configure profiles → activate (sends invite email).

**Architecture:** Add `activated_at` column to `user_client_memberships`. New users start with `is_active=false`. Toggle is disabled until profiles exist. First activation triggers `supabase.auth.admin.inviteUserByEmail()` via a new edge function. Status badges reflect the combined state (is_active + activated_at + profiles count).

**Tech Stack:** React, TypeScript, Supabase (Postgres migration + Edge Function), TanStack Query, shadcn/ui

---

### Task 1: Database migration — add `activated_at` column

**Files:**
- Create: `supabase/migrations/<timestamp>_add_activated_at.sql`

**Step 1: Create the migration file**

```sql
-- Add activated_at column to track first activation
ALTER TABLE public.user_client_memberships
ADD COLUMN activated_at timestamp with time zone DEFAULT NULL;

-- Backfill: existing active users are considered already activated
UPDATE public.user_client_memberships
SET activated_at = updated_at
WHERE is_active = true;
```

**Step 2: Apply the migration**

Run: `npx supabase migration up` (or via Supabase dashboard)

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add activated_at column to user_client_memberships"
```

---

### Task 2: Edge function — `activate-user`

**Files:**
- Create: `supabase/functions/activate-user/index.ts`

This function:
1. Verifies the caller is authorized (admin_delta check, same as `create-integrator-account`)
2. Calls `supabase.auth.admin.inviteUserByEmail(email)` to send the magic link
3. Updates the membership: `is_active = true`, `activated_at = now()`

**Step 1: Create the edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !requestingUser) throw new Error('Unauthorized');

    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin_delta', { _user_id: requestingUser.id });
    if (!isAdmin) throw new Error('Only admin_delta can activate users');

    const { membershipId, email } = await req.json();
    if (!membershipId || !email) throw new Error('membershipId and email are required');

    // Send invite email via Supabase Auth
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (inviteError) {
      console.error('Invite error:', inviteError);
      // If user already exists in auth, generate a magic link instead
      if (inviteError.message?.includes('already been registered')) {
        const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });
        if (linkError) throw new Error(`Failed to send activation email: ${linkError.message}`);
      } else {
        throw new Error(`Failed to send invite: ${inviteError.message}`);
      }
    }

    // Update membership
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('user_client_memberships')
      .update({ is_active: true, activated_at: now, updated_at: now })
      .eq('id', membershipId);

    if (updateError) throw new Error(`Failed to update membership: ${updateError.message}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Utilisateur activé et email envoyé' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in activate-user:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/activate-user/
git commit -m "feat: add activate-user edge function with invite email"
```

---

### Task 3: Update `useClientUsers` hook — fetch `activated_at`, change default `is_active`

**Files:**
- Modify: `src/hooks/useClientUsers.ts`

**Step 1: Update `ClientUser` interface (line 5-26)**

Add `activated_at` field:

```typescript
export interface ClientUser {
  id: string;
  user_id: string;
  client_id: string;
  is_active: boolean;
  activated_at: string | null;  // NEW
  created_at: string;
  updated_at: string;
  // ... rest unchanged
}
```

**Step 2: Update `useClientUsers` query to fetch `activated_at` (line 39)**

Change the select to include `activated_at`:

```typescript
.select('id, user_id, client_id, is_active, activated_at, created_at, updated_at')
```

**Step 3: Update `useInviteClientUser` — set `is_active: false` (line 162)**

Change from:

```typescript
is_active: true,
```

To:

```typescript
is_active: false,
```

**Step 4: Add `useActivateUser` hook (after `useUpdateClientUserStatus`, ~line 195)**

```typescript
export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, email }: { membershipId: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke('activate-user', {
        body: { membershipId, email },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-users'] });
    },
  });
}
```

**Step 5: Commit**

```bash
git add src/hooks/useClientUsers.ts
git commit -m "feat: add activated_at to ClientUser, new users start inactive"
```

---

### Task 4: Update `UsersPage` — status badges

**Files:**
- Modify: `src/pages/admin/UsersPage.tsx` (lines 200-208)

**Step 1: Replace the status column badge logic**

Current code (lines 200-208):

```tsx
{
  accessorKey: 'is_active',
  header: 'Statut',
  cell: ({ row }) => (
    <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
      {row.original.is_active ? 'Actif' : 'Inactif'}
    </Badge>
  ),
},
```

Replace with:

```tsx
{
  accessorKey: 'is_active',
  header: 'Statut',
  cell: ({ row }) => {
    const { is_active, activated_at, user_profiles_count } = row.original;
    if (is_active) {
      return <Badge variant="default">Actif</Badge>;
    }
    if (!activated_at && user_profiles_count === 0) {
      return <Badge variant="outline">À configurer</Badge>;
    }
    if (!activated_at && user_profiles_count > 0) {
      return <Badge variant="secondary" className="border-green-500/50 text-green-700">Prêt à activer</Badge>;
    }
    return <Badge variant="secondary">Inactif</Badge>;
  },
},
```

**Step 2: Commit**

```bash
git add src/pages/admin/UsersPage.tsx
git commit -m "feat: status badges reflect activation workflow state"
```

---

### Task 5: Update `UserDetailsDrawer` — activation toggle with guard + invite

**Files:**
- Modify: `src/components/admin/users/UserDetailsDrawer.tsx`

**Step 1: Import the new hook (line 21)**

Change:

```typescript
import { type ClientUser, useUpdateClientUserStatus } from '@/hooks/useClientUsers';
```

To:

```typescript
import { type ClientUser, useUpdateClientUserStatus, useActivateUser } from '@/hooks/useClientUsers';
```

**Step 2: Add the hook instance (after line 148)**

```typescript
const activateUserMutation = useActivateUser();
```

**Step 3: Update `handleToggleStatus` (lines 182-192)**

Replace with:

```typescript
const handleToggleStatus = async () => {
  try {
    // First activation: call edge function to send invite email
    if (!user.is_active && !user.activated_at) {
      await activateUserMutation.mutateAsync({
        membershipId: user.id,
        email: user.profiles?.email || '',
      });
      toast.success('Utilisateur activé — un email d\'invitation a été envoyé');
      return;
    }
    // Subsequent toggles: just update is_active
    await updateStatusMutation.mutateAsync({
      membershipId: user.id,
      isActive: !user.is_active,
    });
    toast.success(user.is_active ? 'Utilisateur désactivé' : 'Utilisateur réactivé');
  } catch (error: any) {
    toast.error(error.message || 'Erreur lors de la mise à jour');
  }
};
```

**Step 4: Update the status badge in drawer (lines 242-244)**

Replace:

```tsx
<Badge variant={user.is_active ? 'default' : 'secondary'}>
  {user.is_active ? 'Actif' : 'Inactif'}
</Badge>
```

With:

```tsx
{(() => {
  if (user.is_active) return <Badge variant="default">Actif</Badge>;
  if (!user.activated_at && profiles.length === 0) return <Badge variant="outline">À configurer</Badge>;
  if (!user.activated_at && profiles.length > 0) return <Badge variant="secondary" className="border-green-500/50 text-green-700">Prêt à activer</Badge>;
  return <Badge variant="secondary">Inactif</Badge>;
})()}
```

**Step 5: Update the toggle — disable if no profiles and never activated (lines 329-341)**

Replace:

```tsx
{/* Status Toggle */}
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label>Compte actif</Label>
    <p className="text-xs text-muted-foreground">
      Les comptes inactifs ne peuvent pas se connecter
    </p>
  </div>
  <Switch
    checked={user.is_active}
    onCheckedChange={handleToggleStatus}
    disabled={updateStatusMutation.isPending}
  />
</div>
```

With:

```tsx
{/* Status Toggle */}
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label>Compte actif</Label>
    <p className="text-xs text-muted-foreground">
      {hasNoProfiles && !user.activated_at
        ? 'Ajoutez au moins un profil avant d\'activer'
        : 'Les comptes inactifs ne peuvent pas se connecter'}
    </p>
  </div>
  <Switch
    checked={user.is_active}
    onCheckedChange={handleToggleStatus}
    disabled={
      updateStatusMutation.isPending ||
      activateUserMutation.isPending ||
      (hasNoProfiles && !user.activated_at)
    }
  />
</div>
```

**Step 6: Commit**

```bash
git add src/components/admin/users/UserDetailsDrawer.tsx
git commit -m "feat: activation toggle with profile guard and invite email"
```

---

### Task 6: Update `InviteUserDialog` — change success toast

**Files:**
- Modify: `src/components/admin/users/InviteUserDialog.tsx` (line 42)

**Step 1: Update the toast message**

Change:

```typescript
toast.success('Utilisateur invité avec succès');
```

To:

```typescript
toast.success('Utilisateur ajouté — configurez ses profils puis activez-le');
```

**Step 2: Commit**

```bash
git add src/components/admin/users/InviteUserDialog.tsx
git commit -m "feat: update invite toast to mention profile configuration step"
```

---

### Task 7: Verify and test manually

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test the full flow**

1. Go to Users page
2. Invite a new user → should appear with "À configurer" badge
3. Open the drawer → toggle should be disabled with tooltip message
4. Create a profile for the user → badge changes to "Prêt à activer"
5. Toggle activation → should send invite email + show "Actif" badge
6. Deactivate → should show "Inactif" (not "À configurer")
7. Reactivate → should NOT send email again (just toggles is_active)

**Step 3: Final commit if any adjustments**

```bash
git commit -m "fix: adjustments from manual testing"
```
