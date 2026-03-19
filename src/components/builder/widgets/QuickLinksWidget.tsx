import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getLucideIcon } from '@/lib/lucide-icon-lookup';
import { useClientPath } from '@/hooks/useClientPath';

interface QuickLink {
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

interface QuickLinksConfig {
  links?: QuickLink[];
  layout?: 'grid' | 'list';
}

interface QuickLinksWidgetProps {
  title?: string;
  config: QuickLinksConfig;
  className?: string;
}

function getIconComponent(iconName: string | undefined): LucideIcon {
  return getLucideIcon(iconName) || Link2;
}

export function QuickLinksWidget({ title, config, className }: QuickLinksWidgetProps) {
  const cp = useClientPath();
  const links = config.links || [
    { label: 'Nouveau risque', url: '/user/objects/risques/new', icon: 'Plus' },
    { label: 'Mes tâches', url: '/user/views/mes-taches', icon: 'CheckSquare' },
    { label: 'Rapports', url: '/user/views/rapports', icon: 'FileText' },
  ];

  const layout = config.layout || 'grid';

  // Resolve URLs: if a link starts with /dashboard/, strip the prefix and use cp().
  // Otherwise (for relative paths without /dashboard/), use cp() directly.
  const resolveUrl = (url: string): string => {
    if (url.startsWith('/dashboard/')) {
      return cp(url.replace(/^\/dashboard/, ''));
    }
    if (url.startsWith('/')) {
      return cp(url);
    }
    return url;
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title || 'Raccourcis'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            layout === 'grid'
              ? 'grid grid-cols-2 gap-2'
              : 'flex flex-col gap-2'
          )}
        >
          {links.map((link, index) => {
            const Icon = getIconComponent(link.icon);
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto py-3 justify-start gap-2"
                asChild
              >
                <Link to={resolveUrl(link.url)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
