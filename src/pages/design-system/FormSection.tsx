import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  username: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
});

export default function FormSection() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Form
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => {})} className="w-[400px] space-y-4 rounded-lg border p-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom d'utilisateur</FormLabel>
                <FormControl>
                  <Input placeholder="jean_dupont" {...field} />
                </FormControl>
                <FormDescription>Votre nom d'affichage public.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jean@exemple.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
