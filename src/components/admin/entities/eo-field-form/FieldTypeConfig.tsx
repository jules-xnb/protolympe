import { Lock } from 'lucide-react';
import type { Referential } from '@/hooks/useReferentials';
import { useReferentialValues } from '@/hooks/useReferentialValues';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldTypeCommentRules } from './FieldTypeCommentRules';
import { FieldTypeAutoGenerate } from './FieldTypeAutoGenerate';
import { FieldFormatConfig } from './FieldFormatConfig';
import { FieldReferentialPicker } from './FieldReferentialPicker';
import { FieldOptionsConfig } from './FieldOptionsConfig';
import { FieldBooleanConfig } from './FieldBooleanConfig';
import { getGroupedFieldTypes } from '@/lib/field-type-registry';

// EO field types — exclude BO-specific / special types
const EO_EXCLUDED = ['document', 'file', 'image', 'user_reference', 'eo_reference', 'object_reference', 'calculated', 'aggregation', 'section', 'initials'];
const groupedFieldTypes = getGroupedFieldTypes((t) => !EO_EXCLUDED.includes(t.value));

export interface FieldTypeConfigFormData {
  name: string;
  slug: string;
  description: string;
  field_type: string;
  options: string[];
  default_value: string | null;
  referential_id: string | null;
  max_length: number | null;
  comment_enabled: boolean;
  comment_required: boolean;
  comment_transitions: { from: string; to: string }[];
  auto_generate_enabled: boolean;
  auto_generate_mode: 'counter' | 'prefix_counter' | 'uuid' | 'date' | 'fixed_value';
  auto_generate_prefix: string;
  auto_generate_padding: number;
  auto_generate_date_format: string;
  auto_generate_fixed_value: string;
  format_enabled: boolean;
  format_type: 'zero_pad';
  format_length: number;
  boolean_true_label: string;
  boolean_false_label: string;
}

