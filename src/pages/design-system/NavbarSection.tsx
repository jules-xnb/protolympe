import { NAVBAR_STYLES, type NavbarStyleKey } from '@/lib/design/navbar-styles';
import { Building2, Palette, Users, ChevronUp, GitBranch, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Navbar components catalogue — mirrors AppSidebar structure
// ---------------------------------------------------------------------------

const navbarComponents: Array<{
  component: string;
  element: string;
  styleKey: NavbarStyleKey;
  description: string;
  preview: string;
}> = [
  {
    component: 'NavItem',
    element: 'span',
    styleKey: 'navItem',
    description: "Texte des items de navigation dans toutes les sidebars (admin, intégrateur, user final)",
    preview: "Clients",
  },
  {
    component: 'GroupLabel',
    element: 'div',
    styleKey: 'groupLabel',
    description: "Labels de groupes dans la sidebar (Configuration, Navigation…)",
    preview: "Configuration",
  },
  {
    component: 'ProfileName',
    element: 'span',
    styleKey: 'profileName',
    description: "Nom de l'utilisateur dans le footer de la sidebar",
    preview: "Jean Dupont",
  },
  {
    component: 'ProfileEmail',
    element: 'span',
    styleKey: 'profileEmail',
    description: "Email de l'utilisateur dans le footer de la sidebar",
    preview: "jean.dupont@delta.com",
  },
  {
    component: 'Badge',
    element: 'span',
    styleKey: 'badge',
    description: "Badge compteur dans la sidebar (ex. nombre de rôles actifs)",
    preview: "3 rôles",
  },
];

// ---------------------------------------------------------------------------
// Visual sidebar mockup
// ---------------------------------------------------------------------------

function SidebarMockup() {
  return (
    <div className="w-56 border border-border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col text-sidebar-foreground">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <img src="/logo-delta.svg" alt="Delta RM" className="h-6 w-auto object-contain" />
      </div>

      {/* Group label */}
      <div className="px-3 pt-4 pb-1">
        <div className={cn(NAVBAR_STYLES.groupLabel)}>Administration</div>
      </div>

      {/* Nav items */}
      <div className="px-2 space-y-0.5">
        {[
          { icon: Building2, label: 'Clients', active: true },
          { icon: Users, label: 'Intégrateurs', active: false },
        ].map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={NAVBAR_STYLES.navItem}>{label}</span>
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Separator + Design System */}
      <div className="px-2 pb-1">
        <div className="border-t border-border my-2" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sidebar-foreground">
          <Palette className="h-4 w-4 shrink-0" />
          <span className={NAVBAR_STYLES.navItem}>Design System</span>
        </div>
      </div>

      {/* Profile footer */}
      <div className="border-t border-border px-3 py-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="text-xs font-medium text-primary-foreground">JD</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className={cn(NAVBAR_STYLES.profileName, "truncate")}>Jean Dupont</span>
          <span className={cn(NAVBAR_STYLES.profileEmail, "truncate")}>jean.dupont@delta.com</span>
        </div>
        <ChevronUp className="h-4 w-4 text-secondary-foreground shrink-0" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MenuItem component states preview
// ---------------------------------------------------------------------------

const menuItems = [
  { icon: Building2, label: 'Clients' },
  { icon: Users, label: 'Intégrateurs' },
  { icon: GitBranch, label: 'Entités Org.' },
  { icon: Shield, label: 'Rôles' },
  { icon: Palette, label: 'Design System' },
];

function MenuItemRow({
  icon: Icon,
  label,
  state,
}: {
  icon: React.ElementType;
  label: string;
  state: 'default' | 'hover' | 'active';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-2 rounded-md w-full transition-colors',
        state === 'active' && 'bg-[#F4F6F9]',
        state === 'hover' && 'bg-[#F4F6F9]',
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', state === 'active' ? 'text-sidebar-accent-foreground' : 'text-foreground')} />
      <span className={cn(NAVBAR_STYLES.navItem, state === 'active' && 'text-sidebar-accent-foreground font-medium')}>
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

export function NavbarSection() {
  return (
    <section className="space-y-8">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Navbar
      </h2>
      <p className="text-sm text-secondary-foreground">
        Composants typographiques utilisés dans la barre de navigation latérale (admin, intégrateur, user final).
        Modifier les classes dans{' '}
        <code className="text-[12px] font-mono bg-muted px-1 py-0.5 rounded">
          src/lib/design/navbar-styles.ts
        </code>{' '}
        pour propager les changements partout dans la plateforme.
      </p>

      <div className="flex gap-10 items-start">
        {/* Catalogue typographie */}
        <div className="flex-1 space-y-0 divide-y divide-border border border-border rounded-lg overflow-hidden">
          {navbarComponents.map((item) => (
            <div key={item.component} className="flex items-start gap-6 px-5 py-4 bg-card">
              <div className="w-44 shrink-0 space-y-1">
                <span className="text-sm font-semibold text-foreground">{item.component}</span>
                <span className="block text-xs text-secondary-foreground">&lt;{item.element}&gt;</span>
                <code className="block text-[11px] text-secondary-foreground/80 font-mono leading-relaxed break-all">
                  {NAVBAR_STYLES[item.styleKey]}
                </code>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs text-secondary-foreground">{item.description}</p>
                <p className={NAVBAR_STYLES[item.styleKey]}>{item.preview}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Visual mockup */}
        <div className="shrink-0">
          <p className="text-xs text-secondary-foreground mb-3 font-medium uppercase tracking-wider">Aperçu</p>
          <SidebarMockup />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Composants                                                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-6">
        <h3 className="text-[16px] font-semibold text-foreground border-b border-border pb-3">
          Composants
        </h3>

        {/* MenuItem */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">MenuItem</h4>
          <p className="text-xs text-secondary-foreground">
            Item de navigation de la sidebar — composant <code className="font-mono bg-muted px-1 py-0.5 rounded">SidebarMenuButton</code>.
            Padding : <code className="font-mono bg-muted px-1 py-0.5 rounded">p-2</code> · Hauteur : <code className="font-mono bg-muted px-1 py-0.5 rounded">h-8</code>.
          </p>

          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {/* Default */}
            <div className="flex items-start gap-6 px-5 py-4 bg-card">
              <div className="w-24 shrink-0 pt-1">
                <span className="text-xs font-medium text-secondary-foreground">Default</span>
              </div>
              <div className="w-56 bg-sidebar rounded-lg p-2 space-y-0.5">
                {menuItems.slice(0, 3).map((item) => (
                  <MenuItemRow key={item.label} {...item} state="default" />
                ))}
              </div>
            </div>

            {/* Hover */}
            <div className="flex items-start gap-6 px-5 py-4 bg-card">
              <div className="w-24 shrink-0 pt-1">
                <span className="text-xs font-medium text-secondary-foreground">Hover</span>
              </div>
              <div className="w-56 bg-sidebar rounded-lg p-2 space-y-0.5">
                {menuItems.slice(0, 3).map((item) => (
                  <MenuItemRow key={item.label} {...item} state="hover" />
                ))}
              </div>
            </div>

            {/* Active */}
            <div className="flex items-start gap-6 px-5 py-4 bg-card">
              <div className="w-24 shrink-0 pt-1">
                <span className="text-xs font-medium text-secondary-foreground">Active</span>
              </div>
              <div className="w-56 bg-sidebar rounded-lg p-2 space-y-0.5">
                <MenuItemRow {...menuItems[0]} state="active" />
                {menuItems.slice(1, 3).map((item) => (
                  <MenuItemRow key={item.label} {...item} state="default" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* GroupLabel */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">GroupLabel</h4>
          <p className="text-xs text-secondary-foreground">
            Label de section dans la sidebar — composant <code className="font-mono bg-muted px-1 py-0.5 rounded">SidebarGroupLabel</code>.
            Hauteur : <code className="font-mono bg-muted px-1 py-0.5 rounded">h-8</code> · Padding : <code className="font-mono bg-muted px-1 py-0.5 rounded">px-2</code>.
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-start gap-6 px-5 py-4 bg-card">
              <div className="w-24 shrink-0 pt-1">
                <span className="text-xs font-medium text-secondary-foreground">Default</span>
              </div>
              <div className="w-56 bg-sidebar rounded-lg p-2">
                <div className={cn(NAVBAR_STYLES.groupLabel, 'px-2 h-8 flex items-center')}>Administration</div>
                <div className={cn(NAVBAR_STYLES.groupLabel, 'px-2 h-8 flex items-center')}>Configuration</div>
                <div className={cn(NAVBAR_STYLES.groupLabel, 'px-2 h-8 flex items-center')}>Navigation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile footer */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Profile footer</h4>
          <p className="text-xs text-secondary-foreground">
            Dropdown utilisateur en bas de la sidebar — composant <code className="font-mono bg-muted px-1 py-0.5 rounded">SidebarMenuButton</code> taille <code className="font-mono bg-muted px-1 py-0.5 rounded">lg</code>.
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-start gap-6 px-5 py-4 bg-card">
              <div className="w-24 shrink-0 pt-1">
                <span className="text-xs font-medium text-secondary-foreground">Default</span>
              </div>
              <div className="w-56 bg-sidebar rounded-lg border border-border">
                <div className="flex items-center gap-2 px-3 py-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary-foreground">JD</span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={cn(NAVBAR_STYLES.profileName, 'truncate')}>Jean Dupont</span>
                    <span className={cn(NAVBAR_STYLES.profileEmail, 'truncate')}>jean.dupont@delta.com</span>
                  </div>
                  <ChevronUp className="h-4 w-4 text-secondary-foreground shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
