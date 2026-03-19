import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';

interface StatsCardConfig {
  bo_definition_id?: string;
  metric?: 'count' | 'sum' | 'avg';
  field_slug?: string;
  filter?: Record<string, unknown>;
  icon?: string;
  color?: string;
  show_trend?: boolean;
}

interface StatsCardWidgetProps {
  title?: string;
  config: StatsCardConfig;
  className?: string;
}

export function StatsCardWidget({ title, config, className }: StatsCardWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.widgets.statsCard(config.bo_definition_id, config.metric),
    queryFn: async () => {
      if (!config.bo_definition_id) return { value: 0, trend: 0 };

      // Count business objects
      const result = await api.get<{ count: number }>(
        `/api/business-objects?definition_id=${config.bo_definition_id}&is_archived=false&count=true&head=true`
      );

      // TODO: Add trend calculation (compare with previous period)
      return { value: result.count || 0, trend: 0 };
    },
    enabled: !!config.bo_definition_id,
  });

  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = data?.trend && data.trend > 0 
    ? TrendingUp 
    : data?.trend && data.trend < 0 
      ? TrendingDown 
      : Minus;

  const trendColor = data?.trend && data.trend > 0 
    ? 'text-green-500' 
    : data?.trend && data.trend < 0 
      ? 'text-red-500' 
      : 'text-muted-foreground';

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title || 'Statistique'}</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{data?.value ?? 0}</div>
        {config.show_trend && data?.trend !== undefined && (
          <p className={cn("text-xs flex items-center gap-1", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            {data.trend > 0 ? '+' : ''}{data.trend}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
