import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { NAVBAR_STYLES } from '@/lib/design/navbar-styles';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useCurrentClientDesignConfig } from '@/hooks/useClientDesignConfig';
import { useUserNavigationConfigs, buildUserNavigationTree, type UserNavigationConfig } from '@/hooks/useUserNavigationConfigs';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  LayoutDashboard,
  Users,
  Building2,
  GitBranch,
  FileBox,
  Settings,
  ChevronUp,
  ChevronLeft,
  LogOut,
  Shield,
  Workflow,
  Database,
  Crown,
  ArrowLeftRight,
  Palette,
  User,
  Sliders,
  Menu,
  Layers,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { useClientPath } from '@/hooks/useClientPath';
import { ADMIN_ROUTES, CLIENT_ROUTES, SHARED_ROUTES } from '@/lib/routes';
import { SidebarNavItem } from '@/components/layout/SidebarNavItem';
import { ClientSelectionDialog } from '@/components/layout/ClientSelectionDialog';

// Navigation items for ADMIN/platform mode (visible to all, some filtered by role)
const platformNavItems = [
  {
    title: 'Clients',
    url: ADMIN_ROUTES.CLIENTS,
    icon: Building2,
    adminOnly: false,
  },
  {
    title: 'Intégrateurs',
    url: ADMIN_ROUTES.INTEGRATORS,
    icon: Users,
    adminOnly: true,
  },
];

const integratorGroupsDef = [
  [
    { title: 'Navigation', path: CLIENT_ROUTES.MODULES, icon: Layers },
  ],
  [
    { title: 'Organisation', path: CLIENT_ROUTES.ENTITIES, icon: GitBranch },
    { title: 'Profils', path: CLIENT_ROUTES.PROFILES, icon: UserCog },
    { title: 'Utilisateurs', path: CLIENT_ROUTES.USERS, icon: Users },
  ],
  [
    { title: 'Listes', path: CLIENT_ROUTES.LISTES, icon: Database },
    { title: 'Affichage & Design', path: CLIENT_ROUTES.DESIGN, icon: Palette },
  ],
];

