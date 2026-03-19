import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Building2, UserPlus, Trash2, Users, Archive } from 'lucide-react';
import { formatFullName } from '@/lib/format-name';
import type { Client } from '@/hooks/useClients';
import {
  useIntegrators,
  useIntegratorAssignments,
  useAssignIntegratorToClient,
  useRemoveIntegratorFromClient,
} from '@/hooks/useAdminData';
import { AssignIntegratorToClientDialog } from './AssignIntegratorToClientDialog';

const formSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSubmit: (data: FormValues) => Promise<void>;
  isSubmitting: boolean;
  onArchive?: (client: Client) => void;
}

export function ClientEditDrawer({ open, onOpenChange, client, onSubmit, isSubmitting: _isSubmitting, onArchive }: ClientEditDrawerProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const { data: integrators = [] } = useIntegrators();
  const { data: allAssignments = [] } = useIntegratorAssignments();
  const assignMutation = useAssignIntegratorToClient();
  const removeMutation = useRemoveIntegratorFromClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', is_active: true },
  });


  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isResettingRef = useRef(false);

  // Mark reset to avoid triggering auto-save on form.reset()
  useEffect(() => {
    if (client) {
      isResettingRef.current = true;
      form.reset({
        name: client.name,
        is_active: client.is_active,
      });
      // Allow a tick for watch to fire from reset, then re-enable
      setTimeout(() => { isResettingRef.current = false; }, 100);
    }
  }, [client, form]);

  const autoSave = useCallback(async () => {
    if (!client || isResettingRef.current) return;
    const isValid = await form.trigger();
    if (!isValid) return;
    const values = form.getValues();
    await onSubmit(values);
  }, [form, onSubmit, client]);

  // Watch for changes and auto-save with debounce
  useEffect(() => {
    const subscription = form.watch(() => {
      if (isResettingRef.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 1500);
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [form, autoSave]);

  if (!client) return null;

  const clientAssignments = allAssignments.filter(a => a.client_id === client.id);
  const assignedUserIds = new Set(clientAssignments.map(a => a.user_id));
  const availableIntegrators = integrators.filter(i => !assignedUserIds.has(i.user_id) && i.persona !== 'admin_delta');

  const handleAssign = async (userId: string) => {
    try {
      await assignMutation.mutateAsync({
        userId,
        clientId: client.id,
        persona: 'integrator_delta',
      });
    } catch { /* intentionally ignored */ }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeMutation.mutateAsync(assignmentId);
    } catch { /* intentionally ignored */ }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">{client.name}</SheetTitle>
              
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Edit Form */}
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


            </div>
          </Form>

          <Separator />

          {/* Integrators Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Intégrateurs ({clientAssignments.length})
              </h3>
              <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
                Ajouter
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {clientAssignments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Aucun intégrateur assigné à ce client
                </div>
              ) : (
                clientAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(formatFullName(assignment.profiles?.first_name, assignment.profiles?.last_name), assignment.profiles?.email || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{formatFullName(assignment.profiles?.first_name, assignment.profiles?.last_name, 'Utilisateur')}</div>
                        <div className="text-xs text-muted-foreground">{assignment.profiles?.email}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(assignment.id)}
                      disabled={removeMutation.isPending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {onArchive && (
          <div className="mt-auto pt-4 pb-2 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onArchive(client);
                onOpenChange(false);
              }}
            >
              Archiver ce client
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SheetContent>

      <AssignIntegratorToClientDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        availableIntegrators={availableIntegrators}
        onAssign={handleAssign}
        isPending={assignMutation.isPending}
      />
    </Sheet>
  );
}
