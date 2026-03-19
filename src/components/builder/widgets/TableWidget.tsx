import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { queryKeys } from '@/lib/query-keys';

interface TableConfig {
  bo_definition_id?: string;
  columns?: string[];
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

interface TableWidgetProps {
  title?: string;
  config: TableConfig;
  className?: string;
}

export function TableWidget({ title, config, className }: TableWidgetProps) {
  const limit = config.limit || 5;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.widgets.table(config.bo_definition_id, limit),
    queryFn: async () => {
      if (!config.bo_definition_id) {
        // Demo data
        return {
          items: [
            { id: '1', reference_number: 'INC-00001', title: 'Incident réseau', status: 'En cours', created_at: new Date().toISOString() },
            { id: '2', reference_number: 'INC-00002', title: 'Problème serveur', status: 'Résolu', created_at: new Date().toISOString() },
            { id: '3', reference_number: 'INC-00003', title: 'Alerte sécurité', status: 'Nouveau', created_at: new Date().toISOString() },
          ],
          definition: { name: 'Incidents' },
        };
      }

      const sortField = config.sort_field || 'created_at';
      const sortOrder = config.sort_direction === 'asc' ? 'asc' : 'desc';

      const [items, definitions] = await Promise.all([
        api.get<{ id: string; reference_number: string; title: string | null; status: string | null; created_at: string }[]>(
          `/api/business-objects?definition_id=${config.bo_definition_id}&is_archived=false&sort=${sortField}&order=${sortOrder}&limit=${limit}`
        ),
        api.get<{ id: string; name: string }[]>(
          `/api/business-objects/definitions?id=${config.bo_definition_id}`
        ),
      ]);

      return {
        items: items || [],
        definition: definitions?.[0] || null,
      };
    },
  });

  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (status: string | null): 'default' | 'outline' => {
    switch (status?.toLowerCase()) {
      case 'nouveau':
      case 'new':
        return 'default';
      case 'en cours':
      case 'in_progress':
        return 'default';
      case 'résolu':
      case 'resolved':
      case 'completed':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {title || data?.definition?.name || 'Tableau'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Réf.</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead className="w-24">Statut</TableHead>
              <TableHead className="w-24 text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((item) => (
              <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-mono text-xs">{item.reference_number}</TableCell>
                <TableCell className="truncate max-w-[150px]">{item.title || '-'}</TableCell>
                <TableCell>
                  <Chip variant={getStatusVariant(item.status)} className="text-xs">
                    {item.status || 'N/A'}
                  </Chip>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                </TableCell>
              </TableRow>
            ))}
            {(!data?.items || data.items.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                  Aucune donnée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
