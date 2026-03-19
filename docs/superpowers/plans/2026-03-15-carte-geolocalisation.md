# Carte géolocalisée des EO — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher les entités organisationnelles sur une carte interactive Leaflet, géocodées automatiquement à partir d'un champ adresse calculé.

**Architecture:** Nouveau type de champ `coordinates` (lat/lng JSON) alimenté par une edge function de géocodage Nominatim, appelée côté client lors de la sauvegarde d'un champ source. Nouveau bloc `eo_map` dans le page builder avec Leaflet + clustering + filtres réutilisant le système existant du bloc `eo_card`.

**Tech Stack:** Leaflet, react-leaflet, leaflet.markercluster, Nominatim API (OpenStreetMap), Supabase Edge Functions (Deno)

---

## Chunk 1 : Type de champ coordinates + geocodage

### Task 1 : Ajouter le type `coordinates` au field type registry

**Files:**
- Modify: `src/lib/field-type-registry.ts`

- [ ] **Step 1: Ajouter l'import de l'icône MapPin**

Ajouter `MapPin` à l'import lucide-react existant.

- [ ] **Step 2: Ajouter l'entrée `coordinates` dans FIELD_TYPES**

Après le bloc `// Avancé`, ajouter :
```typescript
{ value: 'coordinates', label: 'Coordonnées GPS', icon: MapPin, group: 'Avancé' },
```

- [ ] **Step 3: Vérifier que le dev server compile**

Run: vérifier que la page fonctionne sans erreur console.

- [ ] **Step 4: Commit**

```bash
git add src/lib/field-type-registry.ts
git commit -m "feat: ajouter type coordinates au field type registry"
```

---

### Task 2 : Ajouter `coordinates` à l'enum DB `field_type`

**Files:**
- Create: migration SQL via Supabase MCP

- [ ] **Step 1: Ajouter la valeur `coordinates` à l'enum**

```sql
ALTER TYPE public.field_type ADD VALUE IF NOT EXISTS 'coordinates';
```

- [ ] **Step 2: Appliquer la migration via Supabase MCP**

- [ ] **Step 3: Régénérer les types TypeScript**

Run: `mcp supabase generate_typescript_types`

- [ ] **Step 4: Commit**

```bash
git add supabase/ src/integrations/supabase/types.ts
git commit -m "feat: ajouter coordinates à l'enum field_type DB"
```

---

### Task 3 : Configuration du champ coordinates dans le formulaire EO

**Files:**
- Modify: `src/components/admin/entities/eo-field-form/FieldTypeConfig.tsx`
- Modify: `src/hooks/useEoFieldDefinitions.ts` (interface EoFieldSettings)
- Modify: `src/lib/eo/eo-field-payload-builder.ts`

- [ ] **Step 1: Ajouter `source_field_id` à EoFieldSettings**

Dans `src/hooks/useEoFieldDefinitions.ts`, ajouter à l'interface `EoFieldSettings` :
```typescript
source_field_id?: string; // ID du champ calculé source pour le géocodage (type coordinates)
```

- [ ] **Step 2: Ajouter `source_field_id` au formData dans EoFieldFormDialog**

Dans `src/components/admin/entities/eo-field-form/EoFieldFormDialog.tsx`, ajouter `source_field_id: null as string | null` au state initial du form, et mapper depuis `field.settings?.source_field_id` en mode édition.

- [ ] **Step 3: Ajouter le sélecteur de champ source dans FieldTypeConfig**

Quand `formData.field_type === 'coordinates'`, afficher un `<Select>` "Champ adresse source" qui liste les champs de type `calculated` du même client. Le composant reçoit déjà les referentials — il faut aussi passer la liste des champs du client pour filtrer par type `calculated`.

- [ ] **Step 4: Persister `source_field_id` dans les settings**

Dans `src/lib/eo/eo-field-payload-builder.ts`, dans la fonction `buildFieldPayload`, ajouter :
```typescript
if (formData.field_type === 'coordinates' && formData.source_field_id) {
  settings.source_field_id = formData.source_field_id;
} else {
  delete settings.source_field_id;
}
```

Ajouter aussi `source_field_id` à l'interface `EoFieldFormData` dans le même fichier.

- [ ] **Step 5: Vérifier dans l'UI**

