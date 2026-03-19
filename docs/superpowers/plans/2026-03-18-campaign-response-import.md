# Import des réponses de campagne — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre l'import CSV des réponses d'une campagne depuis la vue UF (bloc questionnaire), en réutilisant le framework `ImportWizard` existant.

**Architecture:** Une page d'import dédiée (`CampaignImportPage`) utilise `ImportWizard` avec une config spécifique campagne. Les champs disponibles pour le mapping viennent de la config du workflow (respondent_fields + validation_steps). L'import met à jour les `object_field_values` des réponses existantes, identifiées par le nom ou code de l'EO.

**Tech Stack:** React, ImportWizard (composant existant), Supabase, TanStack Query

---

## Fichiers concernés

| Action | Fichier | Responsabilité |
|--------|---------|----------------|
| Créer | `src/pages/user/CampaignImportPage.tsx` | Page d'import avec config ImportWizard |
| Modifier | `src/App.tsx` | Ajouter la route `/campaigns/:campaignId/import` |
| Modifier | `src/lib/routes.ts` | Ajouter `USER_CAMPAIGN_IMPORT` |
| Modifier | `src/pages/user/CampaignDetailPage.tsx` | Brancher le bouton "Importer" vers la route |

---

### Task 1: Route et navigation

**Files:**
- Modify: `src/lib/routes.ts`
- Modify: `src/App.tsx`
- Modify: `src/pages/user/CampaignDetailPage.tsx`

- [ ] **Step 1: Ajouter la route dans `routes.ts`**

Dans `CLIENT_ROUTES`, ajouter :
```ts
USER_CAMPAIGN_IMPORT: (campaignId: string) => `/user/campaigns/${campaignId}/import`,
```

- [ ] **Step 2: Ajouter la route dans `App.tsx`**

Ajouter le lazy import :
```ts
const CampaignImportPage = lazy(() => import("./pages/user/CampaignImportPage"));
```

Ajouter la route dans la section user, à côté de `campaigns/:campaignId` :
```tsx
<Route path="campaigns/:campaignId/import" element={<CampaignImportPage />} />
```

- [ ] **Step 3: Brancher le bouton Importer**

Dans `CampaignDetailPage.tsx`, remplacer le `onClick` du bouton Importer :
```tsx
// Avant:
onClick={() => toast.info('Import à venir')}

// Après:
onClick={() => navigate(cp(CLIENT_ROUTES.USER_CAMPAIGN_IMPORT(campaignId!)))}
```

Ajouter l'import de `useClientPath` et `CLIENT_ROUTES` si pas déjà présent.

- [ ] **Step 4: Vérifier** que le clic sur "Importer" navigue vers `/campaigns/:id/import`

- [ ] **Step 5: Commit**
```bash
git add src/lib/routes.ts src/App.tsx src/pages/user/CampaignDetailPage.tsx
git commit -m "feat: route et navigation pour l'import de réponses campagne"
```

---

### Task 2: Page d'import — Structure de base

**Files:**
- Create: `src/pages/user/CampaignImportPage.tsx`

- [ ] **Step 1: Créer la page avec chargement des données**

La page doit :
1. Lire `campaignId` depuis les params URL
2. Charger la campagne + survey settings (pour obtenir les champs)
3. Charger les réponses existantes (pour le mapping EO → response)
4. Configurer l'`ImportWizard`

```tsx
import { useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import { reverseMapping, type ImportWizardConfig, type PreviewRow, type FieldMapping, type ParsedRow, type ImportProgress } from '@/components/admin/import/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
```

- [ ] **Step 2: Charger les champs de la campagne**

