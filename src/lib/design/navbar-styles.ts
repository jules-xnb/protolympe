// ---------------------------------------------------------------------------
// Navbar typography styles — source of truth for all sidebar text components.
// Changing values here updates AppSidebar, integrator nav, and user-final nav.
// ---------------------------------------------------------------------------

export const NAVBAR_STYLES = {
  /** Nav item label (Clients, Entités, Design System…) — Body 1 / texte primary #232332 */
  navItem: 'text-[16px] font-normal text-foreground',

  /** Section group label (ADMINISTRATION, CONFIGURATION…) */
  groupLabel: 'text-xs font-medium text-secondary-foreground uppercase tracking-wider',

  /** User full name in the sidebar footer */
  profileName: 'text-sm font-medium',

  /** User email in the sidebar footer */
  profileEmail: 'text-xs text-secondary-foreground',

  /** Role/count badge in the sidebar */
  badge: 'text-xs font-medium',
} as const;

export type NavbarStyleKey = keyof typeof NAVBAR_STYLES;
