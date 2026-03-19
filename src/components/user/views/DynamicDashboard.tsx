import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Table,
  CreditCard,
  Link2,
  Clock,
  Calendar,
  Puzzle,
  LayoutDashboard,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { useT } from '@/hooks/useT';
import type { ViewConfig, ViewConfigWidget } from '@/hooks/useViewConfigs';
import type { Json } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

interface DashboardConfig {
  columns?: number;
  gap?: number;
  show_header?: boolean;
}

interface WidgetConfig {
  bo_definition_id?: string;
  metric?: 'count' | 'count_today' | 'count_week' | 'count_month';
  chart_type?: 'bar' | 'line' | 'pie' | 'area';
  limit?: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

const WIDGET_ICONS = {
  stats_card: CreditCard,
  chart: BarChart3,
  table: Table,
  quick_links: Link2,
  recent_items: Clock,
  calendar: Calendar,
  custom: Puzzle,
};

function getConfig<T>(json: Json | undefined): T {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as T;
  }
  return {} as T;
}

interface StatsCardWidgetProps {
  widget: ViewConfigWidget;
  boName?: string;
}

function StatsCardWidget({ widget, boName }: StatsCardWidgetProps) {
  const { t, td } = useT();
  const config = getConfig<WidgetConfig>(widget.config);
  
  const { data: count, isLoading } = useQuery({
    queryKey: queryKeys.widgets.stats(widget.id, config.bo_definition_id, config.metric),
    queryFn: async () => {
      if (!config.bo_definition_id) return 0;
      const params = new URLSearchParams({ definition_id: config.bo_definition_id });
      if (config.metric) params.set('metric', config.metric);
      const result = await api.get<{ count: number }>(`/api/business-objects/count?${params}`);
      return result.count || 0;
    },
    enabled: !!config.bo_definition_id,
  });

  const metricLabels: Record<string, string> = {
    count: t('labels.total'),
    count_today: t('views.today'),
    count_week: t('labels.this_week'),
    count_month: t('labels.this_month'),
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {td('view_config_widgets', widget.id, 'title', widget.title) || boName || t('labels.statistic')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{count}</span>
            <span className="text-xs text-muted-foreground">
              {metricLabels[config.metric || 'count']}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChartWidgetProps {
  widget: ViewConfigWidget;
  boName?: string;
}

function ChartWidget({ widget, boName }: ChartWidgetProps) {
  const { t, td } = useT();
  const config = getConfig<WidgetConfig>(widget.config);
  
  // Mock data for now - in real app, fetch from business_objects
  const mockData = [
    { name: t('months.jan'), value: 12 },
    { name: t('months.feb'), value: 19 },
    { name: t('months.mar'), value: 8 },
    { name: t('months.apr'), value: 25 },
    { name: t('months.may'), value: 15 },
    { name: t('months.jun'), value: 22 },
  ];

  const renderChart = () => {
    switch (config.chart_type) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={mockData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
            >
              {mockData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
      case 'line':
        return (
          <LineChart data={mockData}>
            <XAxis dataKey="name" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={mockData}>
            <XAxis dataKey="name" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Area type="monotone" dataKey="value" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" />
          </AreaChart>
        );
      default:
        return (
          <BarChart data={mockData}>
            <XAxis dataKey="name" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {td('view_config_widgets', widget.id, 'title', widget.title) || boName || t('labels.chart')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface RecentItemsWidgetProps {
  widget: ViewConfigWidget;
  boName?: string;
}

function RecentItemsWidget({ widget, boName }: RecentItemsWidgetProps) {
  const { t, td } = useT();
  const config = getConfig<WidgetConfig>(widget.config);
  
  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.widgets.recent(widget.id, config.bo_definition_id, config.limit),
    queryFn: async () => {
      if (!config.bo_definition_id) return [];
      const limit = config.limit || 5;
      return api.get<Array<{ id: string; reference_number: string; created_at: string }>>(`/api/business-objects?definition_id=${config.bo_definition_id}&order=created_at:desc&limit=${limit}&fields=id,reference_number,created_at`);
    },
    enabled: !!config.bo_definition_id,
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {td('view_config_widgets', widget.id, 'title', widget.title) || `${boName} ${t('views.recent_suffix')}` || t('labels.recent_items')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('empty.no_items')}
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.reference_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.reference_number}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(item.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlaceholderWidget({ widget }: { widget: ViewConfigWidget }) {
  const Icon = WIDGET_ICONS[widget.widget_type as keyof typeof WIDGET_ICONS] || Puzzle;
  
  return (
    <Card className="h-full flex items-center justify-center">
      <CardContent className="text-center py-8">
        <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {widget.title || widget.widget_type}
        </p>
      </CardContent>
    </Card>
  );
}

interface DynamicDashboardProps {
  viewConfig: ViewConfig;
  widgets: ViewConfigWidget[];
}

export function DynamicDashboard({ viewConfig, widgets }: DynamicDashboardProps) {
  const { t } = useT();
  const config = getConfig<DashboardConfig>(viewConfig.config);
  
  // Fetch BO definitions for widget labels
  const { data: boDefinitions = [] } = useQuery({
    queryKey: queryKeys.businessObjectDefinitions.map(),
    queryFn: async () => {
      return api.get<Array<{ id: string; name: string }>>('/api/business-objects/definitions?fields=id,name');
    },
  });

  const boMap = useMemo(() => {
    const map = new Map<string, string>();
    boDefinitions.forEach(bo => map.set(bo.id, bo.name));
    return map;
  }, [boDefinitions]);

  const renderWidget = (widget: ViewConfigWidget) => {
    const widgetConfig = getConfig<WidgetConfig>(widget.config);
    const boName = widgetConfig.bo_definition_id ? boMap.get(widgetConfig.bo_definition_id) : undefined;

    switch (widget.widget_type) {
      case 'stats_card':
        return <StatsCardWidget widget={widget} boName={boName} />;
      case 'chart':
        return <ChartWidget widget={widget} boName={boName} />;
      case 'recent_items':
        return <RecentItemsWidget widget={widget} boName={boName} />;
      default:
        return <PlaceholderWidget widget={widget} />;
    }
  };

  if (widgets.length === 0) {
    return (
      <Card className="flex items-center justify-center h-64">
        <CardContent className="text-center py-8">
          <LayoutDashboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">{t('views.no_widgets')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${config.columns || 4}, minmax(0, 1fr))`,
        gap: `${config.gap || 16}px`,
      }}
    >
      {widgets
        .filter(w => w.is_active)
        .map((widget) => (
          <div
            key={widget.id}
            style={{
              gridColumn: `span ${widget.width}`,
              gridRow: `span ${widget.height}`,
              minHeight: widget.height * 120,
            }}
          >
            {renderWidget(widget)}
          </div>
        ))}
    </div>
  );
}

// Re-export for use in other components
export { LayoutDashboard };
