import { NavLink, useLocation } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type UserNavigationConfig } from '@/hooks/useUserNavigationConfigs';
import { useClientPath } from '@/hooks/useClientPath';
import { getLucideIconFromKebab } from '@/lib/lucide-icon-lookup';
import { getNavItemUrl, isPathActive, isNavItemActive } from './sidebar-nav-utils';

function getIconComponent(iconName: string | null): React.ElementType | null {
  return getLucideIconFromKebab(iconName) || null;
}

interface SidebarNavItemProps {
  item: UserNavigationConfig;
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const location = useLocation();
  const cp = useClientPath();

  const IconComponent = getIconComponent(item.icon);
  const hasChildren = item.children && item.children.length > 0;
  const itemUrl = getNavItemUrl(item, cp);
  const isGroup = !item.view_config_id && !item.url;
  const isItemActive = isNavItemActive(item, location.pathname, cp);
  // Use display_label for end users, fallback to label
  const displayName = item.display_label || item.label;

  if (hasChildren && isGroup) {
    // Collapsible group
    return (
      <Collapsible key={item.id} defaultOpen={isItemActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={displayName}>
              {IconComponent && <IconComponent className="h-4 w-4" />}
              <span>{displayName}</span>
              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children!.map(child => {
                const childIsGroup = !child.view_config_id && !child.url;
                const childHasChildren = child.children && child.children.length > 0;

                if (childIsGroup && childHasChildren) {
                  // Recursive collapsible for subgroups
                  return <SidebarNavItem key={child.id} item={child} />;
                }

                const ChildIcon = getIconComponent(child.icon);
                const childUrl = getNavItemUrl(child, cp);
                const isChildActive = isPathActive(location.pathname, childUrl);

                return (
                  <SidebarMenuSubItem key={child.id}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isChildActive}
                    >
                      <NavLink to={childUrl}>
                        {ChildIcon && <ChildIcon className="h-3 w-3" />}
                        <span>{child.display_label || child.label}</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  // Regular nav item (leaf)
  return (
    <SidebarMenuItem key={item.id}>
      <SidebarMenuButton
        asChild
        tooltip={displayName}
        isActive={isPathActive(location.pathname, itemUrl)}
        className={cn(
          "transition-colors",
          isPathActive(location.pathname, itemUrl) && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <NavLink to={itemUrl}>
          {IconComponent && <IconComponent className="h-4 w-4" />}
          <span>{displayName}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
