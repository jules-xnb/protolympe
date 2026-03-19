import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Calculator, Calendar, CreditCard, Settings, Smile, User } from "lucide-react";

export default function CommandSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Command
      </h2>
      <Command className="rounded-lg border shadow-md w-[400px]">
        <CommandInput placeholder="Rechercher une commande..." />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Calendrier</span>
            </CommandItem>
            <CommandItem>
              <Smile className="mr-2 h-4 w-4" />
              <span>Rechercher un emoji</span>
            </CommandItem>
            <CommandItem>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Calculatrice</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Paramètres">
            <CommandItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Facturation</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Paramètres</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </section>
  );
}