```tsx
// Dans le composant :
const { campaignId } = useParams<{ campaignId: string }>();
const cp = useClientPath();

// Charger campagne + champs
const { data: campaignData, isLoading } = useQuery({
  queryKey: ['campaign-import', campaignId],
  queryFn: async () => {
    // 1. Campaign + survey settings
    const { data: campaign } = await supabase
      .from('survey_campaigns')
      .select('id, name, survey:surveys!inner(id, name, bo_definition_id, settings)')
      .eq('id', campaignId!)
      .single();
    if (!campaign) throw new Error('Campaign not found');

    const settings = (campaign.survey as any)?.settings || {};
    const boDefId = (campaign.survey as any)?.bo_definition_id;

    // 2. All field definitions for the BO
    const { data: fieldDefs } = await supabase
      .from('field_definitions')
      .select('id, name, slug, field_type, is_required, is_system')
      .eq('object_definition_id', boDefId)
      .eq('is_active', true)
      .order('display_order');

    // 3. Existing responses with EO info
    const { data: responses } = await supabase
      .from('survey_responses')
      .select('id, respondent_eo_id, business_object_id, status, organizational_entities!survey_responses_respondent_eo_id_fkey(id, name, code)')
      .eq('campaign_id', campaignId!);

    return { campaign, fieldDefs: fieldDefs || [], responses: responses || [], boDefId };
  },
  enabled: !!campaignId,
});
```

- [ ] **Step 3: Construire les champs pour le mapping**