Ouvrir la page structure champs EO, créer un champ "Coordonnées", vérifier que le sélecteur de champ source s'affiche et que la sauvegarde fonctionne.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useEoFieldDefinitions.ts src/components/admin/entities/eo-field-form/ src/lib/eo/eo-field-payload-builder.ts
git commit -m "feat: configuration champ coordinates avec sélecteur de champ source"
```

---

### Task 4 : Rendu du champ coordinates dans le drawer EO et les listes

**Files:**
- Modify: `src/components/admin/entities/InlineFieldEditor.tsx`
- Modify: `src/components/user/views/eo-card/useEoPagination.ts`

- [ ] **Step 1: Affichage dans InlineFieldEditor**

Dans la fonction `formatDisplayValue`, ajouter un case pour `coordinates` :
```typescript
case 'coordinates': {
  try {
    const coords = typeof value === 'string' ? JSON.parse(value) : value;
    if (coords?.lat != null && coords?.lng != null) {
      return `${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)}`;
    }
  } catch {}
  return '—';
}
```

Le champ est read-only : dans la section d'édition, ne pas rendre d'input pour le type `coordinates` (afficher uniquement la valeur formatée).

- [ ] **Step 2: Affichage dans useEoPagination**

Dans `getEntityFieldValue`, ajouter le même formatage pour le type `coordinates`.

- [ ] **Step 3: Vérifier dans l'UI**

Vérifier que le champ s'affiche correctement dans le drawer et dans la liste.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/entities/InlineFieldEditor.tsx src/components/user/views/eo-card/useEoPagination.ts
git commit -m "feat: rendu du champ coordinates dans le drawer et les listes EO"
```

---

### Task 5 : Edge function `geocode-address`

**Files:**
- Create: `supabase/functions/geocode-address/index.ts`

- [ ] **Step 1: Créer l'edge function**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eo_id, coordinates_field_id, address } = await req.json();

    if (!eo_id || !coordinates_field_id || !address) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: eo_id, coordinates_field_id, address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Geocode via Nominatim
    const encoded = encodeURIComponent(address);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
    const geoRes = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'OlympeProto/1.0 (contact@deltarm.com)' },
    });

    if (!geoRes.ok) {
      throw new Error(`Nominatim API error: ${geoRes.status}`);
    }

    const results = await geoRes.json();
    const coords = results.length > 0
      ? { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
      : null;

    // Upsert field value
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase
      .from('eo_field_values')
      .upsert(
        { eo_id, field_definition_id: coordinates_field_id, value: coords },
        { onConflict: 'eo_id,field_definition_id' }
      );

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, coordinates: coords }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[geocode-address] Error:', e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Déployer via Supabase MCP**

Run: `mcp supabase deploy_edge_function geocode-address`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/geocode-address/
git commit -m "feat: edge function geocode-address (Nominatim)"
```

---

### Task 6 : Appel du géocodage côté client lors de la sauvegarde

**Files:**
- Create: `src/lib/eo/eo-geocoding.ts`
- Modify: `src/hooks/useEoFieldDefinitions.ts` (dans useUpsertEoFieldValue)

- [ ] **Step 1: Créer le module de géocodage**

`src/lib/eo/eo-geocoding.ts` :
```typescript
import { supabase } from '@/integrations/supabase/client';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

/**
 * Vérifie si un champ modifié est la source d'un champ coordinates,
 * et si oui, déclenche le géocodage.
 */
export async function triggerGeocodingIfNeeded(
  modifiedFieldId: string,
  eoId: string,
  allFields: EoFieldDefinition[],
) {
  // Trouver les champs coordinates qui utilisent ce champ comme source
  const coordsFields = allFields.filter(
    f => f.field_type === 'coordinates' && f.settings?.source_field_id === modifiedFieldId
  );

  if (coordsFields.length === 0) return;

  // Récupérer la valeur actuelle du champ source (l'adresse calculée)
  const { data: sourceValue } = await supabase
    .from('eo_field_values')
    .select('value')
    .eq('eo_id', eoId)
    .eq('field_definition_id', modifiedFieldId)
    .maybeSingle();

  const address = sourceValue?.value ? String(sourceValue.value) : null;
  if (!address) return;

  // Appeler l'edge function pour chaque champ coordinates lié
  for (const coordField of coordsFields) {
    try {
      await supabase.functions.invoke('geocode-address', {
        body: {
          eo_id: eoId,
          coordinates_field_id: coordField.id,
          address,
        },
      });
    } catch (e) {
      console.error('[geocoding] Failed for field', coordField.id, e);
    }
  }
}
```

- [ ] **Step 2: Intégrer dans useUpsertEoFieldValue**

Dans `src/hooks/useEoFieldDefinitions.ts`, modifier `useUpsertEoFieldValue` pour accepter un callback `onSuccess` optionnel, ou exposer un hook wrapper qui appelle `triggerGeocodingIfNeeded` après le upsert. L'approche la plus simple : créer un hook `useUpsertEoFieldValueWithGeocoding` dans un nouveau fichier, ou appeler directement depuis les composants qui font le save.

Alternative plus propre : dans les composants qui sauvent des valeurs EO (InlineFieldEditor, EoDetailsDrawer), après un upsert réussi, appeler `triggerGeocodingIfNeeded`.

- [ ] **Step 3: Tester le flux complet**

1. Créer un champ calculé "Adresse complète"
2. Créer un champ "Coordonnées" de type coordinates, lier au champ calculé
3. Modifier un champ composant l'adresse sur une EO
4. Vérifier que les coordonnées se mettent à jour

- [ ] **Step 4: Commit**

```bash
git add src/lib/eo/eo-geocoding.ts src/hooks/useEoFieldDefinitions.ts
git commit -m "feat: géocodage automatique côté client lors de la sauvegarde"
```

---

## Chunk 2 : Bloc carte eo_map

### Task 7 : Installer les dépendances Leaflet

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer les packages**

```bash
npm install leaflet react-leaflet leaflet.markercluster @types/leaflet
```

Note: `leaflet.markercluster` n'a pas de types TS officiels — on fera un fichier de déclaration si besoin.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: installer leaflet, react-leaflet, leaflet.markercluster"
```

