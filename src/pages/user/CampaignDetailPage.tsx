import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Send, ExternalLink, MessageSquare, Clock, AlertCircle, CheckCircle2, XCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Group, X, Download, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSurveyCampaign, useCloseCampaign } from '@/hooks/useSurveyCampaigns';
import { useFilteredCampaignResponses, type FilteredResponse } from '@/hooks/useFilteredCampaignResponses';
import { useCampaignFieldColumns } from '@/hooks/useCampaignFieldColumns';
import { useUpdateResponseStatus, type DynamicStatusInfo } from '@/hooks/useSurveyResponses';
import { useSaveResponseValues } from '@/hooks/useSaveResponseValues';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useAuth } from '@/hooks/useAuth';
import { InlineEditableCell } from '@/components/user/views/InlineEditableCell';
import { CellCommentPopover } from '@/components/user/views/CellCommentPopover';
import { SurveyResponseFullPage } from '@/components/user/views/SurveyResponseFullPage';
import { evaluateVisibilityConditions } from '@/lib/evaluate-visibility-conditions';
import { CampaignFieldFilters, evaluateFieldFilter, type FieldFilter, type FilterLogic } from '@/components/user/views/campaign/CampaignFieldFilters';
import { evaluateFormula } from '@/lib/formula-evaluator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

