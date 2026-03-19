# Refonte Collecte — Formulaires dans les Workflows

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Déplacer la configuration des formulaires de collecte du bloc builder vers l'éditeur de workflows, avec sélection du BO par workflow et config champs par noeud.

**Architecture:** On étend l'éditeur de workflow ReactFlow existant. Le workflow porte le `bo_definition_id`. Chaque noeud configure ses champs via la table `node_fields`. Le bloc `survey_creator` est simplifié en sélecteur de workflow + options d'affichage. Les anciens workflows/campagnes sont purgés.

**Tech Stack:** React 18, TypeScript, Supabase (Postgres), TanStack Query, ReactFlow, Shadcn/ui, Tailwind

---

## Task 1 : Migration DB — Ajouter `bo_definition_id` sur workflows

**Files:**
- Create: `supabase/migrations/<timestamp>_add_bo_definition_to_workflows.sql`

**Step 1: Écrire la migration**

```sql
-- Add bo_definition_id to workflows table
ALTER TABLE workflows
ADD COLUMN bo_definition_id UUID REFERENCES business_object_definitions(id);

-- Clean up existing workflows, campaigns, surveys (fresh start)
DELETE FROM survey_field_comments;
DELETE FROM survey_responses;
DELETE FROM survey_campaign_targets;
DELETE FROM survey_campaigns;
DELETE FROM surveys;
DELETE FROM node_role_permissions;
DELETE FROM node_fields;
DELETE FROM workflow_transitions;
DELETE FROM workflow_nodes;
DELETE FROM workflows;
```

**Step 2: Appliquer la migration**

Run: `npx supabase migration up` (ou via le MCP Supabase `apply_migration`)

**Step 3: Regénérer les types TypeScript**

Run: `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`

**Step 4: Commit**

```bash
git add supabase/migrations/ src/integrations/supabase/types.ts
git commit -m "feat: add bo_definition_id to workflows, purge old data"
```

---

## Task 2 : Hook useWorkflows — Supporter bo_definition_id

**Files:**
- Modify: `src/hooks/useWorkflows.ts`

**Step 1: Mettre à jour useCreateWorkflow pour accepter bo_definition_id**

Dans `useCreateWorkflow()` (ligne ~121), le type `TablesInsert<'workflows'>` inclura automatiquement `bo_definition_id` après la regénération des types. Rien à changer dans le hook lui-même — le type Supabase s'en charge.

Vérifier que le type régénéré inclut bien `bo_definition_id?: string | null` dans `TablesInsert<'workflows'>`.

**Step 2: Mettre à jour useWorkflowWithNodes pour retourner bo_definition_id**

Le `select('*')` existant (ligne ~87) retournera déjà le nouveau champ. Pas de changement nécessaire.

**Step 3: Commit**

```bash
git commit --allow-empty -m "chore: verify workflow types include bo_definition_id"
```

---

## Task 3 : WorkflowFormDialog — Sélecteur de BO

**Files:**
- Modify: `src/components/admin/workflows/WorkflowFormDialog.tsx`

**Step 1: Ajouter le state et le hook BO**

Après les states existants (ligne ~44), ajouter :

```tsx
import { useBusinessObjectDefinitions } from '@/hooks/useBusinessObjectDefinitions';

// Inside component, after existing states:
const [boDefinitionId, setBoDefinitionId] = useState<string | null>(null);
const { data: boDefinitions = [] } = useBusinessObjectDefinitions();
```

**Step 2: Ajouter le sélecteur dans le formulaire**

Après le champ description (dans le JSX), ajouter un `Select` pour le BO :

```tsx
<div className="space-y-2">
  <Label htmlFor="bo-definition">Objet métier</Label>
  <Select
    value={boDefinitionId || ''}
    onValueChange={(val) => setBoDefinitionId(val || null)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Sélectionner un objet métier" />
    </SelectTrigger>
    <SelectContent>
      {boDefinitions.map((bo) => (
        <SelectItem key={bo.id} value={bo.id}>
          {bo.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Step 3: Passer bo_definition_id à la mutation create**

Dans le handler de soumission (ligne ~74), ajouter `bo_definition_id: boDefinitionId` à l'objet passé à `createMutation.mutateAsync()`.

**Step 4: Initialiser le state en mode édition**

Dans le `useEffect` qui pré-remplit les champs pour l'édition (si existant), ajouter :
```tsx
setBoDefinitionId(item?.bo_definition_id ?? null);
```

**Step 5: Commit**

```bash
git add src/components/admin/workflows/WorkflowFormDialog.tsx
git commit -m "feat: add BO selector to workflow creation form"
```

---

## Task 4 : WorkflowDetailPage — Afficher le BO dans le header

**Files:**
- Modify: `src/pages/admin/WorkflowDetailPage.tsx`

**Step 1: Charger le BO**

Ajouter le hook pour récupérer le BO lié au workflow :

```tsx
import { useBusinessObjectDefinition } from '@/hooks/useBusinessObjectDefinitions';

