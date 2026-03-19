import { useState, useEffect, useMemo, useRef } from 'react';
import {
  useUpdateResponseStatus,
  useResponseFieldComments,
  useResolveFieldComment,
  type SurveyResponseWithDetails,
} from '@/hooks/useSurveyResponses';
import { useAddFieldComment } from '@/hooks/useSurveyResponseMutations';
import { useSaveResponseValues, type AggregationFieldConfig } from '@/hooks/useSaveResponseValues';
import { useAllReferentialValues } from '@/hooks/useReferentialValues';
import { useBoFieldDefinitions } from '@/hooks/useBoFieldDefinitions';
import { useObjectFieldValues } from '@/hooks/useBusinessObjectsWithFields';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { StepFieldConfig, SectionConfig, ValidationStep, FieldVisibilityCondition } from '@/components/builder/page-builder/types';
import { evaluateVisibilityConditions } from '@/lib/evaluate-visibility-conditions';
import { evaluateFormula } from '@/lib/formula-evaluator';
import { resolveAggregationValues } from '@/lib/aggregation-resolver';
import type { Json } from '@/types/database';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useAuth } from '@/hooks/useAuth';
import { SectionHeader } from './survey-response/SurveyResponseHeader';
import { SurveyResponseForm } from './survey-response/SurveyResponseForm';
import { cn } from '@/lib/utils';
import type { VisibleField } from './survey-response/SurveyFieldRenderer';
import { queryKeys } from '@/lib/query-keys';

type FieldValue = string | number | boolean | null | undefined;

interface SurveySettings {
  respondent_fields?: StepFieldConfig[];
  sections?: SectionConfig[];
  validation_steps?: ValidationStep[];
  campaign_type_id?: string;
  [key: string]: unknown;
}

interface CampaignType {
  id: string;
  sections?: SectionConfig[];
  [key: string]: unknown;
}

