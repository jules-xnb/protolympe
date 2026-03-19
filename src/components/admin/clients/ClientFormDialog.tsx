import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FloatingInput } from '@/components/ui/floating-input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Client } from '@/hooks/useClients';

const formSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSubmit: (data: FormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
  isSubmitting,
}: ClientFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        is_active: client.is_active,
      });
    } else {
      form.reset({
        name: '',
        is_active: true,
      });
    }
  }, [client, form]);


  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Modifier le client' : 'Créer un client'}
          </DialogTitle>
          <DialogDescription>
            {client
              ? 'Modifiez les informations du client.'
              : 'Ajoutez un nouveau client à la plateforme.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingInput label="Nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {client && (
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Actif</FormLabel>
                        <FormDescription>
                          Désactivez pour empêcher l'accès au client
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Enregistrement...'
                  : client
                  ? 'Mettre à jour'
                  : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