// After workflow data is loaded:
const boDefId = bridge.workflow?.bo_definition_id;
const { data: boDefinition } = useBusinessObjectDefinition(boDefId);
```

Note : vérifier que `useBusinessObjectDefinition(id)` existe dans le hook (ligne ~55 de `useBusinessObjectDefinitions.ts`). Sinon, ajouter un query simple `select('*').eq('id', id).maybeSingle()`.

**Step 2: Afficher dans le header**

Dans la section header (ligne ~65-94), après le badge de type, ajouter :

```tsx
{boDefinition && (
  <Badge variant="outline" className="text-xs">
    {boDefinition.name}
  </Badge>
)}
```

**Step 3: Passer le boDefinitionId à WorkflowGraphEditor**

Ajouter une nouvelle prop `boDefinitionId` au composant :

```tsx
<WorkflowGraphEditor
  // ... existing props
  boDefinitionId={boDefId}
/>
```

**Step 4: Commit**

```bash
git add src/pages/admin/WorkflowDetailPage.tsx
git commit -m "feat: display BO in workflow detail header, pass to editor"
```

---

## Task 5 : Hook useNodeFields — CRUD pour node_fields

**Files:**
- Create: `src/hooks/useNodeFields.ts`

**Step 1: Créer le hook**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NodeFieldConfig {
  id: string;
  node_id: string;
  field_definition_id: string;
  is_visible: boolean;
  is_editable: boolean;
  is_required_override: boolean | null;
  display_order: number;
  visibility_condition: any;
  settings: {
    allow_comment?: boolean;
    show_previous_value?: boolean;
    custom_label?: string;
    section_id?: string;
  };
}

export function useNodeFields(nodeId: string | null) {
  return useQuery({
    queryKey: ['node_fields', nodeId],
    queryFn: async () => {
      if (!nodeId) return [];
      const { data, error } = await supabase
        .from('node_fields')
        .select('*')
        .eq('node_id', nodeId)
        .order('display_order');
      if (error) throw error;
      return (data || []) as NodeFieldConfig[];
    },
    enabled: !!nodeId,
  });
}

export function useSaveNodeFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nodeId,
      fields,
    }: {
      nodeId: string;
      fields: Omit<NodeFieldConfig, 'id'>[];
    }) => {
      // Delete existing fields for this node
      await supabase.from('node_fields').delete().eq('node_id', nodeId);

      if (fields.length === 0) return [];

      // Insert new fields
      const { data, error } = await supabase
        .from('node_fields')
        .insert(fields.map((f) => ({ ...f, node_id: nodeId })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { nodeId }) => {
      queryClient.invalidateQueries({ queryKey: ['node_fields', nodeId] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/useNodeFields.ts
git commit -m "feat: add useNodeFields hook for node field CRUD"
```

---

## Task 6 : Composant NodeFieldsEditor — Config formulaire par noeud

**Files:**
- Create: `src/components/admin/workflows/NodeFieldsEditor.tsx`

**Step 1: Créer le composant**

Ce composant reçoit le `boDefinitionId` et le `nodeId`, charge les champs du BO et les `node_fields` existants, et permet de configurer chaque champ.

```tsx
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { useNodeFields, useSaveNodeFields, type NodeFieldConfig } from '@/hooks/useNodeFields';

interface NodeFieldsEditorProps {
  nodeId: string;
  boDefinitionId: string;
}

export function NodeFieldsEditor({ nodeId, boDefinitionId }: NodeFieldsEditorProps) {
  const { data: fieldDefs = [] } = useFieldDefinitions(boDefinitionId);
  const { data: nodeFields = [] } = useNodeFields(nodeId);
  const saveMutation = useSaveNodeFields();

  // ... state and handlers for:
  // - Per-field visibility toggle (visible/readonly/hidden)
  // - Per-field required checkbox
  // - Per-field allow_comment checkbox
  // - Per-field show_previous_value checkbox
  // - Per-field custom_label input
  // - "+ Nouveau champ" button that opens FieldDefinitionFormDialog
  // - Save handler that calls saveMutation

  // Render: list of BO fields with config toggles per field
}
```