---

### Task 8 : Enregistrer le bloc `eo_map` dans le type system

**Files:**
- Modify: `src/types/builder-types.ts`
- Modify: `src/components/builder/page-builder/types.ts`

- [ ] **Step 1: Ajouter `eo_map` au type union dans builder-types.ts**

```typescript
export type BusinessBlockType = 'data_table' | 'eo_card' | 'eo_map' | 'survey_creator' | 'survey_responses' | 'users';
export const BUSINESS_BLOCK_TYPES: BusinessBlockType[] = ['data_table', 'eo_card', 'eo_map', 'survey_creator', 'survey_responses', 'users'];
```

- [ ] **Step 2: Ajouter les interfaces dans types.ts**

Après `EoCardBlock`, ajouter :
```typescript
export interface EoMapBlockConfig {
  coordinates_field_id?: string;       // Champ coordinates à utiliser pour la position
  center_lat?: number;                 // Centre par défaut de la carte (lat)
  center_lng?: number;                 // Centre par défaut de la carte (lng)
  default_zoom?: number;               // Zoom par défaut (1-18)
  enable_filters?: boolean;            // Activer les filtres utilisateur
  filters?: EoFilterConfig[];          // Filtres disponibles
  prefilters?: EoPreFilterConfig[];    // Pré-filtres
  enable_clustering?: boolean;         // Activer le clustering des marqueurs
  full_page?: boolean;                 // Pleine hauteur
}

export interface EoMapBlock extends BaseBlock {
  type: 'eo_map';
  config: EoMapBlockConfig;
}
```

- [ ] **Step 3: Ajouter dans BUSINESS_BLOCK_DEFINITIONS**

```typescript
{
  type: 'eo_map',
  label: 'Carte géographique',
  description: 'Affiche les entités sur une carte interactive',
  icon: 'Map',
  defaultConfig: {
    center_lat: 46.6,
    center_lng: 2.2,
    default_zoom: 6,
    enable_filters: false,
    enable_clustering: true,
    full_page: true,
  },
  defaultPosition: { colSpan: 12 },
  category: 'business',
},
```

- [ ] **Step 4: Ajouter `EoMapBlock` au type union PageBlock**

Dans le type `PageBlock` (union discriminée), ajouter `| EoMapBlock`.

- [ ] **Step 5: Vérifier la compilation**

- [ ] **Step 6: Commit**

```bash
git add src/types/builder-types.ts src/components/builder/page-builder/types.ts
git commit -m "feat: enregistrer bloc eo_map dans le type system"
```

---

### Task 9 : Câbler le bloc dans le page builder (palette, preview, config)

**Files:**
- Modify: `src/components/builder/page-builder/BlockPalette.tsx` (ajouter icône Map)
- Modify: `src/components/builder/page-builder/BlockRenderer.tsx` (ajouter case preview)
- Create: `src/components/builder/page-builder/BlockPreviewEoMap.tsx`
- Modify: `src/components/builder/page-builder/block-config/BlockConfigPanel.tsx` (ajouter case config)
- Create: `src/components/builder/page-builder/block-config/EoMapConfigSection.tsx`

- [ ] **Step 1: Ajouter l'icône dans BlockPalette**

Ajouter `Map` à l'objet `ICONS` dans `BlockPalette.tsx`.

- [ ] **Step 2: Créer BlockPreviewEoMap**