function getFirstNavUrl(items: UserNavigationConfig[], cp: (path: string) => string): string | null {
  for (const item of items) {
    if (item.view_config_id && item.view_config) return cp(CLIENT_ROUTES.USER_VIEW(item.view_config.slug));
    if (item.url) return item.url;
    if (item.children?.length) {
      const child = getFirstNavUrl(item.children, cp);
      if (child) return child;
    }
  }
  return null;
}

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const cp = useClientPath();

  const {
    mode,
    isAdmin,
    selectedClient,
    availableClients,
    isProfileConfigured,
    activeProfile,
    switchToIntegratorMode,
    switchToAdminMode,
    switchToUserFinalMode,
  } = useViewMode();

  // Client logo (user_final mode only) — from React Query cache, no extra request if already fetched
  const { data: designConfig } = useCurrentClientDesignConfig();
  const clientLogoUrl = mode === 'user_final' ? (designConfig?.logo_url ?? null) : null;

  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  // Fetch navigation configs for user_final mode (with permission filtering)
  const { data: navigationConfigs = [], isLoading: isNavLoading } = useUserNavigationConfigs();
  
  // Build navigation tree
  const navigationTree = useMemo(() => buildUserNavigationTree(navigationConfigs), [navigationConfigs]);

  // Build integrator nav groups with client-scoped URLs
  const integratorConfigGroups = useMemo(() =>
    integratorGroupsDef.map(group =>
      group.map(item => ({ title: item.title, url: cp(item.path), icon: item.icon }))
    ),
  [cp]);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return availableClients;
    const search = clientSearch.toLowerCase();
    return availableClients.filter(
      client => client.name.toLowerCase().includes(search)
    );
  }, [availableClients, clientSearch]);

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.[0]?.toUpperCase() ?? 'U';
  };

  const isActive = (path: string) => location.pathname === path;

  const handleSelectClient = (client: typeof availableClients[0]) => {
    switchToIntegratorMode(client);
    setClientDialogOpen(false);
    setClientSearch('');
    navigate(`/dashboard/${client.id}${CLIENT_ROUTES.MODULES}`);
  };

  const handleSwitchToAdmin = () => {
    switchToAdminMode();
    navigate(ADMIN_ROUTES.CLIENTS);
  };

  const handleSwitchToUserFinal = () => {
    if (!isProfileConfigured) {
      navigate(cp(CLIENT_ROUTES.USER_PROFILES));
    } else {
      switchToUserFinalMode();
      // Navigate to USER_HOME first — the useEffect will redirect to the first
      // permitted view once the nav tree reloads with permission filtering.
      navigate(cp(CLIENT_ROUTES.USER_HOME));
    }
  };

  // Fallback: if nav loads after the mode switch and we're stuck on USER_HOME, redirect to first item
  useEffect(() => {
    if (mode === 'user_final' && location.pathname === cp(CLIENT_ROUTES.USER_HOME) && navigationTree.length > 0) {
      const firstUrl = getFirstNavUrl(navigationTree, cp);
      if (firstUrl) navigate(firstUrl, { replace: true });
    }
  }, [mode, navigationTree, location.pathname, cp, navigate]);

  const handleOpenProfileManagement = () => {
    navigate(cp(CLIENT_ROUTES.USER_PROFILES));
  };

  const renderNavItems = (items: Array<{ title: string; url: string; icon: React.ElementType }>, label?: string) => (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className={NAVBAR_STYLES.groupLabel}>
          {!collapsed && label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive(item.url)}
                className={cn(
                  "transition-colors",
                  isActive(item.url) && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <NavLink to={item.url}>
                  <item.icon className="h-5 w-5" />
                  <span className={NAVBAR_STYLES.navItem}>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  // Render dynamic navigation for user_final mode
  const renderDynamicNav = () => {
    // Show loading state while permissions are being loaded
    if (isNavLoading) {
      return (
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted-foreground text-xs uppercase tracking-wider">
            {!collapsed && 'Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 space-y-2">
              <div className="h-8 bg-muted/50 rounded animate-pulse" />
              <div className="h-8 bg-muted/50 rounded animate-pulse" />
              <div className="h-8 bg-muted/50 rounded animate-pulse" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    if (navigationTree.length === 0) {
      return (
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted-foreground text-xs uppercase tracking-wider">
            {!collapsed && 'Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex flex-col items-center py-4 px-3">
              <Menu className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">
                Aucune navigation configurée
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-muted-foreground text-xs uppercase tracking-wider">
          {!collapsed && 'Navigation'}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigationTree.map(item => <SidebarNavItem key={item.id} item={item} />)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  // Count selected roles for badge
  const selectedRolesCount = activeProfile?.roleIds.length ?? 0;

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="p-0">
          <div className="flex items-center gap-3 px-4 py-4">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2 mx-auto">
                {mode === 'user_final' && clientLogoUrl ? (
                  <div className="flex h-9 w-9 items-center justify-center shrink-0">
                    <img
                      src={clientLogoUrl}
                      alt="Logo"
                      className="max-h-8 max-w-[2rem] w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center shrink-0">
                    <img src="/logo-delta-icon.svg" alt="Delta RM" className="h-7 w-auto object-contain" />
                  </div>
                )}
                <SidebarTrigger className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                  <PanelLeftOpen className="h-4 w-4" />
                </SidebarTrigger>
              </div>
            ) : (
              <>
                {mode === 'user_final' && clientLogoUrl ? (
                  /* Client logo — user_final mode with custom logo */
                  <div className="flex items-center flex-1 min-w-0 gap-2">
                    <img
                      src={clientLogoUrl}
                      alt="Logo client"
                      className="max-h-8 w-auto max-w-[140px] object-contain shrink-0"
                    />
                  </div>
                ) : (
                  /* Default Olympe brand */
                  <div className="flex items-center flex-1 min-w-0">
                    <img src="/logo-delta.svg" alt="Delta RM" className="h-8 w-auto max-w-[140px] object-contain" />
                  </div>
                )}
                <SidebarTrigger className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                  <PanelLeftClose className="h-4 w-4" />
                </SidebarTrigger>
              </>
            )}
          </div>
          {mode === 'integrator' && selectedClient && !collapsed && (
            <div className="w-full bg-primary/5 px-4 py-2 flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchToAdmin}
                className="w-full justify-between px-0 h-auto text-amber-600 hover:bg-transparent hover:text-amber-700"
              >
                <div className="flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="underline">Retour Admin</span>
                  <Crown className="h-4 w-4 ml-1" />
                </div>
              </Button>
              <span className="text-[14px] font-semibold text-secondary-foreground truncate block">
                Espace {selectedClient.name}
              </span>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          {mode === 'admin' ? (
            // Admin/platform mode navigation (filtered by role)
            <>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {platformNavItems.filter(item => !item.adminOnly || isAdmin).map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.title}
                          isActive={isActive(item.url)}
                          className={cn(
                            "transition-colors",
                            isActive(item.url) && "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                        >
                          <NavLink to={item.url}>
                            <item.icon className="h-5 w-5" />
                            <span className={NAVBAR_STYLES.navItem}>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : mode === 'integrator' ? (
            // Integrator mode: config items
            <>
              {integratorConfigGroups.map((group, i) => (
                <Fragment key={i}>
                  {i > 0 && <SidebarSeparator className="my-2" />}
                  {renderNavItems(group)}
                </Fragment>
              ))}
            </>
          ) : (
            // User final mode navigation
            <>
              {renderDynamicNav()}
            </>
          )}

          {/* Design System (admin only) + Mode switchers */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Design System — admin mode, pinned at bottom */}
                {mode === 'admin' && (
                  <>
                    <SidebarSeparator className="mb-2" />
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="Design System"
                        isActive={isActive(SHARED_ROUTES.DESIGN_SYSTEM)}
                        className={cn(
                          "transition-colors",
                          isActive(SHARED_ROUTES.DESIGN_SYSTEM) && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                      >
                        <NavLink to={SHARED_ROUTES.DESIGN_SYSTEM}>
                          <Palette className="h-5 w-5" />
                          <span className={NAVBAR_STYLES.navItem}>Design System</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {/* Profile management button (user_final mode) */}
                {mode === 'user_final' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Gérer mes profils"
                      onClick={handleOpenProfileManagement}
                      className="text-muted-foreground hover:bg-accent"
                    >
                      <Sliders className="h-4 w-4" />
                      <span className="truncate">{activeProfile?.name || 'Gérer les profils'}</span>
                      {selectedRolesCount > 0 && (
                        <Chip variant="default" className="ml-auto text-xs">
                          {selectedRolesCount} rôle{selectedRolesCount > 1 ? 's' : ''}
                        </Chip>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Switch to User Final mode (from integrator) */}
                {mode === 'integrator' && selectedClient && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Mode User Final"
                      onClick={handleSwitchToUserFinal}
                      className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    >
                      <User className="h-4 w-4" />
                      <span>Mode User Final</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Switch back to Integrator mode (from user_final) */}
                {mode === 'user_final' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Mode Intégrateur"
                      onClick={() => {
                        switchToIntegratorMode(selectedClient!);
                        navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS));
                      }}
                      className="text-primary hover:bg-primary/10"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      <span>Mode Intégrateur</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-12 border border-border rounded-lg">
                    <Avatar className="h-8 w-8">
                      {user?.user_metadata?.avatar_url && <AvatarImage src={user.user_metadata.avatar_url} />}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(user?.user_metadata?.full_name, user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                      <div className="flex flex-col items-start flex-1 overflow-hidden">
                        <span className={cn(NAVBAR_STYLES.profileName, "truncate w-full text-left")}>
                          {user?.user_metadata?.full_name || 'Utilisateur'}
                        </span>
                        <span className={cn(NAVBAR_STYLES.profileEmail, "truncate w-full text-left")}>
                          {user?.email}
                        </span>
                      </div>
                    )}
                    {!collapsed && <ChevronUp className="h-4 w-4 shrink-0" />}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-56"
                >
                  <DropdownMenuItem asChild>
                    <NavLink to={SHARED_ROUTES.SETTINGS} className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Paramètres
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Client selection dialog */}
      <ClientSelectionDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        clients={availableClients}
        filteredClients={filteredClients}
        search={clientSearch}
        onSearchChange={setClientSearch}
        onSelectClient={handleSelectClient}
      />
    </>
  );
}