function getWorkflowStatusBadge(dynamicStatus?: DynamicStatusInfo): { label: string; variant: 'default' | 'success' | 'outline' | 'error' } {
  if (!dynamicStatus) {
    return { label: 'Inconnu', variant: 'default' };
  }
  const { baseStatus, stepName, stepOrder, totalSteps } = dynamicStatus;
  if (baseStatus === 'validated') return { label: stepName || 'Validé', variant: 'success' };
  if (baseStatus === 'rejected') return { label: stepName || 'Rejeté', variant: 'error' };
  if (baseStatus === 'pending') return { label: stepName || 'En attente', variant: 'default' };
  if (baseStatus === 'in_progress') return { label: stepName || 'En cours', variant: 'outline' };
  if (baseStatus === 'in_validation' || baseStatus === 'submitted') {
    const label = totalSteps && totalSteps > 0 && stepOrder
      ? `${stepName} (${stepOrder}/${totalSteps})`
      : stepName || 'En validation';
    return { label, variant: 'outline' };
  }
  return { label: stepName || 'Inconnu', variant: 'default' };
}

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navState = (location.state || {}) as { enable_import?: boolean; enable_export?: boolean };
  const canImport = navState.enable_import ?? searchParams.get('import') === '1';
  const canExport = navState.enable_export ?? searchParams.get('export') === '1';
  const [selectedResponse, setSelectedResponse] = useState<FilteredResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('_eo'); // default: entity
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [fieldFilters, setFieldFilters] = useState<FieldFilter[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('AND');
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportSelectedTabs, setExportSelectedTabs] = useState<Set<string>>(new Set());

  const { activeProfile, mode } = useViewMode();
  const { user } = useAuth();
  const profileEoIds = activeProfile?.eoIds || [];
  const profileRoleIds = activeProfile?.roleIds || [];
  const isManagerView = mode !== 'user_final' || searchParams.get('manager') === '1';

  const { data: campaign, isLoading: campaignLoading } = useSurveyCampaign(campaignId);
  const { responses, canViewValidated, accessibleSteps, endNodeName, isLoading: responsesLoading } = useFilteredCampaignResponses(
    campaignId,
    profileEoIds,
    profileRoleIds,
    { showAllResponses: isManagerView },
  );

  const queryClient = useQueryClient();
  const updateStatus = useUpdateResponseStatus();
  const saveValues = useSaveResponseValues();
  const closeCampaign = useCloseCampaign();

  // Field columns for inline editing
  const businessObjectIds = useMemo(() =>
    responses.map(r => r.business_object_id).filter((id): id is string => !!id),
    [responses]
  );

  const { data: fieldData, isLoading: fieldDataLoading } = useCampaignFieldColumns(
    campaignId,
    businessObjectIds,
    profileRoleIds,
    { showAllFields: isManagerView }
  );

  // Local overrides for inline-edited values — merged with DB values for instant
  // conditional visibility re-evaluation (no round-trip needed).
  const [localOverrides, setLocalOverrides] = useState<Record<string, Record<string, unknown>>>({});

  // Clear local overrides when DB data refreshes (they've been persisted)
  const fieldDataRef = useRef(fieldData);
  useEffect(() => {
    if (fieldData && fieldData !== fieldDataRef.current) {
      fieldDataRef.current = fieldData;
      setLocalOverrides({});
    }
  }, [fieldData]);

  const isLoading = campaignLoading || responsesLoading || (businessObjectIds.length > 0 && fieldDataLoading);

  // Build status tabs from responses (dynamic names from workflow)
  interface StatusTab {
    key: string;
    label: string;
    count: number;
  }

  const statusTabs = useMemo((): StatusTab[] => {
    const tabs: StatusTab[] = [];

    // Respondent tab: pending + in_progress + rejected
    const respondentCount = responses.filter(r =>
      ['pending', 'in_progress', 'rejected'].includes(r.status)
    ).length;
    if (respondentCount > 0) {
      tabs.push({ key: 'respondent', label: 'Répondant', count: respondentCount });
    }

    // Validation step tabs — always show steps the user has access to
    // Count responses per step from actual data
    const stepResponseCounts = new Map<string, number>();
    for (const r of responses) {
      if (!['submitted', 'in_validation'].includes(r.status)) continue;
      const stepId = r._dynamic_status?.stepId;
      if (stepId) {
        stepResponseCounts.set(stepId, (stepResponseCounts.get(stepId) || 0) + 1);
      }
    }

    for (const step of accessibleSteps) {
      tabs.push({
        key: `step:${step.id}`,
        label: step.name,
        count: stepResponseCounts.get(step.id) || 0,
      });
    }

    // Validated tab - always show if user has permission
    const validatedCount = responses.filter(r => r.status === 'validated').length;
    if (validatedCount > 0 || canViewValidated) {
      tabs.push({ key: 'validated', label: endNodeName || 'Validé', count: validatedCount });
    }

    return tabs;
  }, [responses, accessibleSteps, canViewValidated, endNodeName]);

  // Auto-select first tab if none selected or current tab no longer exists
  const effectiveTab = useMemo(() => {
    if (activeTab && statusTabs.some(t => t.key === activeTab)) return activeTab;
    return statusTabs[0]?.key || null;
  }, [activeTab, statusTabs]);

  // Search filter
  const searchFilteredResponses = useMemo(() => {
    if (!searchQuery.trim()) return responses;
    const q = searchQuery.toLowerCase().trim();
    return responses.filter(r =>
      r._eo?.name?.toLowerCase().includes(q) ||
      r._eo?.code?.toLowerCase().includes(q)
    );
  }, [responses, searchQuery]);

  // Tab filter
  const filteredResponses = useMemo(() => {
    if (!effectiveTab) return searchFilteredResponses;

    if (effectiveTab === 'respondent') {
      return searchFilteredResponses.filter(r => ['pending', 'in_progress', 'rejected'].includes(r.status));
    }
    if (effectiveTab === 'validated') {
      return searchFilteredResponses.filter(r => r.status === 'validated');
    }
    if (effectiveTab.startsWith('step:')) {
      const stepId = effectiveTab.slice(5);
      return searchFilteredResponses.filter(r => {
        if (!['submitted', 'in_validation'].includes(r.status)) return false;
        return r._dynamic_status?.stepId === stepId;
      });
    }
    return searchFilteredResponses;
  }, [searchFilteredResponses, effectiveTab]);

  // Field filters
  const fieldFilteredResponses = useMemo(() => {
    if (fieldFilters.length === 0) return filteredResponses;
    return filteredResponses.filter(r => {
      const boId = r.business_object_id;
      const vals = boId ? { ...fieldData?.valuesMap.get(boId), ...localOverrides[boId] } : {};
      const results = fieldFilters.map(f => evaluateFieldFilter(f, vals?.[f.field_id]));
      return filterLogic === 'AND' ? results.every(Boolean) : results.some(Boolean);
    });
  }, [filteredResponses, fieldFilters, filterLogic, fieldData?.valuesMap, localOverrides]);

  // Sort
  // Stable snapshot of valuesMap for sorting (Map reference doesn't change on content updates)
  // Also evaluates calculated fields on the fly
  const valuesMapSnapshot = useMemo(() => {
    if (!fieldData?.valuesMap) return new Map<string, Record<string, unknown>>();
    const columns = fieldData.columns;
    const calculatedCols = columns.filter(c => c.field_type === 'calculated' && c.calculation_formula);
    // Build a lightweight fields array for evaluateFormula (needs id + slug)
    const fieldsForFormula = columns.map(c => ({ id: c.field_id, slug: c.slug || '', name: c.field_name }));

    const snapshot = new Map<string, Record<string, unknown>>();
    fieldData.valuesMap.forEach((vals, boId) => {
      const merged = { ...vals, ...localOverrides[boId] };
      // Evaluate calculated fields
      for (const col of calculatedCols) {
        const result = evaluateFormula(col.calculation_formula!, merged, fieldsForFormula as never);
        if (result !== null && result !== undefined) {
          merged[col.field_id] = result;
        }
      }
      snapshot.set(boId, merged);
    });
    return snapshot;
  }, [fieldData?.valuesMap, fieldData?.columns, localOverrides]);

  const sortedResponses = useMemo(() => {
    const sorted = [...fieldFilteredResponses];
    const dir = sortDirection === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortColumn === '_eo') {
        valA = a._eo?.name?.toLowerCase() || '';
        valB = b._eo?.name?.toLowerCase() || '';
      } else {
        const boA = a.business_object_id;
        const boB = b.business_object_id;
        const rawA = boA ? valuesMapSnapshot.get(boA)?.[sortColumn] : undefined;
        const rawB = boB ? valuesMapSnapshot.get(boB)?.[sortColumn] : undefined;
        valA = rawA != null ? String(rawA).toLowerCase() : '';
        valB = rawB != null ? String(rawB).toLowerCase() : '';
      }

      return valA.localeCompare(valB, 'fr', { sensitivity: 'base' }) * dir;
    });

    return sorted;
  }, [fieldFilteredResponses, sortColumn, sortDirection, valuesMapSnapshot]);

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Export helpers
  const getResponsesForTabKey = useCallback((tabKey: string): FilteredResponse[] => {
    if (tabKey === 'respondent') {
      return responses.filter(r => ['pending', 'in_progress', 'rejected'].includes(r.status));
    }
    if (tabKey === 'validated') {
      return responses.filter(r => r.status === 'validated');
    }
    if (tabKey.startsWith('step:')) {
      const stepId = tabKey.slice(5);
      return responses.filter(r => {
        if (!['submitted', 'in_validation'].includes(r.status)) return false;
        return r._dynamic_status?.stepId === stepId;
      });
    }
    return [];
  }, [responses]);

  const doExport = useCallback((tabKeys: Set<string>) => {
    const columns = fieldData?.columns || [];
    const headers = ['Entité', 'Code', 'Statut', 'Onglet', ...columns.map(c => c.custom_label || c.field_name)];

    // Collect all responses from selected tabs (no pagination)
    const allRows: string[][] = [];
    for (const tabKey of tabKeys) {
      const tab = statusTabs.find(t => t.key === tabKey);
      const tabLabel = tab?.label || tabKey;
      const tabResponses = getResponsesForTabKey(tabKey);
      for (const r of tabResponses) {
        const boId = r.business_object_id;
        const vals = boId ? valuesMapSnapshot.get(boId) : undefined;
        const statusLabel = r._dynamic_status?.stepName || r.status;
        allRows.push([
          r._eo?.name || '',
          r._eo?.code || '',
          statusLabel,
          tabLabel,
          ...columns.map(c => {
            const v = vals?.[c.field_id];
            return v != null ? String(v) : '';
          }),
        ]);
      }
    }

    const csvContent = [headers, ...allRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'export'}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export téléchargé');
  }, [fieldData?.columns, statusTabs, getResponsesForTabKey, valuesMapSnapshot, campaign?.name]);

  const handleExportClick = useCallback(() => {
    if (statusTabs.length <= 1) {
      // Single tab — export directly
      doExport(new Set(statusTabs.map(t => t.key)));
    } else {
      // Multiple tabs — show dialog
      setExportSelectedTabs(new Set(statusTabs.map(t => t.key)));
      setExportDialogOpen(true);
    }
  }, [statusTabs, doExport]);

  // Grouping
  const getGroupValue = useCallback((response: FilteredResponse): string => {
    if (!groupByColumn) return '';
    if (groupByColumn === '_eo') return response._eo?.name || 'Non renseigné';
    const boId = response.business_object_id;
    const raw = boId ? valuesMapSnapshot.get(boId)?.[groupByColumn] : undefined;
    if (raw == null || raw === '') return 'Non renseigné';
    return String(raw);
  }, [groupByColumn, valuesMapSnapshot]);

  const groupedData = useMemo(() => {
    if (!groupByColumn) return null;

    const groups = new Map<string, FilteredResponse[]>();
    for (const r of sortedResponses) {
      const key = getGroupValue(r);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    // Sort groups alphabetically
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
      .map(([key, items]) => ({ key, items }));
  }, [groupByColumn, sortedResponses, getGroupValue]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Numeric columns for sum computation
  const numericColumnIds = useMemo(() =>
    (fieldData?.columns || [])
      .filter(c => ['number', 'decimal', 'currency'].includes(c.field_type))
      .map(c => c.field_id),
    [fieldData?.columns]
  );

  // Compute sums for a set of responses
  const computeSums = useCallback((items: FilteredResponse[]): Record<string, number> => {
    const sums: Record<string, number> = {};
    for (const colId of numericColumnIds) {
      let sum = 0;
      for (const r of items) {
        const boId = r.business_object_id;
        const raw = boId ? valuesMapSnapshot.get(boId)?.[colId] : undefined;
        const num = raw != null ? Number(raw) : NaN;
        if (!isNaN(num)) sum += num;
      }
      sums[colId] = sum;
    }
    return sums;
  }, [numericColumnIds, valuesMapSnapshot]);

  // Flatten grouped data for pagination (only expanded rows)
  type FlatRow =
    | { type: 'header'; key: string; count: number }
    | { type: 'row'; response: FilteredResponse }
    | { type: 'subtotal'; key: string; sums: Record<string, number> };

  const flatRows = useMemo((): FlatRow[] => {
    if (!groupedData) {
      return sortedResponses.map(r => ({ type: 'row' as const, response: r }));
    }
    const rows: FlatRow[] = [];
    for (const group of groupedData) {
      rows.push({ type: 'header', key: group.key, count: group.items.length });
      if (!collapsedGroups.has(group.key)) {
        for (const r of group.items) {
          rows.push({ type: 'row', response: r });
        }
      }
      // Subtotal row per group (always shown if there are numeric columns)
      if (numericColumnIds.length > 0) {
        rows.push({ type: 'subtotal', key: group.key, sums: computeSums(group.items) });
      }
    }
    return rows;
  }, [groupedData, sortedResponses, collapsedGroups, numericColumnIds, computeSums]);

  // Global totals for numeric columns
  const globalSums = useMemo(() => {
    if (numericColumnIds.length === 0) return null;
    return computeSums(sortedResponses);
  }, [numericColumnIds, computeSums, sortedResponses]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(flatRows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return flatRows.slice(start, start + rowsPerPage);
  }, [flatRows, safePage, rowsPerPage]);

  const rangeStart = flatRows.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(safePage * rowsPerPage, flatRows.length);

  // Bulk selection helpers
  const isResponseSelectable = useCallback((response: FilteredResponse): boolean => {
    if (response._user_role === 'respondent' && ['pending', 'in_progress', 'rejected'].includes(response.status)) {
      // Check required fields are filled
      const requiredCols = fieldData?.columns.filter(c => c.is_required) || [];
      const boId = response.business_object_id;
      const fv = boId ? { ...valuesMapSnapshot.get(boId), ...localOverrides[boId] } : {};
      const hasMissing = requiredCols.some(c => {
        const hidden = !evaluateVisibilityConditions(c.visibility_conditions, fv || {}, c.visibility_logic);
        if (hidden) return false;
        const v = fv?.[c.field_id];
        return v === null || v === undefined || v === '';
      });
      return !hasMissing;
    }
    if (response._user_role === 'validator' && ['submitted', 'in_validation'].includes(response.status)) return true;
    return false;
  }, [fieldData?.columns, valuesMapSnapshot, localOverrides]);

  const selectableOnPage = useMemo(() =>
    paginatedRows
      .filter((r): r is FlatRow & { type: 'row' } => r.type === 'row')
      .filter(r => isResponseSelectable(r.response))
      .map(r => r.response.id),
    [paginatedRows, isResponseSelectable]
  );

  const allPageSelected = selectableOnPage.length > 0 && selectableOnPage.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        selectableOnPage.forEach(id => next.delete(id));
      } else {
        selectableOnPage.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Determine bulk action type based on selected responses
  const bulkActionType = useMemo((): 'submit' | 'validate' | null => {
    if (selectedIds.size === 0) return null;
    const selectedResponses = sortedResponses.filter(r => selectedIds.has(r.id));
    const hasRespondent = selectedResponses.some(r => r._user_role === 'respondent');
    const hasValidator = selectedResponses.some(r => r._user_role === 'validator');
    if (hasRespondent && !hasValidator) return 'submit';
    if (hasValidator && !hasRespondent) return 'validate';
    return null; // mixed — shouldn't happen normally
  }, [selectedIds, sortedResponses]);

  const handleBulkAction = useCallback(async (action: 'submit' | 'validate' | 'reject') => {
    const selected = sortedResponses.filter(r => selectedIds.has(r.id));
    if (selected.length === 0) return;
    setBulkPending(true);
    try {
      await Promise.all(selected.map(r =>
        updateStatus.mutateAsync({
          id: r.id,
          status: action === 'submit' ? 'submitted' : action === 'validate' ? 'validated' : 'rejected',
          currentStepId: r.current_step_id,
          validationSteps: r._survey?.settings?.validation_steps,
        })
      ));
      const label = action === 'submit' ? 'soumise(s)' : action === 'validate' ? 'validée(s)' : 'refusée(s)';
      toast.success(`${selected.length} réponse(s) ${label}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Erreur lors de l'action en masse");
    } finally {
      setBulkPending(false);
    }
  }, [sortedResponses, selectedIds, updateStatus]);

  // Full page response view
  if (selectedResponse) {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-background">
        <SurveyResponseFullPage
          response={isManagerView ? { ...selectedResponse, _user_role: 'readonly' } : selectedResponse}
          onBack={() => setSelectedResponse(null)}
          activeTab={effectiveTab}
        />
      </div>,
      document.body
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campagne introuvable</p>
        <Button variant="link" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{campaign.name}</h1>
        </div>
        <Chip variant="outline" className="ml-2 text-xs">
          {responses.length} réponse{responses.length !== 1 ? 's' : ''}
        </Chip>
        <div className="flex items-center gap-2 ml-auto">
          {canImport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${location.pathname}/import`)}
            >
              Importer <Upload className="h-4 w-4" />
            </Button>
          )}
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportClick}
            >
              Exporter <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
        {isManagerView && campaign.status !== 'closed' && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={closeCampaign.isPending}
            onClick={async () => {
              await closeCampaign.mutateAsync(campaign.id);
              toast.success('Campagne clôturée');
              queryClient.invalidateQueries({ queryKey: queryKeys.surveyCampaigns.bySurvey('') });
            }}
          >
            Clôturer <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="px-6 py-3 flex items-center gap-4 border-b shrink-0">
        {/* Status tabs */}
        {statusTabs.length > 1 && (
          <div className="flex items-center gap-1">
            {statusTabs.map(tab => (
              <Button
                key={tab.key}
                variant="ghost"
                type="button"
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap h-auto",
                  effectiveTab === tab.key
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
              >
                {tab.label}
                <span className={cn(
                  "ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-xs font-medium",
                  effectiveTab === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/15 text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              </Button>
            ))}
          </div>
        )}
        {/* Search */}
        <div className="relative flex-1 max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une entité..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Field Filters + Group by */}
      {fieldData?.columns && fieldData.columns.length > 0 && (
        <div className="px-6 py-2 border-b shrink-0 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Select
              value={groupByColumn || '__none'}
              onValueChange={(v) => {
                setGroupByColumn(v === '__none' ? null : v);
                setCollapsedGroups(new Set());
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <Group className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Grouper par..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Aucun groupage</SelectItem>
                <SelectItem value="_eo">Entité</SelectItem>
                {fieldData.columns.map(col => (
                  <SelectItem key={col.field_id} value={col.field_id}>
                    {col.custom_label || col.field_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groupByColumn && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => { setGroupByColumn(null); setCollapsedGroups(new Set()); }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <CampaignFieldFilters
            columns={fieldData.columns}
            filters={fieldFilters}
            filterLogic={filterLogic}
            onFiltersChange={(f) => { setFieldFilters(f); setCurrentPage(1); }}
            onFilterLogicChange={setFilterLogic}
          />
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-2 border-b shrink-0 flex items-center gap-3 bg-primary/5">
          <span className="text-sm font-medium">{selectedIds.size} sélectionnée(s)</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Désélectionner
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {bulkActionType === 'submit' && (
              <Button
                size="sm"
                disabled={bulkPending}
                onClick={() => handleBulkAction('submit')}
              >
                Soumettre ({selectedIds.size}) <Send className="h-4 w-4" />
              </Button>
            )}
            {bulkActionType === 'validate' && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={bulkPending}
                  onClick={() => handleBulkAction('validate')}
                >
                  Valider ({selectedIds.size}) <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkPending}
                  onClick={() => handleBulkAction('reject')}
                >
                  Refuser ({selectedIds.size}) <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {sortedResponses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {searchQuery ? 'Aucun résultat' : 'Aucune réponse'}
          </div>
        ) : (
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 sticky left-0 z-10 bg-background">
                  {selectableOnPage.length > 0 && (
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  )}
                </TableHead>
                <TableHead
                  className="whitespace-nowrap cursor-pointer select-none hover:text-foreground sticky left-8 z-10 bg-background"
                  onClick={() => toggleSort('_eo')}
                >
                  <span className="inline-flex items-center gap-1">
                    Entité
                    {sortColumn === '_eo' ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </span>
                </TableHead>
                {fieldData?.columns.map(col => (
                  <TableHead
                    key={col.field_id}
                    className="whitespace-nowrap cursor-pointer select-none hover:text-foreground"
                    onClick={() => toggleSort(col.field_id)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.custom_label || col.field_name}
                      {col.is_required && col.visibility !== 'readonly' && <span className="text-destructive">*</span>}
                      {sortColumn === col.field_id ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </span>
                  </TableHead>
                ))}
                {!isManagerView && <TableHead className="whitespace-nowrap">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row, rowIdx) => {
                if (row.type === 'header') {
                  const isCollapsed = collapsedGroups.has(row.key);
                  const colSpan = 2 + 1 + (fieldData?.columns.length || 0);
                  return (
                    <TableRow
                      key={`group-${row.key}`}
                      className="bg-muted/60 hover:bg-muted cursor-pointer"
                      onClick={() => toggleGroup(row.key)}
                    >
                      <TableCell colSpan={colSpan} className="py-1.5 px-4 sticky left-0 z-10">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <span>{row.key}</span>
                          <span className="text-xs text-muted-foreground font-normal">({row.count})</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                if (row.type === 'subtotal') {
                  return (
                    <TableRow key={`subtotal-${row.key}`} className="bg-muted/30 font-medium">
                      <TableCell className="sticky left-0 z-10 bg-muted/30" />
                      <TableCell className="text-xs text-muted-foreground z-10 bg-muted/30 sticky left-8">Sous-total</TableCell>
                      {fieldData?.columns.map(col => (
                        <TableCell key={col.field_id} className="text-sm">
                          {numericColumnIds.includes(col.field_id)
                            ? <span className="font-semibold">{row.sums[col.field_id]?.toLocaleString('fr-FR') ?? ''}</span>
                            : ''}
                        </TableCell>
                      ))}
                      {!isManagerView && <TableCell />}
                    </TableRow>
                  );
                }

                const response = row.response;
                const hasComments = (response._unresolved_comments_count || 0) > 0;
                const responseStepLabel = ['pending', 'in_progress', 'rejected'].includes(response.status)
                  ? 'Répondant'
                  : (response._dynamic_status?.stepName || 'Valideur');
                const boId = response.business_object_id;
                const snapshotValues = boId ? valuesMapSnapshot.get(boId) : undefined;
                const fieldValues = boId ? { ...snapshotValues, ...localOverrides[boId] } : undefined;

                const selectable = isResponseSelectable(response);

                return (
                  <TableRow
                    key={response.id}
                    className={cn("group cursor-pointer hover:bg-muted/50", selectedIds.has(response.id) && "bg-primary/5")}
                    onClick={() => setSelectedResponse(response)}
                  >
                    <TableCell
                      className={cn("sticky left-0 z-10 group-hover:bg-muted/50 w-8", response.status === 'rejected' ? "bg-destructive/5" : selectedIds.has(response.id) ? "bg-primary/5" : "bg-background")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selectable && (
                        <Checkbox
                          checked={selectedIds.has(response.id)}
                          onCheckedChange={() => toggleSelectOne(response.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell className={cn("font-medium z-10 group-hover:bg-muted/50 sticky left-8", response.status === 'rejected' ? "bg-destructive/5" : selectedIds.has(response.id) ? "bg-primary/5" : "bg-background")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("flex items-center gap-2", response.status === 'rejected' && "text-destructive")}>
                          {response._eo?.name || '-'}
                          {response.status === 'rejected' && hasComments && (
                            <span className="flex items-center gap-1 text-xs text-destructive">
                              <MessageSquare className="h-3 w-3" />
                              {response._unresolved_comments_count}
                            </span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResponse(response);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ouvrir
                        </Button>
                      </div>
                    </TableCell>
                    {fieldData?.columns.map(col => {
                      const roleMatchesTab = !effectiveTab
                        || (effectiveTab === 'respondent' && response._user_role === 'respondent')
                        || (effectiveTab.startsWith('step_') && response._user_role === 'validator');
                      const isResponseEditable = !isManagerView && roleMatchesTab && ['pending', 'in_progress', 'rejected'].includes(response.status) && col.visibility === 'visible';
                      const isHiddenByCondition = !evaluateVisibilityConditions(
                        col.visibility_conditions,
                        fieldValues || {},
                        col.visibility_logic,
                      );
                      const hasFieldComment = response._commented_field_ids?.has(col.field_id) ?? false;

                      // Variation check
                      const eoId = response.respondent_eo_id;
                      const prevValues = eoId ? fieldData?.previousValuesMap.get(eoId) : undefined;
                      const prevVal = prevValues?.[col.field_id];
                      const currVal = fieldValues?.[col.field_id];
                      const variationExceeded = (() => {
                        if (!col.variation_threshold || prevVal == null) return false;
                        if (!['number', 'decimal', 'currency'].includes(col.field_type)) return false;
                        const prev = Number(prevVal);
                        const curr = Number(currVal);
                        if (isNaN(prev) || isNaN(curr) || prev === 0) return false;
                        const pct = col.variation_threshold / 100;
                        const dir = col.variation_direction || '+-';
                        const tooHigh = curr > prev * (1 + pct);
                        const tooLow = curr < prev * (1 - pct);
                        if (dir === '+') return tooHigh;
                        if (dir === '-') return tooLow;
                        return tooHigh || tooLow;
                      })();

                      return (
                        <TableCell key={col.field_id} className={cn("text-sm relative group/cell", isResponseEditable && !isHiddenByCondition && "bg-primary/5", variationExceeded && "bg-red-50 dark:bg-red-900/20")} onClick={(e) => e.stopPropagation()}>
                          <InlineEditableCell
                            column={col}
                            value={fieldValues?.[col.field_id]}
                            isEditable={isResponseEditable && !isHiddenByCondition}
                            isHiddenByCondition={isHiddenByCondition}
                            onSave={(newValue) => {
                              if (!boId) return;
                              setLocalOverrides(prev => ({
                                ...prev,
                                [boId]: { ...prev[boId], [col.field_id]: newValue },
                              }));
                              saveValues.mutate(
                                { businessObjectId: boId, values: { [col.field_id]: newValue } },
                                {
                                  onSuccess: () => {
                                    toast.success('Valeur enregistrée');
                                    queryClient.invalidateQueries({
                                      queryKey: queryKeys.campaignFieldColumns.byCampaign(campaignId!, businessObjectIds.length, profileRoleIds),
                                    });
                                  },
                                  onError: () => toast.error("Erreur lors de l'enregistrement"),
                                }
                              );
                            }}
                          />
                          <CellCommentPopover
                            responseId={response.id}
                            fieldDefinitionId={col.field_id}
                            hasComments={hasFieldComment}
                            stepLabel={responseStepLabel}
                            currentUserId={user?.id}
                            canComment={!isManagerView && roleMatchesTab}
                          />
                        </TableCell>
                      );
                    })}
                    {!isManagerView && <TableCell onClick={(e) => e.stopPropagation()}>
                      {/* Respondent: Submit button */}
                      {['pending', 'in_progress', 'rejected'].includes(response.status) && response._user_role === 'respondent' && (() => {
                        const requiredCols = fieldData?.columns.filter(c => c.is_required) || [];
                        const missingCount = requiredCols.filter(c => {
                          const hidden = !evaluateVisibilityConditions(c.visibility_conditions, fieldValues || {}, c.visibility_logic);
                          if (hidden) return false;
                          const v = fieldValues?.[c.field_id];
                          return v === null || v === undefined || v === '';
                        }).length;
                        const missingNames = missingCount > 0
                          ? requiredCols.filter(c => { const hidden = !evaluateVisibilityConditions(c.visibility_conditions, fieldValues || {}, c.visibility_logic); if (hidden) return false; const v = fieldValues?.[c.field_id]; return v === null || v === undefined || v === ''; }).map(c => c.field_name)
                          : [];
                        return (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            disabled={updateStatus.isPending || missingCount > 0}
                            title={missingCount > 0 ? `${missingCount} champ(s) obligatoire(s) non rempli(s)` : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (missingCount > 0) {
                                toast.error(`Champ(s) obligatoire(s) manquant(s) : ${missingNames.join(', ')}`);
                                return;
                              }
                              updateStatus.mutate(
                                { id: response.id, status: 'submitted', validationSteps: response._survey?.settings?.validation_steps },
                                {
                                  onSuccess: () => toast.success('Réponse soumise'),
                                  onError: () => toast.error('Erreur lors de la soumission'),
                                }
                              );
                            }}
                          >
                            <Send className="h-3 w-3" />
                            Soumettre
                          </Button>
                        );
                      })()}
                      {/* Validator: Validate / Reject buttons */}
                      {response._user_role === 'validator' && ['submitted', 'in_validation'].includes(response.status) && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={updateStatus.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate(
                                {
                                  id: response.id,
                                  status: 'validated',
                                  currentStepId: response.current_step_id,
                                  validationSteps: response._survey?.settings?.validation_steps,
                                },
                                {
                                  onSuccess: () => toast.success('Réponse validée'),
                                  onError: () => toast.error('Erreur lors de la validation'),
                                }
                              );
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Valider
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs gap-1 text-destructive hover:bg-destructive/10"
                            disabled={updateStatus.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate(
                                {
                                  id: response.id,
                                  status: 'rejected',
                                  currentStepId: response.current_step_id,
                                },
                                {
                                  onSuccess: () => toast.success('Réponse rejetée'),
                                  onError: () => toast.error('Erreur lors du rejet'),
                                }
                              );
                            }}
                          >
                            <XCircle className="h-3 w-3" />
                            Refuser
                          </Button>
                        </div>
                      )}
                    </TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
            {globalSums && (
              <tfoot>
                <TableRow className="bg-muted font-semibold border-t-2">
                  <TableCell className="sticky left-0 z-10 bg-muted" />
                  <TableCell className="text-sm z-10 bg-muted sticky left-8">Total</TableCell>
                  {fieldData?.columns.map(col => (
                    <TableCell key={col.field_id} className="text-sm">
                      {numericColumnIds.includes(col.field_id)
                        ? globalSums[col.field_id]?.toLocaleString('fr-FR') ?? ''
                        : ''}
                    </TableCell>
                  ))}
                  {!isManagerView && <TableCell />}
                </TableRow>
              </tfoot>
            )}
          </Table>
        )}
      </div>

      {/* Pagination */}
      {sortedResponses.length > 0 && (
        <div className="px-6 py-3 border-t shrink-0">
          <UnifiedPagination
            totalItems={flatRows.length}
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={rowsPerPage}
            onPageSizeChange={(size) => { setRowsPerPage(size); setCurrentPage(1); }}
            pageSizeOptions={[10, 30, 50]}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </div>
      )}

      {/* Export dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Exporter les réponses</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">Sélectionnez les onglets à exporter :</p>
            {statusTabs.map(tab => {
              const isChecked = exportSelectedTabs.has(tab.key);
              return (
                <label
                  key={tab.key}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      setExportSelectedTabs(prev => {
                        const next = new Set(prev);
                        if (checked) next.add(tab.key);
                        else next.delete(tab.key);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm">{tab.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{tab.count} réponse{tab.count !== 1 ? 's' : ''}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={exportSelectedTabs.size === 0}
              onClick={() => {
                doExport(exportSelectedTabs);
                setExportDialogOpen(false);
              }}
            >
              Exporter <Download className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
