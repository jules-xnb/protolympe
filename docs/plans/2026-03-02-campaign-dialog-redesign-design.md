# Redesign "Lancer une campagne" Dialog

**Date:** 2026-03-02
**Status:** Approved

## Context

The existing `NewCampaignDialog.tsx` has 2 steps: type selection then all-in-one configuration (name + dates + EO tree). The Figma designs split the configuration into 2 distinct steps with a vertical stepper, add EO search/grouping, a table layout with role validation ("Rôle manquant" column), and a warning alert.

## Design

### Step Flow

The dialog has 3 internal steps:

1. **`select_type`** — RadioGroup to pick campaign type. Skipped when `preSelectedTypeId` is set. Unchanged from current implementation.

2. **`informations`** (Figma Step 1) — Vertical stepper shows "1. Informations" (active) and "2. Périmètre" (pending). Form fields: campaign name, start date, end date. Buttons: Annuler / Suivant.

3. **`perimeter`** (Figma Step 2) — Stepper shows step 1 completed (checkmark), step 2 active. Content:
   - Search bar filtering EOs by name/code
   - "Regroupement" Select dropdown listing EO groups for the client; selecting a group pre-selects its members
   - "Sélectionner toutes les filiales" master checkbox
   - Table with hierarchical checkboxes in "Filiales" column and "Rôle manquant" column
   - Warning Alert when selected EOs have missing roles, with "Exporte la liste" button
   - Buttons: Annuler / Lancer la campagne

### Vertical Stepper Component

Simple inline component rendered inside the dialog. Two steps, each with a numbered circle (or checkmark when completed), a label, and a connecting vertical line between them.

### "Rôle manquant" Logic

For the selected workflow's `form` node (respondent step), identify required responder roles from `node_role_permissions` where `can_edit = true`. For each EO, query `user_roles` to check if users with those roles exist for that EO. Display missing role names in the table column.

New hook: `useMissingRoles(workflowId, clientId)` — fetches required roles and user_roles for all EOs, returns a map of `eoId → missingRoleNames[]`.

### Data Dependencies

| Hook | Purpose |
|------|---------|
| `useOrganizationalEntities(clientId)` | Build EO tree (existing) |
| `useEoGroups(clientId)` | Populate "Regroupement" dropdown (existing) |
| `useEoGroupMembers(groupId)` | Pre-select members when group chosen (existing) |
| `useMissingRoles(workflowId, clientId)` | Role validation per EO (new) |

### EO Table Layout

Replaces the current checkbox tree. Uses a flat table rendered with indentation to show hierarchy:

| Filiales | Rôle manquant |
|----------|---------------|
| ▸ ☐ Parent Corp | — |
| &nbsp;&nbsp;☑ Filiale A | Répondant |
| &nbsp;&nbsp;☐ Filiale B | — |

Expandable rows with chevron toggles for parents. Checkboxes cascade: checking a parent checks all visible children.

### Warning Alert

Shown when any selected EO has missing roles. Contains:
- Icon + "Attention, rôle manquant" text
- "Exporte la liste" button that generates a CSV of EOs with missing roles

### Files Modified

- `src/components/user/views/NewCampaignDialog.tsx` — Full refactor with 3-step flow, stepper, table layout
- `src/hooks/useMissingRoles.ts` — New hook for role validation
- No new UI components needed (stepper is inline in the dialog)
