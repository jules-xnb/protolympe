import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartConfig {
  bo_definition_id?: string;
  chart_type?: 'bar' | 'line' | 'pie';
  group_by?: string;
  metric?: 'count' | 'sum';
  colors?: string[];
}

interface ChartWidgetProps {
  title?: string;
  config: ChartConfig;
  className?: string;
}

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

export function ChartWidget({ title, config, className }: ChartWidgetProps) {
  const chartType = config.chart_type || 'bar';
  
  const { data: chartData = [], isLoading } = useQuery({
    queryKey: queryKeys.widgets.chart(config.bo_definition_id, config.group_by),
    queryFn: async () => {
      if (!config.bo_definition_id) {
        // Demo data
        return [
          { name: 'Jan', value: 40 },
          { name: 'Fév', value: 30 },
          { name: 'Mar', value: 45 },
          { name: 'Avr', value: 50 },
          { name: 'Mai', value: 35 },
          { name: 'Jun', value: 60 },
        ];
      }

      // Fetch business objects and group by status
      const objects = await api.get<{ status: string | null; created_at: string }[]>(
        `/api/business-objects?definition_id=${config.bo_definition_id}&is_archived=false`
      );

      // Group by status
      const grouped = (objects || []).reduce((acc, obj) => {
        const key = obj.status || 'Non défini';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    },
  });

  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const colors = config.colors || DEFAULT_COLORS;

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      default: // bar
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title || 'Graphique'}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {renderChart()}
      </CardContent>
    </Card>
  );
}
