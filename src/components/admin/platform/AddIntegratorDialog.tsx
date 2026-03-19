import { z } from 'zod';
import { FormDialog } from '@/components/ui/form-dialog';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { FloatingInput } from '@/components/ui/floating-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInviteIntegrator } from '@/hooks/useAdminData';

const schema = z.object({
  email: z.string().email('Email invalide').min(1, 'Requis'),
  firstName: z.string().min(1, 'Requis'),
  lastName: z.string().min(1, 'Requis'),
  persona: z.enum(['admin_delta', 'integrator_delta']),
});
type FormValues = z.infer<typeof schema>;

interface AddIntegratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddIntegratorDialog({ open, onOpenChange }: AddIntegratorDialogProps) {
  const inviteIntegrator = useInviteIntegrator();

  const handleSubmit = async (values: FormValues) => {
    try {
      await inviteIntegrator.mutateAsync({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        persona: values.persona,
      });
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter un intégrateur"
      schema={schema}
      defaultValues={{ email: '', firstName: '', lastName: '', persona: 'integrator_delta' }}
      onSubmit={handleSubmit}
      isSubmitting={inviteIntegrator.isPending}
      submitLabel="Créer le compte"
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingInput label="Prénom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingInput label="Nom" {...field} />
                  </FormControl>
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
                <FormControl>
                  <FloatingInput label="Email" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="persona"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rôle</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="integrator_delta">Intégrateur Delta</SelectItem>
                    <SelectItem value="admin_delta">Admin Delta</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </FormDialog>
  );
}
