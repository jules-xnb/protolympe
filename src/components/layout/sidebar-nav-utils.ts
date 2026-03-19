import { type UserNavigationConfig } from '@/hooks/useUserNavigationConfigs';
import { CLIENT_ROUTES } from '@/lib/routes';

/** Get URL for a navigation config item */
export function getNavItemUrl(item: UserNavigationConfig, cp: (path: string) => string): string {
  if (item.type === 'module' && item.client_module_id) {
    return cp(CLIENT_ROUTES.USER_MODULE(item.client_module_id));
  }
  if (item.view_config_id && item.view_config) {
    return cp(CLIENT_ROUTES.USER_VIEW(item.view_config.slug));
  }
  if (item.url) {
    return item.url;
  }
  return '#';
}

/** Check if a pathname matches a URL (exact or sub-route, but not partial segment) */
export function isPathActive(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(url + '/');
}

/** Check if nav item or any of its children is active */
export function isNavItemActive(item: UserNavigationConfig, pathname: string, cp: (path: string) => string): boolean {
  const itemUrl = getNavItemUrl(item, cp);
  if (itemUrl !== '#' && isPathActive(pathname, itemUrl)) {
    return true;
  }
  if (item.children) {
    return item.children.some(child => isNavItemActive(child, pathname, cp));
  }
  return false;
}
