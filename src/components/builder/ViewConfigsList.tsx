import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Layers,
  Search,
} from 'lucide-react';
import type { ViewConfig } from '@/hooks/useViewConfigs';

interface ViewConfigsListProps {
  views: ViewConfig[];
  isLoading: boolean;
  onSelect: (view: ViewConfig) => void;
  onEdit: (view: ViewConfig) => void;
  onDelete: (view: ViewConfig) => void;
  onCreate: () => void;
}

export function ViewConfigsList({
  views,
  isLoading,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
}: ViewConfigsListProps) {
  const [search, setSearch] = useState('');

  const filteredViews = views.filter((view) =>
    view.name.toLowerCase().includes(search.toLowerCase()) ||
    view.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Vues configurées
              </CardTitle>
              <CardDescription>Gérez les vues de l'application</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Vues configurées
            </CardTitle>
            <CardDescription>
              {filteredViews.length} vue{filteredViews.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button size="sm" onClick={onCreate}>
            Nouvelle vue
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une vue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredViews.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              {views.length === 0 ? 'Aucune vue configurée' : 'Aucun résultat'}
            </p>
            {views.length === 0 && (
              <Button onClick={onCreate}>
                Créer la première vue
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-24">Publication</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredViews.map((view) => {
                  return (
                    <TableRow
                      key={view.id}
                      className="cursor-pointer"
                      onClick={() => onSelect(view)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{view.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {view.description || '—'}
                      </TableCell>
                      <TableCell>
                        {view.is_published ? (
                          <Chip variant="success">Publié</Chip>
                        ) : (
                          <Chip variant="outline">Brouillon</Chip>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(view); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); onDelete(view); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
