import * as React from 'react';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchColumn?: string;
  searchColumns?: string[]; // Multiple columns to search
  searchPlaceholder?: string;
  isLoading?: boolean;
  columnLabels?: Record<string, string>;
  initialColumnVisibility?: VisibilityState;
  tableId?: string; // Unique identifier for persisting column visibility
  onRowClick?: (row: TData) => void;
  hideColumnSelector?: boolean;
  toolbarExtra?: React.ReactNode; // Extra content to render next to result count
  toolbarRight?: React.ReactNode; // Extra content to render in the toolbar (right side)
  toolbarLeft?: React.ReactNode; // Extra content to render before the search bar
  externalSearch?: string; // When provided, use this value instead of internal search
  onExternalSearchChange?: (value: string) => void;
  hideSearch?: boolean; // Hide the built-in search bar
  hidePagination?: boolean; // Hide the pagination row
  paginationBelow?: boolean; // Move pagination below the table
  initialPageSize?: number; // Override default page size
  getRowClassName?: (row: TData) => string;
  serverPagination?: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
}

const STORAGE_KEY_PREFIX = 'datatable_column_visibility_';

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchColumns,
  searchPlaceholder = 'Rechercher...',
  isLoading,
  columnLabels = {},
  initialColumnVisibility = {},
  tableId,
  onRowClick,
  hideColumnSelector = false,
  toolbarExtra,
  toolbarRight,
  toolbarLeft,
  externalSearch,
  onExternalSearchChange,
  hideSearch = false,
  hidePagination = false,
  paginationBelow = false,
  initialPageSize = DEFAULT_PAGE_SIZE,
  getRowClassName,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const [internalFilter, setInternalFilter] = React.useState('');
  const globalFilter = externalSearch !== undefined ? externalSearch : internalFilter;
  const setGlobalFilter = onExternalSearchChange || setInternalFilter;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  // Load saved visibility from localStorage or use initial
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    if (tableId) {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tableId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Invalid JSON, use initial
        }
      }
    }
    return initialColumnVisibility;
  });

  // Save visibility to localStorage when it changes
  React.useEffect(() => {
    if (tableId) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${tableId}`, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility, tableId]);

  // Merge new columns from initialColumnVisibility (e.g., custom fields) without overwriting user preferences
  // Use JSON.stringify to stabilize the dependency and avoid infinite loops
  const initialVisibilityKey = JSON.stringify(initialColumnVisibility);
  React.useEffect(() => {
    const parsed = JSON.parse(initialVisibilityKey) as VisibilityState;
    setColumnVisibility(prev => {
      const newVisibility = { ...prev };
      let hasChanges = false;
      for (const key of Object.keys(parsed)) {
        // Add new columns OR force-override when initialColumnVisibility explicitly sets true
        if (!(key in prev) || (parsed[key] === true && prev[key] === false)) {
          newVisibility[key] = parsed[key];
          hasChanges = true;
        }
      }
      return hasChanges ? newVisibility : prev;
    });
  }, [initialVisibilityKey]);

  // Custom global filter function for multi-column search
  const globalFilterFn = React.useCallback(
    (row: { getValue: (col: string) => unknown }, columnId: string, filterValue: string) => {
      if (!filterValue) return true;
      const columnsToSearch = searchColumns || (searchColumn ? [searchColumn] : []);
      const searchLower = filterValue.toLowerCase();
      return columnsToSearch.some((col) => {
        const value = row.getValue(col);
        return value != null && String(value).toLowerCase().includes(searchLower);
      });
    },
    [searchColumn, searchColumns]
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn,
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: serverPagination ? serverPagination.pageSize : initialPageSize,
      },
    },
    ...(serverPagination ? { manualPagination: true, pageCount: serverPagination.totalPages } : {}),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  return (
    <div className="space-y-3 sm:space-y-4 w-full">
       {/* Toolbar */}
       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 w-full">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {toolbarLeft}
            {!hideSearch && (searchColumn || searchColumns) && (
              <div className="relative w-64 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={globalFilter}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            )}
            <div className="flex-1" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {toolbarRight}
            {!hideColumnSelector && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <span className="hidden sm:inline">Colonnes</span>
                    <SlidersHorizontal className="h-4 w-4" />
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[400px] overflow-y-auto">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      const label = columnLabels[column.id] || column.id;
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
       </div>

      {/* Pagination - Above table */}
      {!hidePagination && !paginationBelow && <UnifiedPagination
        totalItems={serverPagination ? serverPagination.totalItems : table.getFilteredRowModel().rows.length}
        currentPage={serverPagination ? serverPagination.currentPage : table.getState().pagination.pageIndex + 1}
        totalPages={serverPagination ? serverPagination.totalPages : (table.getPageCount() || 1)}
        onPageChange={serverPagination ? serverPagination.onPageChange : (page) => table.setPageIndex(page - 1)}
        pageSize={serverPagination?.pageSize}
        extra={toolbarExtra}
      />}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table className="min-w-full">{/* min-w-full allows horizontal scroll when columns overflow */}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap",
                        header.column.columnDef.maxSize ? '' : 'max-w-[250px]',
                        canSort && 'cursor-pointer select-none hover:bg-muted/50'
                      )}
                      style={{
                        width: header.column.columnDef.size === 1 ? '1%' : header.column.columnDef.maxSize ? header.column.getSize() : (header.getSize() !== 150 ? header.getSize() : undefined),
                        maxWidth: header.column.columnDef.maxSize || undefined,
                        minWidth: header.column.columnDef.minSize ? header.column.columnDef.minSize : undefined,
                      }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <div className={cn("flex items-center gap-1", canSort && "cursor-pointer")}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="ml-1">
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Chargement...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick ? 'cursor-pointer hover:bg-muted/50' : '', getRowClassName?.(row.original) ?? '')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn(cell.column.columnDef.maxSize ? '' : 'max-w-[250px] truncate', cell.column.columnDef.size === 1 && 'whitespace-nowrap')} style={{ width: cell.column.columnDef.size === 1 ? '1%' : cell.column.columnDef.maxSize ? cell.column.getSize() : (cell.column.getSize() !== 150 ? cell.column.getSize() : undefined), maxWidth: cell.column.columnDef.maxSize || undefined, minWidth: cell.column.columnDef.minSize ? cell.column.columnDef.minSize : undefined }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Below table */}
      {!hidePagination && paginationBelow && <UnifiedPagination
        totalItems={serverPagination ? serverPagination.totalItems : table.getFilteredRowModel().rows.length}
        currentPage={serverPagination ? serverPagination.currentPage : table.getState().pagination.pageIndex + 1}
        totalPages={serverPagination ? serverPagination.totalPages : (table.getPageCount() || 1)}
        onPageChange={serverPagination ? serverPagination.onPageChange : (page) => table.setPageIndex(page - 1)}
        pageSize={serverPagination?.pageSize}
        extra={toolbarExtra}
      />}
    </div>
  );
}
