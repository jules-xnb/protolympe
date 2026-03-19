import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { queryKeys } from '@/lib/query-keys';

interface CalendarConfig {
  bo_definition_id?: string;
  date_field?: string;
}

interface CalendarWidgetProps {
  title?: string;
  config: CalendarConfig;
  className?: string;
}

export function CalendarWidget({ title, config, className }: CalendarWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  const { data: events = [], isLoading } = useQuery({
    queryKey: queryKeys.widgets.calendar(config.bo_definition_id, month),
    queryFn: async () => {
      if (!config.bo_definition_id) {
        // Demo events
        const today = new Date();
        return [
          { date: today, count: 3, items: [{ title: 'Réunion sécurité' }, { title: 'Audit' }, { title: 'Formation' }] },
          { date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), count: 1, items: [{ title: 'Deadline rapport' }] },
          { date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), count: 2, items: [{ title: 'Contrôle' }, { title: 'Revue' }] },
        ];
      }

      const startDate = startOfMonth(month);
      const endDate = endOfMonth(month);

      const data = await api.get<{ id: string; reference_number: string; created_at: string }[]>(
        `/api/business-objects?definition_id=${config.bo_definition_id}&is_archived=false&created_at_gte=${startDate.toISOString()}&created_at_lte=${endDate.toISOString()}`
      );

      // Group by date
      const grouped = (data || []).reduce((acc, item) => {
        if (!item.created_at) return acc;
        const dateKey = format(new Date(item.created_at), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = { date: new Date(item.created_at), count: 0, items: [] };
        }
        acc[dateKey].count++;
        acc[dateKey].items.push({ title: item.reference_number });
        return acc;
      }, {} as Record<string, { date: Date; count: number; items: { title: string }[] }>);

      return Object.values(grouped);
    },
  });

  const selectedEvents = events.find(e => selectedDate && isSameDay(e.date, selectedDate));

  // Create modifier for dates with events
  const eventDates = events.map(e => e.date);

  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title || 'Calendrier'}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 flex flex-col gap-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={month}
          onMonthChange={setMonth}
          locale={fr}
          className="rounded-md border mx-auto"
          modifiers={{
            hasEvents: eventDates,
          }}
          modifiersStyles={{
            hasEvents: {
              fontWeight: 'bold',
              textDecoration: 'underline',
              textDecorationColor: 'hsl(var(--primary))',
            },
          }}
        />
        
        {selectedEvents && (
          <div className="mt-2 p-2 bg-muted rounded-md">
            <p className="text-xs font-medium mb-1">
              {format(selectedEvents.date, 'EEEE d MMMM', { locale: fr })}
            </p>
            <div className="space-y-1">
              {selectedEvents.items.slice(0, 3).map((item, i) => (
                <Chip key={i} variant="outline" className="text-xs mr-1">
                  {item.title || 'Événement'}
                </Chip>
              ))}
              {selectedEvents.count > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{selectedEvents.count - 3} autres
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