interface SurveyCreatorBlockConfig {
  type: string;
  config?: {
    campaign_types?: CampaignType[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ViewConfig {
  blocks?: SurveyCreatorBlockConfig[];
  [key: string]: unknown;
}

interface SurveyResponseFullPageProps {
  response: SurveyResponseWithDetails & { _user_role?: 'respondent' | 'validator' | 'readonly' };
  onBack: () => void;
  /** Active tab key from the campaign detail view — used to restrict commenting to matching roles */
  activeTab?: string | null;
}


export function SurveyResponseFullPage({ response, onBack, activeTab }: SurveyResponseFullPageProps) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { activeProfile } = useViewMode();
  const { user } = useAuth();

  const updateStatus = useUpdateResponseStatus();
  const saveValues = useSaveResponseValues();
  const { data: fieldComments = [] } = useResponseFieldComments(response.id);
  const resolveComment = useResolveFieldComment();
  const addComment = useAddFieldComment();

  // Fetch field definitions
  const { data: allFieldDefinitions = [] } = useBoFieldDefinitions(response._survey?.bo_definition_id);

  // Fetch survey settings to get step fields and sections
  const { data: surveySettings } = useQuery({
    queryKey: queryKeys.surveys.settingsForForm(response.campaign_id),
    queryFn: async () => {
      return api.get<SurveySettings>(`/api/surveys/campaigns/${response.campaign_id}/settings-for-form`);
    },
    enabled: !!response.campaign_id,
  });

  // Determine which step's fields and sections to use based on user's roles
  const { stepFields, sections } = useMemo(() => {
    if (!surveySettings) return { stepFields: [] as StepFieldConfig[], sections: [] as SectionConfig[] };

    const respondentFields: StepFieldConfig[] = surveySettings.respondent_fields || [];
    const respondentSections: SectionConfig[] = surveySettings.sections || [];
    const validationSteps: ValidationStep[] = surveySettings.validation_steps || [];

    const profileRoleIds = activeProfile?.roleIds || [];

    if (profileRoleIds.length > 0) {
      const matchedStep = validationSteps.find(step =>
        step.validator_roles?.some(r => profileRoleIds.includes(r))
      );
      if (matchedStep?.fields) {
        return { stepFields: matchedStep.fields, sections: matchedStep.sections || [] };
      }
    }

    return { stepFields: respondentFields, sections: respondentSections };
  }, [surveySettings, activeProfile?.roleIds]);

  // Build visible fields list preserving step config order
  const visibleFields: VisibleField[] = useMemo(() => {
    if (stepFields.length === 0) {
      // No step config, show all fields
      return allFieldDefinitions.map(fd => ({
        ...fd,
        visibility: 'visible' as const,
        is_required_override: fd.is_required,
        custom_label: undefined as string | undefined,
        section_id: undefined as string | undefined,
        visibility_conditions: undefined as FieldVisibilityCondition[] | undefined,
        visibility_logic: undefined as 'AND' | 'OR' | undefined,
      }));
    }

    const fdMap = new Map(allFieldDefinitions.map(fd => [fd.id, fd]));
    return stepFields
      .filter(sf => sf.visibility !== 'hidden')
      .map(sf => {
        const fd = fdMap.get(sf.field_id);
        if (!fd) return null;
        return {
          ...fd,
          visibility: sf.visibility,
          is_required_override: sf.is_required ?? fd.is_required,
          custom_label: sf.custom_label,
          section_id: sf.section_id,
          visibility_conditions: sf.visibility_conditions,
          visibility_logic: sf.visibility_logic,
          variation_threshold: sf.variation_threshold,
          variation_direction: sf.variation_direction,
        };
      })
      .filter(Boolean) as VisibleField[];
  }, [stepFields, allFieldDefinitions]);

  // Load all referential values at once
  const { data: refValuesMap } = useAllReferentialValues(visibleFields);

  // Group fields by section
  const sortedSections = useMemo(() => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    return sorted;
  }, [sections]);

  const fieldsBySection = useMemo(() => {
    const map = new Map<string | null, typeof visibleFields>();

    // Fields without a section — merge into first section if sections exist
    const unsectioned = visibleFields.filter(f => !f.section_id);

    if (sortedSections.length > 0 && unsectioned.length > 0) {
      // Prepend unsectioned fields to the first section
      const firstSectionId = sortedSections[0].id;
      const firstSectionFields = visibleFields.filter(f => f.section_id === firstSectionId);
      map.set(firstSectionId, [...unsectioned, ...firstSectionFields]);

      // Remaining sections
      for (let i = 1; i < sortedSections.length; i++) {
        const section = sortedSections[i];
        const sectionFields = visibleFields.filter(f => f.section_id === section.id);
        if (sectionFields.length > 0) map.set(section.id, sectionFields);
      }
    } else if (unsectioned.length > 0) {
      map.set(null, unsectioned);
    } else {
      for (const section of sortedSections) {
        const sectionFields = visibleFields.filter(f => f.section_id === section.id);
        if (sectionFields.length > 0) map.set(section.id, sectionFields);
      }
    }

    return map;
  }, [visibleFields, sortedSections]);

  // Fetch existing values
  const { data: existingValues = [] } = useObjectFieldValues(response.business_object_id);

  // Fetch previous campaign values
  const { data: previousValues = [] } = useQuery({
    queryKey: queryKeys.surveyResponses.previousCampaignValues(response.campaign_id, response.respondent_eo_id),
    queryFn: async () => {
      if (!response._campaign?.previous_campaign_id || !response.respondent_eo_id) return [];
      return api.get<Array<{ field_definition_id: string; value: unknown }>>(`/api/surveys/responses/previous-values?campaign_id=${response._campaign.previous_campaign_id}&eo_id=${response.respondent_eo_id}`);
    },
    enabled: !!response._campaign?.previous_campaign_id && !!response.respondent_eo_id,
  });

  // Initialize values
  const existingValuesKey = existingValues.map(v => v.field_definition_id + ':' + JSON.stringify(v.value)).join('|');
  useEffect(() => {
    if (existingValues.length > 0) {
      const valuesMap: Record<string, FieldValue> = {};
      existingValues.forEach(v => { valuesMap[v.field_definition_id] = v.value as FieldValue; });
      setValues(valuesMap);
    } else {
      setValues({});
    }
  }, [response.id, existingValuesKey, existingValues]);

  // Resolve aggregation fields using the shared resolver
  const aggFieldDefs = useMemo(() =>
    allFieldDefinitions.filter(f => f.field_type === 'aggregation'),
    [allFieldDefinitions]
  );

  const { data: resolvedAggValues } = useQuery({
    queryKey: ['resolved_agg_values', response.business_object_id, response.respondent_eo_id, aggFieldDefs.map(f => f.id).join(',')],
    queryFn: async () => {
      const objects = [{ id: response.business_object_id!, eo_id: response.respondent_eo_id || null }];
      const jsonValuesMap = new Map<string, Record<string, Json>>();
      const valRecord: Record<string, Json> = {};
      for (const [k, v] of Object.entries(values)) {
        valRecord[k] = v as Json;
      }
      jsonValuesMap.set(response.business_object_id!, valRecord);
      return resolveAggregationValues(aggFieldDefs as never, objects, jsonValuesMap);
    },
    enabled: aggFieldDefs.length > 0 && !!response.business_object_id,
  });

  // Enriched values: raw values + aggregation (resolved) + calculated (formula)
  const enrichedValues = useMemo(() => {
    const merged = { ...values };

    // Inject aggregation values from resolver
    if (resolvedAggValues) {
      resolvedAggValues.forEach((valueMap, fieldId) => {
        const val = valueMap.get(response.business_object_id!);
        if (val !== undefined) merged[fieldId] = val as FieldValue;
      });
    }

    // Evaluate calculated fields
    const calculatedFields = visibleFields.filter(f => f.field_type === 'calculated');
    const fieldsForFormula = allFieldDefinitions.map(fd => ({ id: fd.id, slug: fd.slug, name: fd.name }));
    for (const cf of calculatedFields) {
      const formula = cf.calculation_formula;
      if (formula) {
        const result = evaluateFormula(formula, merged, fieldsForFormula as never);
        if (result !== null && result !== undefined) merged[cf.id] = result as FieldValue;
      }
    }

    return merged;
  }, [values, resolvedAggValues, visibleFields, allFieldDefinitions, response.business_object_id]);

  // Set initial active section
  useEffect(() => {
    if (sortedSections.length > 0 && !activeSection) {
      setActiveSection(sortedSections[0].id);
    }
  }, [sortedSections, activeSection]);

  const previousValuesMap = useMemo(() => {
    const map: Record<string, FieldValue> = {};
    previousValues.forEach(v => { map[v.field_definition_id] = v.value as FieldValue; });
    return map;
  }, [previousValues]);

  const isValidator = response._user_role === 'validator';
  const isRespondent = response._user_role === 'respondent';
  // Role must match the active tab to have write/comment access
  const roleMatchesTab = !activeTab
    || (activeTab === 'respondent' && isRespondent)
    || (activeTab.startsWith('step_') && isValidator);
  const isReadOnly = !roleMatchesTab
    || response._user_role === 'readonly'
    || response.status === 'validated'
    || (isRespondent && !['pending', 'in_progress', 'rejected'].includes(response.status))
    || (isValidator && !['submitted', 'in_validation'].includes(response.status));

  // Show N-1 column if the campaign has a previous campaign linked
  const showPreviousColumn = !!response._campaign?.previous_campaign_id;

  // Build aggregation field configs for save
  const aggregationConfigs = useMemo((): AggregationFieldConfig[] => {
    return visibleFields
      .filter(f => f.field_type === 'aggregation')
      .map(f => {
        const s = (f.settings || {}) as Record<string, unknown>;
        if (!s.aggregation_editable) return null;
        const sourceField = s.aggregation_source_field as string | undefined;
        const sourceType = s.aggregation_source_type as 'eo' | 'user' | 'object' | undefined;
        const targetFieldId = s.aggregation_target_field_id as string | undefined;
        if (!sourceField || !sourceType || !targetFieldId) return null;

        let sourceEntityId: string | undefined;
        if (sourceType === 'eo' && sourceField === '__system_eo_id') {
          sourceEntityId = response.respondent_eo_id || undefined;
        } else {
          // For custom reference fields, the referenced entity ID is in values
          const refValue = values[sourceField];
          sourceEntityId = typeof refValue === 'string' ? refValue : undefined;
        }
        if (!sourceEntityId) return null;

        return { fieldId: f.id, sourceType, sourceEntityId, targetFieldId };
      })
      .filter(Boolean) as AggregationFieldConfig[];
  }, [visibleFields, values, response.respondent_eo_id]);

  const handleValueChange = (fieldId: string, value: FieldValue) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveDraft = async () => {
    if (!response.business_object_id) {
      toast.error('Aucun objet métier lié à cette réponse');
      return;
    }
    try {
      await saveValues.mutateAsync({ businessObjectId: response.business_object_id, values, aggregationFields: aggregationConfigs });
      // Only update status for respondents — validators save values without touching status
      if (isRespondent && response.status === 'pending') {
        await updateStatus.mutateAsync({ id: response.id, status: 'in_progress' });
      }
      toast.success('Enregistré');
      onBack();
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleSubmit = async () => {
    if (!response.business_object_id) {
      toast.error('Aucun objet métier lié à cette réponse');
      return;
    }
    const missingRequired = visibleFields.filter(
      f => f.is_required_override
        && evaluateVisibilityConditions(f.visibility_conditions, enrichedValues, f.visibility_logic)
        && (enrichedValues[f.id] === undefined || enrichedValues[f.id] === null || enrichedValues[f.id] === '')
    );
    if (missingRequired.length > 0) {
      toast.error(`${missingRequired.length} champ(s) obligatoire(s) non rempli(s)`);
      return;
    }
    try {
      await saveValues.mutateAsync({ businessObjectId: response.business_object_id, values, aggregationFields: aggregationConfigs });
      await updateStatus.mutateAsync({ id: response.id, status: 'submitted', validationSteps: surveySettings?.validation_steps });
      toast.success('Questionnaire soumis');
      onBack();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Erreur lors de la soumission');
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await resolveComment.mutateAsync(commentId);
      toast.success('Commentaire marqué comme résolu');
    } catch {
      toast.error('Erreur');
    }
  };

  // Compute current step label for comments
  const currentStepLabel = useMemo(() => {
    if (isRespondent || ['pending', 'in_progress', 'rejected'].includes(response.status)) {
      return 'Répondant';
    }
    const steps = surveySettings?.validation_steps || [];
    const currentStep = steps.find(s => s.id === response.current_step_id);
    return currentStep?.name || 'Valideur';
  }, [isRespondent, response.status, response.current_step_id, surveySettings]);

  const handleAddComment = async (fieldId: string, comment: string) => {
    try {
      await addComment.mutateAsync({
        responseId: response.id,
        fieldDefinitionId: fieldId,
        comment,
        commentType: 'correction_needed',
        stepLabel: currentStepLabel,
      });
    } catch {
      toast.error('Erreur');
    }
  };

  // Can comment only if user has an action role matching the current tab
  const canComment = !isReadOnly;

  const handleValidate = async () => {
    if (!response.business_object_id) return;
    try {
      await saveValues.mutateAsync({ businessObjectId: response.business_object_id, values, aggregationFields: aggregationConfigs });
      await updateStatus.mutateAsync({
        id: response.id,
        status: 'validated',
        currentStepId: response.current_step_id,
        validationSteps: surveySettings?.validation_steps,
      });
      toast.success('Enquête validée');
      onBack();
    } catch {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleReject = async () => {
    try {
      await updateStatus.mutateAsync({
        id: response.id,
        status: 'rejected',
        currentStepId: response.current_step_id,
        validationSteps: surveySettings?.validation_steps,
      });
      toast.success('Enquête refusée');
      onBack();
    } catch {
      toast.error('Erreur lors du refus');
    }
  };

  const scrollToSection = (sectionId: string | null) => {
    setActiveSection(sectionId);
    const key = sectionId || '__unsectioned';
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Build the sections navigation list
  const navSections = useMemo(() => {
    const items: Array<{ id: string | null; name: string; index: number }> = [];
    let idx = 1;

    if (sortedSections.length === 0) {
      // No sections configured: single group with all fields
      if (visibleFields.length > 0) {
        items.push({ id: null, name: response._survey?.name || 'Questionnaire', index: idx++ });
      }
    } else {
      // Unsectioned fields are merged into the first section, so just list sections
      for (const section of sortedSections) {
        if (fieldsBySection.has(section.id)) {
          items.push({ id: section.id, name: section.name, index: idx++ });
        }
      }
    }

    return items;
  }, [sortedSections, fieldsBySection, visibleFields.length, response._survey?.name]);

  // Determine active section from effective navigation
  const effectiveActiveSection = activeSection ?? (navSections[0]?.id ?? null);

  // Section navigation helpers
  const currentSectionIndex = navSections.findIndex(s => s.id === effectiveActiveSection);
  const hasNextSection = currentSectionIndex < navSections.length - 1;
  const hasPrevSection = currentSectionIndex > 0;

  const goToNextSection = () => {
    if (hasNextSection) {
      const next = navSections[currentSectionIndex + 1];
      scrollToSection(next.id);
    }
  };

  const goToPrevSection = () => {
    if (hasPrevSection) {
      const prev = navSections[currentSectionIndex - 1];
      scrollToSection(prev.id);
    }
  };

  // Get current section name
  const currentSectionName = navSections.length > 0
    ? (navSections.find(s => s.id === effectiveActiveSection)?.name || 'Général')
    : response._survey?.name || 'Questionnaire';

  // Filter out fields whose visibility conditions are not met
  const conditionallyVisibleFields = useMemo(() => {
    // Get fields for active section
    const activeSectionFields = effectiveActiveSection !== undefined
      ? (fieldsBySection.get(effectiveActiveSection) || [])
      : visibleFields;
    return activeSectionFields.filter(field =>
      evaluateVisibilityConditions(field.visibility_conditions, enrichedValues, field.visibility_logic)
    );
  }, [effectiveActiveSection, fieldsBySection, visibleFields, enrichedValues]);


  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Section header */}
      <SectionHeader
        currentSectionName={currentSectionName}
        eoName={response._eo?.name}
        campaignName={response._campaign?.name}
        responseStatus={response.status}
        onBack={onBack}
        isReadOnly={isReadOnly}
        isSaving={saveValues.isPending || updateStatus.isPending}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />

      {/* Content: sidebar + form */}
      <div className="flex-1 min-h-0 flex">
        {/* Left sidebar navigation */}
        {navSections.length > 1 && (
          <nav className="w-64 flex-shrink-0 border-r bg-muted/30 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navSections.map((nav) => (
                <li key={nav.id ?? '__unsectioned'}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(nav.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      effectiveActiveSection === nav.id
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {nav.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Form body */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <SurveyResponseForm
        visibleFields={visibleFields}
        activeSectionFields={conditionallyVisibleFields}
        fieldsBySection={fieldsBySection}
        sortedSections={sortedSections}
        sectionRefs={sectionRefs}
        values={enrichedValues}
        previousValuesMap={previousValuesMap}
        fieldComments={fieldComments}
        isReadOnly={isReadOnly}
        showPreviousColumn={showPreviousColumn}
        refValuesMap={refValuesMap}
        onValueChange={handleValueChange}
        onResolveComment={handleResolveComment}
        onAddComment={canComment ? handleAddComment : undefined}
        canComment={canComment}
        currentUserId={user?.id}
        responseId={response.id}
        stepLabel={currentStepLabel}
        onSave={!isReadOnly ? handleSaveDraft : undefined}
        isSaving={saveValues.isPending}
        onSubmit={isRespondent && !isReadOnly ? handleSubmit : undefined}
        onValidate={isValidator && !isReadOnly ? handleValidate : undefined}
        onReject={isValidator && !isReadOnly ? handleReject : undefined}
        isSubmitting={saveValues.isPending || updateStatus.isPending}
        navSections={navSections}
        hasNextSection={hasNextSection}
        hasPrevSection={hasPrevSection}
        onNextSection={goToNextSection}
        onPrevSection={goToPrevSection}
        businessObjectId={response?.business_object_id}
          />
        </div>
      </div>
    </div>
  );
}
