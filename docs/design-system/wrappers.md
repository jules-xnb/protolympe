# Wrappers — Référence

> Composants custom construits au-dessus de shadcn. **À utiliser EN PRIORITÉ** sur le shadcn brut.
> Règle : si un wrapper existe pour ton besoin, tu DOIS l'utiliser. Pas de recomposition manuelle.

---

## 1. SearchableSelect

**Fichier** : `searchable-select.tsx`
**Compose** : Popover + Command + Button

**Quand l'utiliser** : select avec recherche, options avec icônes, options groupées
**Ne PAS utiliser** : pour < 10 options sans recherche → utiliser `Select` shadcn

```tsx
<SearchableSelect
  value={selected}
  onValueChange={setSelected}
  placeholder="Choisir..."
  options={[
    { value: "1", label: "Option 1", icon: UserIcon },
    { value: "2", label: "Option 2", secondaryLabel: "(admin)" },
  ]}
/>

// Avec groupes
<SearchableSelect
  value={selected}
  onValueChange={setSelected}
  groups={[
    { label: "Groupe A", options: [{ value: "1", label: "Item 1" }] },
    { label: "Groupe B", options: [{ value: "2", label: "Item 2" }] },
  ]}
/>
```

**Props** : `value`, `onValueChange`, `placeholder?`, `searchPlaceholder?`, `emptyMessage?`, `options?`, `groups?`, `className?`

**Utilisé dans** : —

---

## 2. FormDialog

**Fichier** : `form-dialog.tsx`
**Compose** : Dialog + Form + Button

**Quand l'utiliser** : modale avec formulaire (création, édition)
**Ne PAS utiliser** : pour une modale sans formulaire → utiliser `Dialog` shadcn

```tsx
<FormDialog
  open={open}
  onOpenChange={setOpen}
  title="Créer un client"
  schema={z.object({ name: z.string().min(1) })}
  defaultValues={{ name: "" }}
  onSubmit={async (values) => await createClient(values)}
  submitLabel="Créer"
>
  {(form) => (
    <FormField control={form.control} name="name" render={({ field }) => (
      <FormItem>
        <FormLabel>Nom</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  )}
</FormDialog>
```

**Props** : `open`, `onOpenChange`, `title`, `description?`, `schema`, `defaultValues`, `onSubmit`, `isSubmitting?`, `submitLabel?`, `cancelLabel?`, `children` (render function)

**Utilisé dans** : —

---

## 3. DetailsDrawer

**Fichier** : `details-drawer.tsx`
**Compose** : Sheet

**Quand l'utiliser** : panneau latéral pour afficher les détails d'une ressource
**Ne PAS utiliser** : pour un panneau générique sans header/footer → utiliser `Sheet` shadcn

```tsx
<DetailsDrawer
  open={open}
  onOpenChange={setOpen}
  title="Détails du client"
  description="Informations complètes"
  isLoading={isLoading}
  footer={<Button>Enregistrer <Save className="h-4 w-4" /></Button>}
>
  <div className="space-y-4">
    <p>{client.name}</p>
  </div>
</DetailsDrawer>
```

**Props** : `open`, `onOpenChange`, `title?`, `description?`, `children`, `footer?`, `isLoading?`, `side?`, `className?`

**Utilisé dans** : —

---

## 4. TableActionMenu

**Fichier** : `table-action-menu.tsx`
**Compose** : Button + DropdownMenu

**Quand l'utiliser** : menu d'actions (⋯) sur les lignes de tableau
**Ne PAS utiliser** : pour un menu contextuel hors tableau → utiliser `DropdownMenu` shadcn

```tsx
<TableActionMenu
  items={[
    { label: "Modifier", icon: Pencil, onClick: () => handleEdit(item) },
    { label: "Dupliquer", icon: Copy, onClick: () => handleDuplicate(item) },
    { label: "Archiver", icon: Archive, onClick: () => handleArchive(item), destructive: true },
  ]}
/>
```

**Props** : `items` (array de `{ label, icon, onClick, destructive?, disabled?, hidden? }`), `align?`

**Utilisé dans** : —

---

## 5. UnifiedPagination

**Fichier** : `unified-pagination.tsx`
**Compose** : Button + Select

**Quand l'utiliser** : pagination de liste/tableau
**Ne PAS utiliser** : jamais de pagination faite à la main

```tsx
<UnifiedPagination
  totalItems={150}
  currentPage={page}
  totalPages={Math.ceil(150 / pageSize)}
  onPageChange={setPage}
  pageSize={pageSize}
  onPageSizeChange={setPageSize}
  pageSizeOptions={[10, 30, 50]}
/>
```

**Props** : `totalItems`, `currentPage`, `totalPages`, `onPageChange`, `pageSize?`, `onPageSizeChange?`, `pageSizeOptions?`, `compact?`, `hideOnSinglePage?`