Les champs disponibles pour le mapping incluent :
- `__eo_name` (Nom de l'entité) — requis, sert à identifier la réponse
- `__eo_code` (Code de l'entité) — alternatif pour identifier
- Tous les champs non-système de la BO (type text, number, decimal, select, etc.)

```tsx
const importFields = useMemo(() => {
  if (!campaignData) return [];
  return [
    { id: '__eo_name', label: 'Nom de l\'entité', required: true },
    { id: '__eo_code', label: 'Code de l\'entité', required: false },
    ...campaignData.fieldDefs
      .filter(f => !f.is_system)
      .map(f => ({ id: f.id, label: f.name, required: false })),
  ];
}, [campaignData]);
```

- [ ] **Step 4: Auto-mapping**

```tsx
function autoMap(headers: string[]): FieldMapping {
  const m: FieldMapping = {};
  const fields = campaignData?.fieldDefs || [];
  for (const h of headers) {
    const n = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    // Match EO columns
    if (n.includes('entit') && n.includes('nom') || n === 'entite' || n === 'entity') m[h] = '__eo_name';
    else if (n.includes('code') && n.includes('entit') || n === 'code') m[h] = '__eo_code';
    else {
      // Match field definitions by name or slug
      const match = fields.find(f => {
        const fn = f.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const fs = f.slug.toLowerCase();
        return fn === n || fs === n || fn.includes(n) || n.includes(fn);
      });
      if (match) m[h] = match.id;
    }
  }
  return m;
}
```

- [ ] **Step 5: Commit**
```bash
git add src/pages/user/CampaignImportPage.tsx
git commit -m "feat: page import campagne — structure de base et chargement données"
```

---

### Task 3: buildPreview et validation

**Files:**
- Modify: `src/pages/user/CampaignImportPage.tsx`

- [ ] **Step 1: Implémenter buildPreview**

Pour chaque ligne CSV :
1. Résoudre l'EO via nom ou code
2. Trouver la réponse existante pour cet EO
3. Valider les données (EO trouvée ? réponse existante ?)
4. Retourner les `PreviewRow`

```tsx
const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
  const r = reverseMapping(mapping);
  const responses = campaignData?.responses || [];

  // Build lookup maps
  const eoNameMap = new Map<string, typeof responses[0]>();
  const eoCodeMap = new Map<string, typeof responses[0]>();
  for (const resp of responses) {
    const eo = resp.organizational_entities as any;
    if (eo?.name) eoNameMap.set(eo.name.toLowerCase(), resp);
    if (eo?.code) eoCodeMap.set(eo.code.toLowerCase(), resp);
  }

  return rows.map((row, i) => {
    const eoName = r['__eo_name'] ? row[r['__eo_name']]?.trim() : '';
    const eoCode = r['__eo_code'] ? row[r['__eo_code']]?.trim() : '';

    // Find matching response
    const match = (eoName && eoNameMap.get(eoName.toLowerCase()))
      || (eoCode && eoCodeMap.get(eoCode.toLowerCase()));

    if (!match) {
      return {
        data: { eoName, eoCode, status: 'non trouvé' },
        hasError: true,
        errorMessage: `Entité "${eoName || eoCode}" non trouvée dans cette campagne`,
      };
    }

    if (!match.business_object_id) {
      return {
        data: { eoName, eoCode, status: 'pas de BO' },
        hasError: true,
        errorMessage: `Aucun objet métier lié à cette réponse`,
      };
    }

    // Collect field values from the row
    const fieldValues: Record<string, string> = {};
    for (const [csvCol, fieldId] of Object.entries(mapping)) {
      if (fieldId.startsWith('__')) continue;
      fieldValues[fieldId] = row[csvCol]?.trim() || '';
    }

    return {
      data: {
        eoName: eoName || (match.organizational_entities as any)?.name || '',
        eoCode: eoCode || (match.organizational_entities as any)?.code || '',
        status: 'ok',
        responseId: match.id,
        boId: match.business_object_id,
        ...fieldValues,
      },
      hasError: false,
    };
  });
}, [campaignData]);
```

- [ ] **Step 2: Commit**
```bash
git add src/pages/user/CampaignImportPage.tsx
git commit -m "feat: import campagne — buildPreview avec validation EO"
```

---

### Task 4: onImport — Exécution de l'import

**Files:**
- Modify: `src/pages/user/CampaignImportPage.tsx`

- [ ] **Step 1: Implémenter onImport**

Pour chaque ligne valide :
1. Upsert les `object_field_values` pour le `business_object_id`
2. Tracker la progression

```tsx
const onImport = useCallback(async (
  rows: ParsedRow[],
  mapping: FieldMapping,
  onProgress: (p: ImportProgress) => void,
) => {
  const r = reverseMapping(mapping);
  const responses = campaignData?.responses || [];
  const eoNameMap = new Map<string, typeof responses[0]>();
  const eoCodeMap = new Map<string, typeof responses[0]>();
  for (const resp of responses) {
    const eo = resp.organizational_entities as any;
    if (eo?.name) eoNameMap.set(eo.name.toLowerCase(), resp);
    if (eo?.code) eoCodeMap.set(eo.code.toLowerCase(), resp);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let successCount = 0;
  let errorCount = 0;
  const details: Array<{ label: string; status: 'success' | 'error'; error?: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const eoName = r['__eo_name'] ? row[r['__eo_name']]?.trim() : '';
    const eoCode = r['__eo_code'] ? row[r['__eo_code']]?.trim() : '';
    const match = (eoName && eoNameMap.get(eoName.toLowerCase()))
      || (eoCode && eoCodeMap.get(eoCode.toLowerCase()));

    if (!match?.business_object_id) {
      errorCount++;
      details.push({ label: eoName || eoCode || `Ligne ${i + 1}`, status: 'error', error: 'Entité non trouvée' });
      onProgress({ current: i + 1, total: rows.length });
      continue;
    }

    try {
      // Build upsert rows
      const upsertRows: Array<{
        business_object_id: string;
        field_definition_id: string;
        value: any;
        last_modified_by: string;
      }> = [];

      for (const [csvCol, fieldId] of Object.entries(mapping)) {
        if (fieldId.startsWith('__')) continue;
        const rawValue = row[csvCol]?.trim();
        if (rawValue === undefined || rawValue === '') continue;

        // Convert to appropriate type
        const fieldDef = campaignData?.fieldDefs.find(f => f.id === fieldId);
        let value: any = rawValue;
        if (fieldDef?.field_type === 'number') value = parseInt(rawValue, 10);
        else if (fieldDef?.field_type === 'decimal' || fieldDef?.field_type === 'currency') value = parseFloat(rawValue.replace(',', '.'));

        upsertRows.push({
          business_object_id: match.business_object_id,
          field_definition_id: fieldId,
          value,
          last_modified_by: user.id,
        });
      }

      if (upsertRows.length > 0) {
        const { error } = await supabase
          .from('object_field_values')
          .upsert(upsertRows, { onConflict: 'business_object_id,field_definition_id' });
        if (error) throw error;
      }

      successCount++;
      details.push({ label: eoName || eoCode, status: 'success' });
    } catch (err: any) {
      errorCount++;
      details.push({ label: eoName || eoCode, status: 'error', error: err.message });
    }

    onProgress({ current: i + 1, total: rows.length });
  }

  return { successCount, errorCount, details };
}, [campaignData]);
```

- [ ] **Step 2: Commit**
```bash
git add src/pages/user/CampaignImportPage.tsx
git commit -m "feat: import campagne — onImport avec upsert des valeurs"
```

---

### Task 5: renderPreview et assemblage final

**Files:**
- Modify: `src/pages/user/CampaignImportPage.tsx`

- [ ] **Step 1: Implémenter renderPreview**

Afficher un tableau avec : Entité, Code, Statut (ok/erreur), et les premières valeurs mappées.

```tsx
const renderPreview = useCallback((rows: PreviewRow[]) => {
  const fieldCols = campaignData?.fieldDefs.filter(f => !f.is_system).slice(0, 5) || [];
  return (
    <div className="overflow-auto max-h-[400px] border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entité</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Statut</TableHead>
            {fieldCols.map(f => (
              <TableHead key={f.id}>{f.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className={row.hasError ? 'bg-destructive/5' : ''}>
              <TableCell className="font-medium">{row.data.eoName || '-'}</TableCell>
              <TableCell className="text-muted-foreground">{row.data.eoCode || '-'}</TableCell>
              <TableCell>
                {row.hasError
                  ? <Chip variant="error" className="text-xs">{row.errorMessage}</Chip>
                  : <Chip variant="success" className="text-xs">OK</Chip>
                }
              </TableCell>
              {fieldCols.map(f => (
                <TableCell key={f.id} className="text-muted-foreground">
                  {row.data[f.id] || '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}, [campaignData]);
```

- [ ] **Step 2: Assembler le config ImportWizard**

```tsx
const wizardConfig: ImportWizardConfig = useMemo(() => ({
  title: `Importer — ${campaignData?.campaign.name || ''}`,
  backPath: cp(CLIENT_ROUTES.USER_CAMPAIGN(campaignId!)),
  fields: importFields,
  autoMap,
  templateContent: () => {
    const headers = ['Nom entité', 'Code entité', ...importFields.filter(f => !f.id.startsWith('__')).map(f => f.label)];
    return headers.join(';');
  },
  templateFileName: `template_import_${campaignData?.campaign.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'campagne'}.csv`,
  buildPreview,
  onImport,
  renderPreview,
  onImportComplete: () => {
    // Invalidate campaign field columns cache
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignFieldColumns.byCampaign('', 0) });
  },
  backLabel: 'Retour à la campagne',
}), [campaignData, importFields, buildPreview, onImport, renderPreview, cp, campaignId]);

// Render
if (isLoading) return <Skeleton className="h-96 m-6" />;
return <ImportWizard config={wizardConfig} />;
```

- [ ] **Step 3: Vérifier** le flux complet :
  1. Cliquer "Importer" sur la page campagne
  2. Upload un CSV
  3. Mapper les colonnes
  4. Preview avec validation EO
  5. Import → upsert des valeurs
  6. Retour à la campagne

- [ ] **Step 4: Commit**
```bash
git add src/pages/user/CampaignImportPage.tsx
git commit -m "feat: import campagne — renderPreview et assemblage final"
```

---

### Task 6: Template CSV avec données existantes

**Files:**
- Modify: `src/pages/user/CampaignImportPage.tsx`

- [ ] **Step 1: Enrichir le template**

Le template doit inclure toutes les EO de la campagne avec leurs valeurs actuelles pré-remplies, pour que l'utilisateur puisse modifier et ré-importer.

```tsx
templateContent: () => {
  const fields = importFields.filter(f => !f.id.startsWith('__'));
  const headers = ['Nom entité', 'Code entité', ...fields.map(f => f.label)];

  // Pre-fill with existing data
  const rows = (campaignData?.responses || []).map(resp => {
    const eo = resp.organizational_entities as any;
    return [
      eo?.name || '',
      eo?.code || '',
      ...fields.map(f => ''), // Empty — could be pre-filled from valuesMap if available
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';');
  });

  return [headers.join(';'), ...rows].join('\n');
},
```

- [ ] **Step 2: Commit**
```bash
git add src/pages/user/CampaignImportPage.tsx
git commit -m "feat: import campagne — template CSV avec EO pré-remplies"
```
