import { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { FloatingInput } from '@/components/ui/floating-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInviteClientUser } from '@/hooks/useClientUsers';
import { useUserFieldDefinitions, type UserFieldDefinition } from '@/hooks/useUserFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

const baseSchema = z.object({
  email: z.string().email('Email invalide').min(1, 'Requis'),
  firstName: z.string(),
  lastName: z.string(),
});
type BaseFormValues = z.infer<typeof baseSchema>;

// ── Dynamic field renderer ────────────────────────────────────────────────────

function DynamicFieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: UserFieldDefinition;
  value: unknown;
  error?: string;
  onChange: (val: unknown) => void;
}) {
  const label = field.is_required ? field.name + ' *' : field.name;

  if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 bg-gray-50">
        <Label className="text-sm font-medium">{field.name}</Label>
        <Switch
          checked={!!value}
          onCheckedChange={(v) => onChange(v)}
        />
      </div>
    );
  }

  if (field.field_type === 'select') {
    const opts = (field.options || []) as Array<string | { value: string; label: string }>;
    return (
      <div className="space-y-1">
        <fieldset className={`rounded-lg border px-3 pt-1 pb-2 ${error ? 'border-destructive' : ''}`}>
          <legend className={`text-xs px-1 ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
            {label}
          </legend>
          <Select value={String(value ?? '')} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="h-8 border-0 shadow-none p-0 text-sm focus:ring-0">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o, i) => {
                const val = typeof o === 'string' ? o : o.value;
                const lbl = typeof o === 'string' ? o : o.label;
                return <SelectItem key={i} value={val}>{lbl}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </fieldset>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  const inputType =
    field.field_type === 'number' ? 'number'
    : field.field_type === 'date' ? 'date'
    : field.field_type === 'email' ? 'email'
    : 'text';

  return (
    <div className="space-y-1">
      <fieldset className={`rounded-lg border px-3 pt-1 pb-2 ${error ? 'border-destructive' : ''}`}>
        <legend className={`text-xs px-1 ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
          {label}
        </legend>
        <Input
          type={inputType}
          value={String(value ?? '')}
          onChange={(e) => onChange(
            field.field_type === 'number'
              ? (e.target.value === '' ? '' : Number(e.target.value))
              : e.target.value
          )}
          className="h-auto p-0 text-sm bg-transparent border-none shadow-none focus-visible:border-none focus-visible:ring-0"
        />
      </fieldset>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── InviteUserDialog ──────────────────────────────────────────────────────────

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const { selectedClient } = useViewMode();
  const inviteMutation = useInviteClientUser();
  const { data: allFields = [] } = useUserFieldDefinitions(selectedClient?.id);

  const customFields = useMemo(
    () => allFields.filter(f => f.field_type !== 'initials'),
    [allFields],
  );

  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  const form = useForm<BaseFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: { email: '', firstName: '', lastName: '' },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setCustomValues({});
      setCustomErrors({});
    }
    onOpenChange(nextOpen);
  };

  const validateCustomFields = (): boolean => {
    const errors: Record<string, string> = {};
    for (const field of customFields) {
      if (!field.is_required) continue;
      if (field.field_type === 'boolean' || field.field_type === 'checkbox') continue;
      const value = customValues[field.id];
      const isEmpty = value === null || value === undefined || String(value).trim() === '';
      if (isEmpty) errors[field.id] = 'Ce champ est obligatoire';
    }
    setCustomErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (values: BaseFormValues) => {
    if (!validateCustomFields()) return;

    try {
      const result = await inviteMutation.mutateAsync({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
      }) as {
        userId: string;
        membershipId: string;
      };

      // Save custom field values if any were filled
      const userId = result?.userId;
      if (userId && customFields.length > 0) {
        const fieldEntries = customFields
          .filter(f => customValues[f.id] !== undefined && customValues[f.id] !== '')
          .map(f => ({
            user_id: userId,
            field_definition_id: f.id,
            value: customValues[f.id] ?? null,
          }));

        if (fieldEntries.length > 0) {
          await api.post(`/api/client-users/${userId}/field-values`, fieldEntries);
        }
      }

      toast.success('Utilisateur ajouté — configurez ses profils puis activez-le');
      handleOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'invitation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>Inviter un utilisateur</DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Base fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl><FloatingInput label="Prénom" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl><FloatingInput label="Nom" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><FloatingInput label="Email *" type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom fields */}
              {customFields.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  {customFields.map(field => (
                    <DynamicFieldInput
                      key={field.id}
                      field={field}
                      value={customValues[field.id]}
                      error={customErrors[field.id]}
                      onChange={(val) => {
                        setCustomValues(prev => ({ ...prev, [field.id]: val }));
                        if (customErrors[field.id]) {
                          setCustomErrors(prev => { const next = { ...prev }; delete next[field.id]; return next; });
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={inviteMutation.isPending}
                onClick={() => handleOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'En cours...' : 'Inviter'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