**Utilisé dans** : —

---

## 6. StatusChip

**Fichier** : `status-chip.tsx`
**Compose** : Chip

**Quand l'utiliser** : afficher un statut standardisé (actif, inactif, archivé, etc.)
**Ne PAS utiliser** : pour un tag libre → utiliser `Chip` directement

```tsx
<StatusChip status="actif" />
<StatusChip status="archive" />
<StatusChip status="a_configurer" />
```

**Statuts disponibles** : `actif`, `inactif`, `pret_a_activer`, `a_configurer`, `sans_profil`, `archive`, `entite_inactive`

**Utilisé dans** : —

---

## 7. Chip

**Fichier** : `chip.tsx`

**Quand l'utiliser** : étiquette/badge coloré libre
**Ne PAS utiliser** : pour un statut standardisé → utiliser `StatusChip`

```tsx
<Chip variant="success">Validé</Chip>
<Chip variant="error">Erreur</Chip>
<Chip variant="outline">Brouillon</Chip>
```

**Variants** : `default`, `primary`, `success`, `warning`, `error`, `info`, `outline`, `secondary`

**Utilisé dans** : —

---

## 8. EmptyState

**Fichier** : `empty-state.tsx`
**Compose** : Alert

**Quand l'utiliser** : état vide d'une liste, aucun résultat de recherche
**Ne PAS utiliser** : pour un message d'alerte → utiliser `Alert` shadcn

```tsx
<EmptyState
  icon={Inbox}
  title="Aucun utilisateur"
  description="Invitez votre premier utilisateur pour commencer."
  action={<Button>Inviter <UserPlus className="h-4 w-4" /></Button>}
/>
```

**Props** : `icon?`, `title`, `description?`, `action?`, `className?`

**Utilisé dans** : —

---

## 9. FloatingInput

**Fichier** : `floating-input.tsx`

**Quand l'utiliser** : input avec label flottant (style Material Design)
**Ne PAS utiliser** : pour un input standard → utiliser `Input` shadcn + `Label`

```tsx
<FloatingInput
  label="Nom du client"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={!!nameError}
/>
```

**Props** : `label`, `value`, `onChange`, `error?`, + tous les props HTML input

**Utilisé dans** : —

---

## 10. FileInput

**Fichier** : `file-input.tsx`

**Quand l'utiliser** : upload de fichier (cache l'input natif)
**Ne PAS utiliser** : jamais d'`<input type="file">` direct

```tsx
const fileRef = useRef<HTMLInputElement>(null);

<Button onClick={() => fileRef.current?.click()}>
  Importer CSV <Upload className="h-4 w-4" />
</Button>
<FileInput ref={fileRef} accept=".csv" onChange={(file) => handleFile(file)} />
```

**Props** : `accept?`, `onChange`

**Utilisé dans** : —

---

## 11. LoadingSpinner

**Fichier** : `loading-spinner.tsx`

**Quand l'utiliser** : loader plein écran (Suspense fallback, chargement initial)
**Ne PAS utiliser** : pour un spinner inline → utiliser `<Loader2 className="h-4 w-4 animate-spin" />` de lucide

```tsx
<LoadingSpinner />
```

**Utilisé dans** : App.tsx (Suspense fallback)

---

## 12. DragHandle

**Fichier** : `drag-handle.tsx`

**Quand l'utiliser** : poignée de drag-drop avec dnd-kit
**Ne PAS utiliser** : sans dnd-kit

```tsx
const { attributes, listeners } = useSortable({ id });
<DragHandle attributes={attributes} listeners={listeners} />
```

**Props** : `attributes?`, `listeners?`

**Utilisé dans** : —

---

## 13. Sonner (Toast)

**Fichier** : `sonner.tsx`

**Quand l'utiliser** : notifications toast
**Ne PAS utiliser** : pour des messages persistants → utiliser `Alert`

```tsx
import { toast } from "sonner";

toast.success("Client créé");
toast.error("Erreur lors de la sauvegarde");
toast.promise(savePromise, {
  loading: "Sauvegarde...",
  success: "Sauvegardé !",
  error: "Erreur",
});
```

**Utilisé dans** : App.tsx (`<Toaster />` monté une seule fois)

---

## Règles

1. **Wrapper existe → l'utiliser** (pas de recomposition)
2. **Jamais deux wrappers pour le même besoin** — si un nouveau besoin apparaît, enrichir le wrapper existant ou en créer un seul nouveau
3. **Colonne "Utilisé dans"** mise à jour à chaque développement

## Suivi

À chaque page construite, mettre à jour la colonne "Utilisé dans" des wrappers utilisés. Si un wrapper n'est jamais utilisé après la reconstruction complète, il sera supprimé.