L'UI doit afficher :
- Chaque champ du BO en ligne avec :
  - Nom du champ + type (badge)
  - Select visibilité : `visible` / `readonly` / `hidden`
  - Checkbox `Obligatoire`
  - Checkbox `Commentaires`
  - Checkbox `Valeur N-1`
  - Input `Label custom` (optionnel, expandable)
- Bouton `+ Nouveau champ` en bas (ouvre `FieldDefinitionFormDialog` existant)

Le composant maintient un state local `fieldConfigs: Map<string, NodeFieldConfig>` initialisé depuis `nodeFields`, modifié par les toggles, et sauvegardé on blur / on explicit save.

**Step 2: Commit**

```bash
git add src/components/admin/workflows/NodeFieldsEditor.tsx
git commit -m "feat: add NodeFieldsEditor component for per-node field config"
```

---

## Task 7 : WorkflowGraphEditor — Onglet Formulaire dans le panneau noeud

**Files:**
- Modify: `src/components/builder/page-builder/WorkflowGraphEditor.tsx`

**Step 1: Ajouter la prop boDefinitionId**

Dans l'interface des props (ligne ~35), ajouter :

```tsx
boDefinitionId?: string | null;
```

**Step 2: Ajouter des onglets au panneau latéral**

Dans le side panel (lignes ~886-1041), remplacer le contenu direct par un système d'onglets (Shadcn `Tabs`) :

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NodeFieldsEditor } from '@/components/admin/workflows/NodeFieldsEditor';

// Inside the side panel:
<Tabs defaultValue="config">
  <TabsList className="w-full">
    <TabsTrigger value="config" className="flex-1">Configuration</TabsTrigger>
    <TabsTrigger value="fields" className="flex-1">Formulaire</TabsTrigger>
  </TabsList>
  <TabsContent value="config">
    {/* Existing content: step name, validator roles, viewer roles */}
  </TabsContent>
  <TabsContent value="fields">
    {boDefinitionId && selectedStep ? (
      <NodeFieldsEditor
        nodeId={selectedStep.id}
        boDefinitionId={boDefinitionId}
      />
    ) : (
      <p className="text-sm text-muted-foreground p-4">
        Sélectionnez un objet métier pour configurer les champs.
      </p>
    )}
  </TabsContent>
</Tabs>
```

**Step 3: Mapper le selectedStep.id au vrai node_id DB**

Le `selectedStep.id` dans l'éditeur est un UUID local. Il faut vérifier que `useWorkflowEditorBridge` persiste bien le node avec ce même ID, ou maintenir un mapping `editorId → dbNodeId`. Consulter `useWorkflowEditorBridge.ts` lignes 73-162 pour le mapping.

**Step 4: Commit**

```bash
git add src/components/builder/page-builder/WorkflowGraphEditor.tsx
git commit -m "feat: add Formulaire tab to workflow node panel"
```

---

## Task 8 : Simplifier SurveyCreatorConfigPanel

**Files:**
- Modify: `src/components/builder/page-builder/SurveyCreatorConfigPanel.tsx`
- Modify: `src/components/builder/page-builder/types.ts`

**Step 1: Mettre à jour SurveyCreatorBlockConfig**

Dans `types.ts` (ligne ~286), simplifier l'interface :

```tsx
export interface SurveyCreatorBlockConfig {
  full_page?: boolean;
  workflow_id?: string;
  // Options d'affichage
  show_all_surveys?: boolean;
  show_my_surveys?: boolean;
  columns_visible?: string[];
  group_by_status?: boolean;
}
```

Supprimer `campaign_types?: CampaignTypeConfig[]` et les autres champs legacy.

**Step 2: Réécrire SurveyCreatorConfigPanel**

Remplacer le contenu du panel par :

1. **Sélecteur de workflow** : dropdown des workflows publiés (`useWorkflows` filtré sur `is_published`)
2. **Options d'affichage** : checkboxes pour colonnes, regroupement, filtres

Supprimer tout le code relatif aux campaign types, champs, sections, étapes de validation.

**Step 3: Supprimer les composants devenus inutiles**

- Supprimer `CampaignTypeFormDialog` (si c'est un fichier séparé)
- Supprimer `CampaignTypeFieldsEditor` (si c'est un fichier séparé)
- Rechercher les imports de ces composants et les nettoyer

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: simplify survey_creator block to workflow selector + display options"
```

