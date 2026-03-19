import {
  Type,
  AlignLeft,
  Hash,
  Calculator,
  Calendar,
  CalendarClock,
  Clock,
  CheckSquare,
  List,
  ListChecks,
  Mail,
  Phone,
  Link as LinkIcon,
  Sigma,
  UserSearch,
  Building2,
  PackageSearch,
  GitCompare,
  FileText,
  Image,
  ToggleLeft,
  UserCircle,
  SeparatorHorizontal,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Canonical field type registry
// ---------------------------------------------------------------------------

export interface FieldTypeEntry {
  value: string;
  label: string;
  icon: LucideIcon;
  group: string;
}

/**
 * Single source of truth for all field types across the application.
 *
 * Every UI that needs to display field type labels, icons or grouped pickers
 * should import from here instead of defining its own local copy.
 */
export const FIELD_TYPES: FieldTypeEntry[] = [
  // Texte
  { value: 'text', label: 'Texte court', icon: Type, group: 'Texte' },
  { value: 'textarea', label: 'Texte long', icon: AlignLeft, group: 'Texte' },
  { value: 'email', label: 'Email', icon: Mail, group: 'Texte' },
  { value: 'phone', label: 'Téléphone', icon: Phone, group: 'Texte' },
  { value: 'url', label: 'URL', icon: LinkIcon, group: 'Texte' },
  // Nombre
  { value: 'number', label: 'Nombre entier', icon: Hash, group: 'Nombre' },
  { value: 'decimal', label: 'Nombre décimal', icon: Calculator, group: 'Nombre' },
  // Date/Heure
  { value: 'date', label: 'Date', icon: Calendar, group: 'Date/Heure' },
  { value: 'datetime', label: 'Date et heure', icon: CalendarClock, group: 'Date/Heure' },
  { value: 'time', label: 'Heure', icon: Clock, group: 'Date/Heure' },
  // Choix
  { value: 'checkbox', label: 'Case à cocher', icon: CheckSquare, group: 'Choix' },
  { value: 'select', label: 'Liste déroulante', icon: List, group: 'Choix' },
  { value: 'multiselect', label: 'Liste à choix multiples', icon: ListChecks, group: 'Choix' },
  { value: 'boolean', label: 'Booléen', icon: ToggleLeft, group: 'Choix' },
  // Médias
  { value: 'document', label: 'Document', icon: FileText, group: 'Médias' },
  { value: 'file', label: 'Fichier', icon: FileText, group: 'Médias' },
  { value: 'image', label: 'Image', icon: Image, group: 'Médias' },
  // Références
  { value: 'user_reference', label: 'Référence utilisateur', icon: UserSearch, group: 'Références' },
  { value: 'eo_reference', label: 'Référence entité org.', icon: Building2, group: 'Références' },
  { value: 'object_reference', label: 'Référence objet métier', icon: PackageSearch, group: 'Références' },
  // Avancé
  { value: 'calculated', label: 'Champ calculé', icon: Sigma, group: 'Avancé' },
  { value: 'aggregation', label: 'Référence', icon: GitCompare, group: 'Avancé' },
  // Spéciaux
  { value: 'section', label: 'Section', icon: SeparatorHorizontal, group: 'Mise en page' },
  { value: 'initials', label: 'Initiales', icon: UserCircle, group: 'Spécial' },
];

// Pre-built lookup maps for O(1) access
const _typeMap = new Map<string, FieldTypeEntry>(
  FIELD_TYPES.map((t) => [t.value, t])
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the human-readable label for a field type, or the raw type if unknown. */
export const getFieldTypeLabel = (type: string): string =>
  _typeMap.get(type)?.label ?? type;

/** Return the Lucide icon component for a field type, defaulting to `Type`. */
export const getFieldTypeIcon = (type: string): LucideIcon =>
  _typeMap.get(type)?.icon ?? Type;

/** Return field types organised by group (for grouped pickers / selects). */
export function getGroupedFieldTypes(
  filter?: (entry: FieldTypeEntry) => boolean
): Record<string, FieldTypeEntry[]> {
  const entries = filter ? FIELD_TYPES.filter(filter) : FIELD_TYPES;
  return entries.reduce(
    (acc, entry) => {
      if (!acc[entry.group]) acc[entry.group] = [];
      acc[entry.group].push(entry);
      return acc;
    },
    {} as Record<string, FieldTypeEntry[]>
  );
}

/**
 * Group constants — ordered list of group names for consistent rendering.
 */
export const FIELD_TYPE_GROUPS = [
  'Texte',
  'Nombre',
  'Date/Heure',
  'Choix',
  'Médias',
  'Références',
  'Avancé',
  'Mise en page',
  'Spécial',
] as const;
