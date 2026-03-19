import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import { Languages, Search, Download, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { UI_DEFAULTS, UI_DEFAULT_CATEGORIES } from '@/i18n/defaults';
import { useClientTranslations, useUpsertTranslation, useBulkUpsertTranslations } from '@/hooks/useTranslations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Language labels ─────────────────────────────────────────────────────

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
  de: 'DE',
  it: 'IT',
  pt: 'PT',
  nl: 'NL',
  ar: 'AR',
};

// ── Filter type ─────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'translated' | 'untranslated' | 'overridden';

// ── Inline editable cell ────────────────────────────────────────────────

function EditableCell({
  value,
  defaultValue,
  isDefaultLanguage,
  onSave,
}: {
  value: string | undefined;
  defaultValue: string;
  isDefaultLanguage: boolean;
  onSave: (newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleStartEdit = () => {
    setDraft(value ?? '');
    setEditing(true);
  };

  const handleSave = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? '')) {
      onSave(trimmed);
    }
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
        placeholder={defaultValue}
      />
    );
  }

  const displayValue = value || '';
  const isOverride = isDefaultLanguage && displayValue && displayValue !== defaultValue;
  const isEmpty = !displayValue;

  return (
    <div
      className="cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-muted/50 min-h-[32px] flex items-center transition-colors"
      onClick={handleStartEdit}
      title="Cliquer pour modifier"
    >
      {isEmpty ? (
        <span className="text-muted-foreground/50 italic">{defaultValue}</span>
      ) : isOverride ? (
        <span className="text-primary font-medium">{displayValue}</span>
      ) : displayValue === defaultValue ? (
        <span className="text-muted-foreground">{displayValue}</span>
      ) : (
        <span>{displayValue}</span>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export default function TranslationsPage() {
  const { selectedClient } = useViewMode();
  const { data: translations = [], isLoading } = useClientTranslations();
  const upsertMutation = useUpsertTranslation();
  const bulkUpsertMutation = useBulkUpsertTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // ── Language config (hardcoded for now) ─────────────────────────────
  const defaultLanguage = (selectedClient as any)?.default_language || 'fr';
  const activeLanguages: string[] = (selectedClient as any)?.active_languages || ['fr', 'en'];

  // ── Build translation lookup: { "ui:buttons.save:fr" → "Sauvegarder" }
  const translationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of translations) {
      map.set(`${row.scope}:${row.key}:${row.language}`, row.value);
    }
    return map;
  }, [translations]);

  const getTranslation = useCallback(
    (key: string, lang: string) => translationMap.get(`ui:${key}:${lang}`),
    [translationMap],
  );

  // ── Filtered keys per category ──────────────────────────────────────

  const filteredCategories = useMemo(() => {
    const result: { category: string; keys: string[]; overrideCount: number }[] = [];
    const searchLower = search.toLowerCase();

    for (const [category, keys] of Object.entries(UI_DEFAULT_CATEGORIES)) {
      let filtered = keys;

      // Search filter
      if (searchLower) {
        filtered = filtered.filter(
          k =>
            k.toLowerCase().includes(searchLower) ||
            UI_DEFAULTS[k].toLowerCase().includes(searchLower),
        );
      }

      // Status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(k => {
          const hasAnyTranslation = activeLanguages.some(lang => !!getTranslation(k, lang));
          const hasOverride = !!getTranslation(k, defaultLanguage) && getTranslation(k, defaultLanguage) !== UI_DEFAULTS[k];

          switch (statusFilter) {
            case 'translated':
              return hasAnyTranslation;
            case 'untranslated':
              return !hasAnyTranslation;
            case 'overridden':
              return hasOverride;
            default:
              return true;
          }
        });
      }

      if (filtered.length > 0) {
        const overrideCount = filtered.filter(k =>
          activeLanguages.some(lang => !!getTranslation(k, lang)),
        ).length;
        result.push({ category, keys: filtered, overrideCount });
      }
    }

    return result;
  }, [search, statusFilter, activeLanguages, defaultLanguage, getTranslation]);

  // ── Progress stats per language ─────────────────────────────────────

  const totalKeys = Object.keys(UI_DEFAULTS).length;

  const progressByLang = useMemo(() => {
    return activeLanguages.map(lang => {
      const translatedCount = Object.keys(UI_DEFAULTS).filter(
        k => !!getTranslation(k, lang),
      ).length;
      return { lang, translated: translatedCount, total: totalKeys };
    });
  }, [activeLanguages, getTranslation, totalKeys]);

  // ── Save handler ────────────────────────────────────────────────────

  const handleSave = useCallback(
    (key: string, lang: string, value: string) => {
      upsertMutation.mutate(
        { scope: 'ui', key, language: lang, value },
        {
          onSuccess: () => toast.success('Traduction enregistrée'),
          onError: () => toast.error("Erreur lors de l'enregistrement"),
        },
      );
    },
    [upsertMutation],
  );

  // ── CSV export ──────────────────────────────────────────────────────

  const handleExportCsv = useCallback(() => {
    const rows: string[] = [];
    const langHeaders = activeLanguages.join(',');
    rows.push(`scope,key,default,${langHeaders}`);

    for (const key of Object.keys(UI_DEFAULTS)) {
      const langValues = activeLanguages
        .map(lang => {
          const val = getTranslation(key, lang) ?? '';
          // Escape CSV: wrap in quotes if contains comma/quote/newline
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',');

      const defaultVal = UI_DEFAULTS[key];
      const escapedDefault =
        defaultVal.includes(',') || defaultVal.includes('"') || defaultVal.includes('\n')
          ? `"${defaultVal.replace(/"/g, '""')}"`
          : defaultVal;

      rows.push(`ui,${key},${escapedDefault},${langValues}`);
    }

    const blob = new Blob(['\uFEFF' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traductions_${selectedClient?.slug || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  }, [activeLanguages, getTranslation, selectedClient]);

  // ── CSV import ──────────────────────────────────────────────────────

  const handleImportCsv = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('Fichier CSV vide ou invalide');
        return;
      }

      // Parse header to find language columns
      const headers = lines[0].split(',').map(h => h.trim());
      // Expected: scope, key, default, lang1, lang2, ...
      const langStartIndex = 3;
      const csvLanguages = headers.slice(langStartIndex);

      const rowsToUpsert: { scope: string; key: string; language: string; value: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = parseCsvLine(lines[i]);
        if (parts.length < 3) continue;

        const scope = parts[0]?.trim();
        const key = parts[1]?.trim();
        if (!scope || !key) continue;

        for (let j = 0; j < csvLanguages.length; j++) {
          const lang = csvLanguages[j]?.trim();
          const value = parts[langStartIndex + j]?.trim();
          if (lang && value) {
            rowsToUpsert.push({ scope, key, language: lang, value });
          }
        }
      }

      if (rowsToUpsert.length === 0) {
        toast.error('Aucune traduction valide trouvée dans le fichier');
        return;
      }

      bulkUpsertMutation.mutate(rowsToUpsert, {
        onSuccess: () => toast.success(`${rowsToUpsert.length} traductions importées`),
        onError: () => toast.error("Erreur lors de l'import"),
      });

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [bulkUpsertMutation],
  );

  // ── Category toggle ─────────────────────────────────────────────────

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // ── Guard: no client selected ───────────────────────────────────────

  if (!selectedClient) {
    return (
      <EmptyState
        icon={Languages}
        title="Sélectionnez un client pour gérer ses traductions"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Traductions"
        description="Gérez les traductions et surcharges de textes pour ce client."
      >
        <Button variant="outline" onClick={handleImportCsv} disabled={bulkUpsertMutation.isPending}>
          {bulkUpsertMutation.isPending ? 'Import...' : 'Importer CSV'}
          <Upload className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={handleExportCsv}>
          Exporter CSV
          <Download className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelected}
        />
      </PageHeader>

      <Tabs defaultValue="ui" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ui">Textes de l'interface</TabsTrigger>
          <TabsTrigger value="data">Contenu métier</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: UI text overrides ──────────────────────────────────── */}
        <TabsContent value="ui" className="space-y-4">
          {/* Progress bars per language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {progressByLang.map(({ lang, translated, total }) => (
              <div key={lang} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{LANGUAGE_LABELS[lang] || lang.toUpperCase()}</span>
                  <span className="text-muted-foreground">
                    {translated}/{total} traduits
                  </span>
                </div>
                <Progress value={total > 0 ? (translated / total) * 100 : 0} className="h-2" />
              </div>
            ))}
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par clé ou valeur..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={v => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="translated">Traduits</SelectItem>
                <SelectItem value="untranslated">Non traduits</SelectItem>
                <SelectItem value="overridden">Surchargés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Chargement des traductions...
            </div>
          )}

          {!isLoading && filteredCategories.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Aucun résultat pour cette recherche.
            </div>
          )}

          {/* Single table with category group rows */}
          {!isLoading && filteredCategories.length > 0 && (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px] text-xs">Clé</TableHead>
                    <TableHead className="w-[250px] text-xs">Défaut système</TableHead>
                    {activeLanguages.map(lang => (
                      <TableHead key={lang} className="text-xs min-w-[200px]">
                        {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                        {lang === defaultLanguage && ' (surcharge)'}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map(({ category, keys, overrideCount }) => {
                    const isCollapsed = collapsedCategories.has(category);
                    return (
                      <Fragment key={category}>
                        {/* Category group header row */}
                        <TableRow
                          className="bg-muted/50 hover:bg-muted/70 cursor-pointer select-none"
                          onClick={() => toggleCategory(category)}
                        >
                          <TableCell
                            colSpan={2 + activeLanguages.length}
                            className="py-2"
                          >
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="font-medium text-sm">{category}</span>
                              <Chip variant="default" className="text-xs">
                                {keys.length}
                              </Chip>
                              {overrideCount > 0 && (
                                <Chip variant="primary" className="text-xs">
                                  {overrideCount} traduits
                                </Chip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Key rows (hidden when collapsed) */}
                        {!isCollapsed &&
                          keys.map(key => (
                            <TableRow key={key} className="group">
                              <TableCell className="font-mono text-xs text-muted-foreground py-1 pl-8">
                                {key}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground py-1">
                                {UI_DEFAULTS[key]}
                              </TableCell>
                              {activeLanguages.map(lang => (
                                <TableCell key={lang} className="py-1 px-1">
                                  <EditableCell
                                    value={getTranslation(key, lang)}
                                    defaultValue={UI_DEFAULTS[key]}
                                    isDefaultLanguage={lang === defaultLanguage}
                                    onSave={newValue => handleSave(key, lang, newValue)}
                                  />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Data translations (placeholder) ───────────────────── */}
        <TabsContent value="data" className="space-y-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Languages className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Contenu métier</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              La traduction du contenu métier (noms d'entités, valeurs de référentiels, etc.)
              sera disponible prochainement.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── CSV line parser (handles quoted fields) ─────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