---

## Task 9 : Simplifier SurveyResponsesBlockConfig

**Files:**
- Modify: `src/components/builder/page-builder/types.ts`
- Modify: `src/components/builder/page-builder/SurveyResponsesConfigPanel.tsx`

**Step 1: Mettre à jour le type**

Remplacer `source_view_config_id` par `workflow_id` :

```tsx
export interface SurveyResponsesBlockConfig {
  full_page?: boolean;
  workflow_id?: string;  // remplace source_view_config_id
  show_pending?: boolean;
  show_submitted?: boolean;
  show_validated?: boolean;
  show_rejected?: boolean;
  group_by_campaign?: boolean;
  show_deadline?: boolean;
  show_progress?: boolean;
  allow_draft?: boolean;
  show_validation_queue?: boolean;
}
```

**Step 2: Mettre à jour SurveyResponsesConfigPanel**

Remplacer le sélecteur de vue source par un sélecteur de workflow (même pattern que Task 8).

**Step 3: Commit**

```bash
git add src/components/builder/page-builder/types.ts src/components/builder/page-builder/SurveyResponsesConfigPanel.tsx
git commit -m "feat: survey_responses block references workflow directly"
```

---

## Task 10 : Adapter useCreateCampaign

**Files:**
- Modify: `src/hooks/useSurveyCampaigns.ts`

**Step 1: Modifier CreateCampaignInput**

Remplacer `campaign_type_config` par `workflow_id` :

```tsx
export interface CreateCampaignInput {
  survey_id?: string;
  name: string;
  previous_campaign_id?: string | null;
  start_date?: string;
  end_date?: string;
  targets: Array<{
    eo_id: string;
    include_descendants: boolean;
  }>;
  workflow_id: string;
  client_id?: string;
}
```

**Step 2: Adapter la logique de création**

Dans `useCreateCampaign` (ligne ~231), remplacer la lecture de `campaign_type_config` par :

1. Charger le workflow : `supabase.from('workflows').select('*').eq('id', workflow_id).single()`
2. Charger les nodes + transitions + node_fields du workflow
3. Construire les `surveySettings` depuis les données du workflow :
   - `bo_definition_id` depuis `workflow.bo_definition_id`
   - `validation_steps` depuis les `workflow_nodes` de type validation
   - `respondent_fields` depuis les `node_fields` du noeud start/form
   - `default_responder_roles` depuis `node_role_permissions` du noeud start

**Step 3: Commit**

```bash
git add src/hooks/useSurveyCampaigns.ts
git commit -m "feat: useCreateCampaign reads workflow instead of inline config"
```

---

## Task 11 : Nettoyage du code mort

**Files:**
- Delete ou vider les composants de config inline des campaign types
- Nettoyer les imports cassés

**Step 1: Identifier les fichiers à supprimer**

Rechercher les composants qui ne sont plus référencés :
- `CampaignTypeFormDialog`
- `CampaignTypeFieldsEditor`
- Tout composant importé uniquement par le `SurveyCreatorConfigPanel` supprimé

**Step 2: Supprimer les fichiers et nettoyer les imports**

**Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`

Corriger toute erreur de type restante.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead code from survey creator inline config"
```

---

## Task 12 : Vérification finale

**Step 1: Compilation TypeScript**

Run: `npx tsc --noEmit`

**Step 2: Tester manuellement le flow complet**

1. Créer un workflow avec un BO sélectionné
2. Ajouter des noeuds, configurer les champs par noeud
3. Créer un nouveau champ à la volée depuis l'éditeur de noeud
4. Publier le workflow
5. Dans le builder, ajouter un bloc survey_creator → sélectionner le workflow
6. Ajouter un bloc survey_responses → sélectionner le workflow
7. Créer une campagne depuis la vue utilisateur

**Step 3: Commit final si nécessaire**

```bash
git commit -m "feat: workflow collecte refonte complete"
```
