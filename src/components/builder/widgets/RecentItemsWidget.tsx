import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, FileText } from 'lucide-react';
import { queryKeys } from '@/lib/query-keys';

interface RecentItemsConfig {
  bo_definition_ids?: string[];
  limit?: number;
}

interface RecentItemsWidgetProps {
  title?: string;
  config: RecentItemsConfig;
  className?: string;
}

export function RecentItemsWidget({ title, config, className }: RecentItemsWidgetProps) {
  const limit = config.limit || 5;

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.widgets.recentItems(config.bo_definition_ids, limit),
    queryFn: async () => {
      const params = new URLSearchParams({
        is_archived: 'false',
        sort: 'updated_at',
        order: 'desc',
        limit: String(limit),
        include: 'definition',
      });

      if (config.bo_definition_ids && config.bo_definition_ids.length > 0) {
        params.set('definition_ids', config.bo_definition_ids.join(','));
      }

      const data = await api.get<{
        id: string;
        reference_number: string;
        title: string | null;
        status: string | null;
        updated_at: string;
        definition: { name: string; icon: string | null; color: string | null } | null;
      }[]>(`/api/business-objects?${params.toString()}`);

      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{title || 'Éléments récents'}</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full max-h-[300px]">
          <div className="p-4 pt-0 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Aucun élément récent
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.reference_number}
                      </span>
                      {item.definition?.name && (
                        <Chip variant="outline" className="text-xs">
                          {item.definition.name}
                        </Chip>
                      )}
                    </div>
                    <p className="text-sm truncate">{item.title || 'Sans titre'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
