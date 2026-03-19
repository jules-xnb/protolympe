import { type MutableRefObject, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { AlertCircle, Check, Save, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SurveyFieldRenderer, type VisibleField } from './SurveyFieldRenderer';
import { evaluateVisibilityConditions } from '@/lib/evaluate-visibility-conditions';
import { useT } from '@/hooks/useT';

// ── Types ────────────────────────────────────────────────────────────────────

type RefValuesMap = Map<string, Array<{ id: string; label: string; code: string }>>;

interface FieldComment {
  id: string;
  field_definition_id: string;
  commenter_user_id?: string;
  is_resolved: boolean;
  comment: string;
  step_label?: string | null;
  _commenter?: { full_name?: string | null; email?: string };
}

interface NavSection {
  id: string | null;
  name: string;
  index: number;
}

interface SectionConfig {
  id: string;
  name: string;
  order: number;
}

interface SurveyResponseFormProps {
  visibleFields: VisibleField[];
  activeSectionFields: VisibleField[];
  fieldsBySection: Map<string | null, VisibleField[]>;
  sortedSections: SectionConfig[];
  sectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  values: Record<string, unknown>;
  previousValuesMap: Record<string, unknown>;
  fieldComments: FieldComment[];
  isReadOnly: boolean;
  showPreviousColumn: boolean;
  refValuesMap: RefValuesMap | undefined;
  onValueChange: (fieldId: string, value: unknown) => void;
  onResolveComment: (commentId: string) => void;
  onAddComment?: (fieldId: string, comment: string) => void;
  canComment?: boolean;
  businessObjectId?: string;
  currentUserId?: string;
  responseId?: string;
  stepLabel?: string;
  // Save (manual)
  onSave?: () => void;
  isSaving?: boolean;
  // Submit (respondent)
  onSubmit?: () => void;
  // Validate/Reject (validator)
  onValidate?: () => void;
  onReject?: () => void;
  isSubmitting?: boolean;
  // Section navigation
  navSections: NavSection[];
  hasNextSection: boolean;
  hasPrevSection: boolean;
  onNextSection: () => void;
  onPrevSection: () => void;
}

// ── SurveyResponseForm ─────────────────────────────────────────────────────

export function SurveyResponseForm({
  visibleFields,
  fieldsBySection,
  sortedSections,
  sectionRefs,
  values,
  previousValuesMap,
  fieldComments,
  isReadOnly,
  showPreviousColumn,
  refValuesMap,
  onValueChange,
  onResolveComment,
  onAddComment,
  canComment,
  businessObjectId,
  currentUserId,
  responseId,
  stepLabel,
  onSave,
  isSaving,
  onSubmit,
  onValidate,
  onReject,
  isSubmitting,
}: SurveyResponseFormProps) {
  const { t } = useT();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Comment drafts state — lifted from SurveyFieldRenderer so save can flush them
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const onCommentDraftChange = useCallback((fieldId: string, draft: string) => {
    setCommentDrafts(prev => ({ ...prev, [fieldId]: draft }));
  }, []);

  const flushCommentDrafts = useCallback(async () => {
    if (!onAddComment) return;
    const entries = Object.entries(commentDrafts).filter(([, v]) => v.trim());
    for (const [fieldId, draft] of entries) {
      await onAddComment(fieldId, draft.trim());
    }
    if (entries.length > 0) setCommentDrafts({});
  }, [commentDrafts, onAddComment]);

  // Save only saves field values — comments stay as drafts
  const handleSaveOnly = useCallback(async () => {
    onSave?.();
  }, [onSave]);

  // Pre-compute comments grouped by field ID (stable reference per field)
  const emptyComments: typeof fieldComments = useMemo(() => [], []);
  const commentsByFieldId = useMemo(() => {
    const map = new Map<string, typeof fieldComments>();
    for (const c of fieldComments) {
      if (c.is_resolved) continue;
      const arr = map.get(c.field_definition_id) || [];
      arr.push(c);
      map.set(c.field_definition_id, arr);
    }
    return map;
  }, [fieldComments]);

  const renderFieldTable = (fields: VisibleField[]) => {
    const visibleFieldsFiltered = fields.filter(field =>
      evaluateVisibilityConditions(field.visibility_conditions, values, field.visibility_logic)
    );
    if (visibleFieldsFiltered.length === 0) return null;

    const showCommentColumn = canComment || fieldComments.some(c => !c.is_resolved);

    return (
      <div>
        <Table className="border-separate border-spacing-0 [&_th]:border-b [&_th:first-child]:border-l [&_td]:border-b [&_td:first-child]:border-l [&_th]:border-t [&_tr:last-child_td]:border-b">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="border-0">
              <TableHead style={{ width: showCommentColumn ? '30%' : '40%' }}>{t('survey.field_col')}</TableHead>
              {showPreviousColumn && (
                <>
                  <TableHead style={{ width: '15%' }}>{t('survey.n1_value_col')}</TableHead>
                  <TableHead className="w-8"></TableHead>
                </>
              )}
              <TableHead style={{ width: showPreviousColumn ? '25%' : (showCommentColumn ? '35%' : '50%') }}>{t('survey.value_col')}</TableHead>
              {showCommentColumn && (
                <TableHead style={{ width: showPreviousColumn ? '20%' : '25%' }}>Commentaires</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleFieldsFiltered.map(field => (
              <SurveyFieldRenderer
                key={field.id}
                field={field}
                value={values[field.id]}
                previousValue={previousValuesMap[field.id]}
                fieldComments={commentsByFieldId.get(field.id) ?? emptyComments}
                isReadOnly={isReadOnly}
                canComment={canComment}
                showCommentColumn={showCommentColumn}
                showPreviousColumn={showPreviousColumn}
                refValuesMap={refValuesMap}
                onValueChange={onValueChange}
                onAddComment={onAddComment}
                commentDraft={commentDrafts[field.id] ?? ''}
                onCommentDraftChange={onCommentDraftChange}
                currentUserId={currentUserId}
                onResolveComment={onResolveComment}
                businessObjectId={businessObjectId}
                responseId={responseId}
                stepLabel={stepLabel}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <>
      {/* Scrollable content — all sections displayed */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-8 pb-24"
      >
        {visibleFields.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('survey.no_fields_in_survey')}</p>
          </div>
        ) : sortedSections.length > 0 ? (
          <div className="space-y-8">
            {sortedSections.map((section) => {
              const sectionFields = fieldsBySection.get(section.id);
              if (!sectionFields || sectionFields.length === 0) return null;
              return (
                <div
                  key={section.id}
                  ref={(el) => { sectionRefs.current[section.id] = el; }}
                >
                  <h2 className="text-lg font-semibold mb-4">{section.name}</h2>
                  {renderFieldTable(sectionFields)}
                </div>
              );
            })}
          </div>
        ) : (
          // No sections — single block with all fields
          <div ref={(el) => { sectionRefs.current['__unsectioned'] = el; }}>
            {renderFieldTable(visibleFields)}
          </div>
        )}
      </div>

      {/* Bottom bar — action buttons */}
      {(onSave || onSubmit || onValidate || onReject) && (
        <div className="flex-shrink-0 px-8 py-4 border-t bg-background flex items-center justify-end gap-3">
          {onSave && (
            <Button
              variant="outline"
              onClick={handleSaveOnly}
              disabled={isSaving}
            >
              {t('buttons.save')}
              <Save className="h-4 w-4" />
            </Button>
          )}
          {onReject && (
            <Button
              variant="destructive"
              onClick={async () => { await flushCommentDrafts(); onReject(); }}
              disabled={isSubmitting}
            >
              Refuser
              <X className="h-4 w-4" />
            </Button>
          )}
          {onValidate && (
            <Button
              onClick={async () => { await flushCommentDrafts(); onValidate(); }}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Valider
              <Check className="h-4 w-4" />
            </Button>
          )}
          {onSubmit && (
            <Button
              onClick={async () => { await flushCommentDrafts(); onSubmit(); }}
              disabled={isSubmitting}
            >
              {t('buttons.submit')}
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </>
  );
}