Composant simple affichant une preview statique avec icône Map et texte "Carte géographique".

- [ ] **Step 3: Ajouter le case dans BlockRenderer**

Dans `renderBlockPreview`, ajouter :
```typescript
case 'eo_map':
  return <BlockPreviewEoMap config={block.config} />;
```

- [ ] **Step 4: Créer EoMapConfigSection**

Section de configuration avec :
- Sélecteur du champ coordinates (parmi les champs de type `coordinates` du client)
- Inputs pour centre par défaut (lat/lng) et zoom
- Switch pour activer le clustering
- Switch pour activer les filtres + dialog de config filtres (réutiliser `EoFiltersConfigDialog`)

- [ ] **Step 5: Ajouter le case dans BlockConfigPanel**

```typescript
case 'eo_map':
  return <EoMapConfigSection block={block as EoMapBlock} clientId={clientId} onUpdate={updateConfig} />;
```

- [ ] **Step 6: Vérifier dans le page builder**

Ouvrir le page builder, vérifier que le bloc "Carte géographique" apparaît dans la palette, peut être glissé, et que la config s'affiche.

- [ ] **Step 7: Commit**

```bash
git add src/components/builder/page-builder/
git commit -m "feat: bloc eo_map dans le page builder (palette, preview, config)"
```

---

### Task 10 : Composant carte utilisateur final (EoMapView)

**Files:**
- Create: `src/components/user/views/eo-map/EoMapView.tsx`
- Create: `src/components/user/views/eo-map/useEoMapData.ts`
- Modify: `src/components/user/views/DynamicPageView.tsx`

- [ ] **Step 1: Créer le hook useEoMapData**

Hook qui :
1. Récupère toutes les EO du client (via `organizational_entities`)
2. Récupère les valeurs du champ coordinates pour toutes les EO
3. Récupère les valeurs des champs filtrables
4. Retourne un tableau `{ eo, lat, lng, filterValues }[]`

- [ ] **Step 2: Créer EoMapView**

Composant principal :
```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster'; // ou leaflet.markercluster wrapper
import 'leaflet/dist/leaflet.css';
```

Structure :
- Barre de filtres en haut (réutiliser les composants de filtres du bloc eo_card via `DynamicFilters`)
- `<MapContainer>` avec `<TileLayer>` OpenStreetMap
- `<MarkerClusterGroup>` si clustering activé
- `<Marker>` pour chaque EO avec coordonnées valides
- `<Popup>` au clic avec nom de l'EO + bouton "Voir les détails"
- Clic sur "Voir les détails" → ouvre le `EoDetailsDrawer`

- [ ] **Step 3: Gérer l'icône Leaflet par défaut**

Leaflet a un bug connu avec les icônes par défaut en mode bundler. Ajouter le fix :
```typescript
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, shadowUrl: markerShadow });
```

- [ ] **Step 4: Câbler dans DynamicPageView**

Dans `BlockView`, ajouter :
```typescript
case 'eo_map':
  return <EoMapView block={block as EoMapBlock} viewConfigId={viewConfigId} />;
```

- [ ] **Step 5: Vérifier le rendu**

Créer une vue avec un bloc carte, configurer le champ coordinates. Vérifier que la carte s'affiche avec les EO positionnées.

- [ ] **Step 6: Commit**

```bash
git add src/components/user/views/eo-map/ src/components/user/views/DynamicPageView.tsx
git commit -m "feat: composant EoMapView avec Leaflet, clustering et filtres"
```

---

### Task 11 : Intégration drawer EO + polish

**Files:**
- Modify: `src/components/user/views/eo-map/EoMapView.tsx`

- [ ] **Step 1: Intégrer EoDetailsDrawer**

Ajouter un state `selectedEoId` dans EoMapView. Au clic sur un marqueur, setter l'ID. Rendre `<EoDetailsDrawer>` conditionnel.

- [ ] **Step 2: Tooltip au survol**

Utiliser le composant `<Tooltip>` de react-leaflet pour afficher le nom de l'EO au survol du marqueur.

- [ ] **Step 3: Adapter la hauteur**

Si `config.full_page`, la carte prend `calc(100vh - header)`. Sinon hauteur fixe (400px).

- [ ] **Step 4: Test final**

Parcours complet :
1. Intégrateur : créer champ calculé adresse → créer champ coordinates → configurer bloc carte
2. UF : voir la carte, filtrer, cliquer un pin, voir le drawer

- [ ] **Step 5: Commit**

```bash
git add src/components/user/views/eo-map/
git commit -m "feat: intégration drawer EO dans la carte + polish UX"
```
