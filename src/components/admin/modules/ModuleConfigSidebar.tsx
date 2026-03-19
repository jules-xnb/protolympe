import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useClientModule } from '@/hooks/useModules';
import { getModuleCatalog } from '@/lib/module-catalog';
import { NAVBAR_STYLES } from '@/lib/design/navbar-styles';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  FileBox,
  Workflow,
  Shield,
  Lock,
  Package,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ModuleConfigSidebar() {
  const { clientId, moduleId } = useParams<{ clientId: string; moduleId: string }>();
  const location = useLocation();
  const { data: module } = useClientModule(moduleId);

  const catalog = module ? getModuleCatalog(module.module_slug) : undefined;

  const basePath = `/dashboard/${clientId}/modules/${moduleId}`;
  const isActive = (path: string) => location.pathname === path;

  // Build nav sections based on catalog capabilities
  const navSections: Array<{ title: string; path: string; icon: React.ElementType }> = [
    { title: 'Affichage', path: `${basePath}/display`, icon: Monitor },
  ];

  if (catalog?.hasBo) {
    navSections.push({ title: 'Objets métiers', path: `${basePath}/bo`, icon: FileBox });
  }

  if (catalog?.hasWorkflows) {
    navSections.push({ title: 'Workflows', path: `${basePath}/workflows`, icon: Workflow });
  }

  if (catalog?.hasRoles) {
    navSections.push({ title: 'Rôles', path: `${basePath}/roles`, icon: Shield });
    navSections.push({ title: 'Permissions', path: `${basePath}/permissions`, icon: Lock });
  }

  const moduleName = catalog?.label ?? module?.module_slug ?? 'Module';

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          {/* Module name header */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="pointer-events-none font-semibold"
                tooltip={moduleName}
              >
                <Package className="h-5 w-5" />
                <span className={cn(NAVBAR_STYLES.navItem, 'font-semibold')}>{moduleName}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator className="my-2" />

          {/* Navigation links */}
          <SidebarMenu>
            {navSections.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive(item.path)}
                  className={cn(
                    'transition-colors',
                    isActive(item.path) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <NavLink to={item.path}>
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
  );
}
