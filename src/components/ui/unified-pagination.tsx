import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UnifiedPaginationProps {
  /** Total number of items (displayed on the left) */
  totalItems: number;
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Called when page changes (1-indexed) */
  onPageChange: (page: number) => void;
  /** Current page size */
  pageSize?: number;
  /** Called when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Available page sizes for the selector */
  pageSizeOptions?: number[];
  /** Start index of current range (1-indexed). If not provided, calculated from currentPage & pageSize */
  rangeStart?: number;
  /** End index of current range. If not provided, calculated from currentPage, pageSize & totalItems */
  rangeEnd?: number;
  /** Compact mode for previews (smaller buttons) */
  compact?: boolean;
  /** Hide the pagination when there's only one page */
  hideOnSinglePage?: boolean;
  /** Extra content to render after the result count */
  extra?: React.ReactNode;
}

export function UnifiedPagination({
  totalItems,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 30, 50],
  rangeStart,
  rangeEnd,
  compact = false,
  hideOnSinglePage = false,
  extra,
}: UnifiedPaginationProps) {
  if (hideOnSinglePage && totalPages <= 1) return null;

  const start = rangeStart ?? (pageSize ? (currentPage - 1) * pageSize + 1 : undefined);
  const end = rangeEnd ?? (pageSize ? Math.min(currentPage * pageSize, totalItems) : undefined);

  const showRange = start != null && end != null;

  const btnSize = compact ? 'h-5 w-5' : 'h-7 w-7';
  const iconSize = compact ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = compact ? 'text-xs' : 'text-xs';

  return (
    <div className="flex items-center justify-between">
      <span className={`${textSize} text-muted-foreground`}>
        {showRange ? (
          <>{start}-{end} sur {totalItems} résultat{totalItems !== 1 ? 's' : ''}</>
        ) : (
          <>{totalItems} résultat{totalItems !== 1 ? 's' : ''}</>
        )}
        {extra}
      </span>
      <div className="flex items-center gap-3">
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-2">
            <span className={`${textSize} text-muted-foreground`}>Lignes par page</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-7 w-[60px] text-xs border-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className={btnSize}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className={iconSize} />
          </Button>
          <span className={`${textSize} text-muted-foreground min-w-[50px] text-center tabular-nums`}>
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className={btnSize}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className={iconSize} />
          </Button>
        </div>
      </div>
    </div>
  );
}
