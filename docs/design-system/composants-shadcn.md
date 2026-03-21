# Composants shadcn/ui — Référence

> Composants copiés tels quels depuis [ui.shadcn.com](https://ui.shadcn.com). Ne pas modifier, ne pas dupliquer.
> Page design system : `/design-system`

## Inventaire

| Composant | Fichier | Quand l'utiliser | Utilisé dans |
|-----------|---------|-----------------|--------------|
| **Alert** | `alert.tsx` | Messages d'information, avertissement, erreur inline | — |
| **AlertDialog** | `alert-dialog.tsx` | Confirmation d'action destructive (archivage, suppression) | — |
| **Avatar** | `avatar.tsx` | Photo/initiales utilisateur | — |
| **Breadcrumb** | `breadcrumb.tsx` | Fil d'ariane de navigation | — |
| **Button** | `button.tsx` | Tout bouton. Variants : default, destructive, outline, secondary, ghost, link. Sizes : default, sm, lg, icon | — |
| **Calendar** | `calendar.tsx` | Sélection de date (picker) | — |
| **Card** | `card.tsx` | Conteneur avec header/content/footer | — |
| **Checkbox** | `checkbox.tsx` | Case à cocher | — |
| **Collapsible** | `collapsible.tsx` | Section dépliable/repliable | — |
| **Command** | `command.tsx` | Palette de commandes (recherche + sélection). Utilisé en interne par SearchableSelect | — |
| **Dialog** | `dialog.tsx` | Modale générique. Pour modale + formulaire → utiliser **FormDialog** wrapper | — |
| **DropdownMenu** | `dropdown-menu.tsx` | Menu contextuel. Pour menu actions tableau → utiliser **TableActionMenu** wrapper | — |
| **Form** | `form.tsx` | Formulaire react-hook-form avec validation zod | — |
| **HoverCard** | `hover-card.tsx` | Carte au survol (preview) | — |
| **Input** | `input.tsx` | Champ texte standard. Pour label flottant → utiliser **FloatingInput** wrapper | — |
| **Label** | `label.tsx` | Label de champ de formulaire | — |
| **Popover** | `popover.tsx` | Bulle de contenu au clic | — |
| **Progress** | `progress.tsx` | Barre de progression | — |
| **RadioGroup** | `radio-group.tsx` | Groupe de boutons radio | — |
| **ScrollArea** | `scroll-area.tsx` | Zone scrollable avec scrollbar stylisée | — |
| **Select** | `select.tsx` | Select déroulant simple (< 10 options). Pour recherche → utiliser **SearchableSelect** wrapper | — |
| **Separator** | `separator.tsx` | Ligne de séparation (horizontal/vertical) | — |
| **Sheet** | `sheet.tsx` | Panneau latéral générique. Pour détails d'une ressource → utiliser **DetailsDrawer** wrapper | — |
| **Sidebar** | `sidebar.tsx` | Navigation latérale complète (24 sous-composants shadcn) | — |
| **Skeleton** | `skeleton.tsx` | Placeholder de chargement (forme grisée animée) | — |
| **Slider** | `slider.tsx` | Curseur de valeur numérique | — |
| **Switch** | `switch.tsx` | Toggle on/off (paramètres, feature flags) | — |
| **Table** | `table.tsx` | Tableau HTML sémantique stylisé (Table, TableHeader, TableBody, TableRow, TableHead, TableCell) | — |
| **Tabs** | `tabs.tsx` | Onglets (Tabs, TabsList, TabsTrigger, TabsContent) | — |
| **Textarea** | `textarea.tsx` | Champ texte multi-lignes | — |
| **Toggle** | `toggle.tsx` | Bouton toggle (toolbar : gras, italique) | — |
| **ToggleGroup** | `toggle-group.tsx` | Groupe de toggles (single ou multiple) | — |
| **Tooltip** | `tooltip.tsx` | Info-bulle au survol | — |

## Règle

**Ne jamais utiliser un composant shadcn brut si un wrapper existe pour le même besoin.** Vérifier la page [wrappers](wrappers.md) avant.

## Suivi d'utilisation

La colonne "Utilisé dans" est mise à jour à chaque développement de page. Si un composant n'est utilisé nulle part après la reconstruction complète, il sera supprimé.
