import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// LucideIcons is a namespace of named exports, not a Record.
// This lookup map provides type-safe dynamic access by icon name.
const iconsMap = LucideIcons as unknown as Record<string, LucideIcon | undefined>;

/**
 * Look up a Lucide icon component by its PascalCase name.
 * Returns undefined if the name doesn't match any icon.
 */
export function getLucideIcon(name: string | null | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  return iconsMap[name];
}

/**
 * Look up a Lucide icon by its kebab-case name (e.g. "arrow-right" -> "ArrowRight").
 * Returns undefined if the name doesn't match any icon.
 */
export function getLucideIconFromKebab(name: string | null | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return iconsMap[pascalName];
}