interface FieldTypeConfigProps {
  formData: FieldTypeConfigFormData;
  onFormDataChange: (updater: (prev: FieldTypeConfigFormData) => FieldTypeConfigFormData) => void;
  optionInput: string;
  onOptionInputChange: (value: string) => void;
  onNameChange: (name: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  isSystemField: boolean;
  isSystemIsActive: boolean;
  showOptions: boolean;
  isTextType: boolean;
  referentials?: Referential[];
}

export function FieldTypeConfig({
  formData,
  onFormDataChange,
  optionInput,
  onOptionInputChange,
  onNameChange,
  onAddOption,
  onRemoveOption,
  isSystemField,
  isSystemIsActive,
  showOptions,
  isTextType,
  referentials,
}: FieldTypeConfigProps) {
  const isSelectType = ['select', 'multiselect'].includes(formData.field_type);
  const { data: referentialValues = [] } = useReferentialValues(
    isSelectType ? formData.referential_id : undefined
  );
  const showDateFormat = ['date', 'datetime'].includes(formData.field_type);

  // For select/multiselect with auto-generate, force mode to fixed_value
  const autoGenSelectMode = isSelectType && formData.auto_generate_enabled;
  if (autoGenSelectMode && formData.auto_generate_mode !== 'fixed_value') {
    onFormDataChange((prev) => ({ ...prev, auto_generate_mode: 'fixed_value' }));
  }

  // Build the list of available options for the auto-generate value picker
  const selectAutoGenOptions = isSelectType
    ? (formData.referential_id
        ? referentialValues.map((v) => v.label)
        : formData.options)
    : [];

  return (
    <>
      {isSystemField ? (
        /* System field: locked structural info, but name is always editable */
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Champ système</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Nom</span>
              <Input
                value={formData.name}
                onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Slug</span>
              <p className="font-mono text-xs">{formData.slug}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Type</span>
              <p>{isSystemIsActive ? 'Booléen' : 'Texte court'}</p>
            </div>
          </div>
          {isSystemIsActive && (
            <FieldBooleanConfig
              formData={formData}
              onFormDataChange={onFormDataChange}
              isSystemIsActive
            />
          )}
        </div>
      ) : (
        /* Normal field: editable structural fields */
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du champ *</Label>
              <Input
                value={formData.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Ex: Numéro SIRET"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Aide pour les utilisateurs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type de champ</Label>
            <Select
              value={formData.field_type}
              onValueChange={(value) =>
                onFormDataChange((prev) => {
                  const validModes = ['fixed_value'];
                  if (['text', 'textarea', 'number', 'decimal'].includes(value)) validModes.push('counter');
                  if (['text', 'textarea'].includes(value)) validModes.push('uuid');
                  if (['text', 'textarea', 'date', 'datetime'].includes(value)) validModes.push('date');
                  const modeReset = !validModes.includes(prev.auto_generate_mode) ? { auto_generate_mode: 'fixed_value' as const } : {};
                  return { ...prev, field_type: value, ...modeReset };
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedFieldTypes).map(([group, types]) => (
                  <div key={group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group}
                    </div>
                    {types.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date format */}
          {showDateFormat && (
            <div className="space-y-2">
              <Label>Format d'affichage</Label>
              <Select
                value={(formData as Record<string, unknown>).date_format as string || 'dd/MM/yyyy'}
                onValueChange={(v) => onFormDataChange((prev) => ({ ...prev, date_format: v } as typeof prev))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">jj/mm/aaaa</SelectItem>
                  <SelectItem value="MM/dd/yyyy">mm/jj/aaaa</SelectItem>
                  <SelectItem value="yyyy-MM-dd">aaaa-mm-jj</SelectItem>
                  <SelectItem value="dd MMMM yyyy">jj mois aaaa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {isTextType && !isSystemField && (
        <div className="space-y-2">
          <Label>Longueur maximale</Label>
          <Input
            type="number"
            min={1}
            value={formData.max_length ?? ''}
            onChange={(e) =>
              onFormDataChange((prev) => ({
                ...prev,
                max_length: e.target.value ? parseInt(e.target.value, 10) : null,
              }))
            }
            placeholder="Aucune limite"
          />
          <p className="text-xs text-muted-foreground">Laisser vide pour aucune limite</p>
        </div>
      )}

      {/* Format d'affichage */}
      {['text', 'number', 'decimal'].includes(formData.field_type) && !isSystemField && (
        <FieldFormatConfig formData={formData} onFormDataChange={onFormDataChange} />
      )}

      {/* Referential picker for select/multiselect */}
      {showOptions && !isSystemField && referentials && referentials.length > 0 && (
        <FieldReferentialPicker
          formData={formData}
          onFormDataChange={onFormDataChange}
          referentials={referentials}
          referentialValues={referentialValues}
        />
      )}

      {/* Options manuelles : uniquement pour checkbox (pas select/multiselect qui utilisent un référentiel) */}
      {!isSystemField && formData.field_type === 'checkbox' && !formData.referential_id && (
        <FieldOptionsConfig
          formData={formData}
          onFormDataChange={onFormDataChange}
          optionInput={optionInput}
          onOptionInputChange={onOptionInputChange}
          onAddOption={onAddOption}
          onRemoveOption={onRemoveOption}
        />
      )}

      {/* Default value & labels for boolean-like fields */}
      {!isSystemField && formData.field_type === 'boolean' && (
        <FieldBooleanConfig formData={formData} onFormDataChange={onFormDataChange} />
      )}

      {/* Comment rules for select fields or system is_active */}
      {((showOptions && !isSystemField) || isSystemIsActive) && (
        <>
          <Separator />
          <FieldTypeCommentRules
            formData={formData}
            onFormDataChange={onFormDataChange}
            isSystemIsActive={isSystemIsActive}
          />
          <Separator />
        </>
      )}

      {/* Auto-generate section (not for system is_active) */}
      {!isSystemIsActive && (
        <FieldTypeAutoGenerate
          formData={formData}
          onFormDataChange={onFormDataChange}
          isSelectType={isSelectType}
          selectAutoGenOptions={selectAutoGenOptions}
        />
      )}
    </>
  );
}
