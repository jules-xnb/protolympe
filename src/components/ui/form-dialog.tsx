import { type ReactNode } from "react";
import { useForm, type UseFormReturn, type FieldValues, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ZodSchema } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormDialogProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: ZodSchema<T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (values: T) => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  footerLeft?: ReactNode;
  children: (form: UseFormReturn<T>) => ReactNode;
  className?: string;
}

export function FormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Enregistrer",
  cancelLabel = "Annuler",
  footerLeft,
  children,
  className,
}: FormDialogProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    values: defaultValues as T,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(defaultValues);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("w-[var(--modal-width)]", className)}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>

            <div className="space-y-4 py-4">{children(form)}</div>

            <DialogFooter className="sm:justify-between">
              <div>{footerLeft}</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleOpenChange(false)}
                >
                  {cancelLabel}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "En cours..." : submitLabel}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
