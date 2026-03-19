import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MoreVertical, Settings, Pencil, Trash2, Archive } from "lucide-react";

export default function MenuSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Menus & Popover
      </h2>

      <div className="flex items-start gap-6 flex-wrap">
        {/* Dropdown Menu */}
        <div className="space-y-2">
          <h3 className="text-[14px] font-semibold text-foreground">Dropdown Menu</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archiver
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Popover */}
        <div className="space-y-2">
          <h3 className="text-[14px] font-semibold text-foreground">Popover</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Ouvrir Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Informations</h4>
                <p className="text-sm text-muted-foreground">
                  Contenu contextuel affiché dans un popover.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Command */}
        <div className="space-y-2">
          <h3 className="text-[14px] font-semibold text-foreground">Command (Recherche)</h3>
          <Command className="rounded-lg border shadow-md w-[260px]">
            <CommandInput placeholder="Rechercher..." />
            <CommandList>
              <CommandEmpty>Aucun résultat.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>Utilisateurs</CommandItem>
                <CommandItem>Rôles</CommandItem>
                <CommandItem>Modules</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </div>
    </section>
  );
}
