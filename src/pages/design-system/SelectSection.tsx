import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SelectSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Select
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Par défaut</h3>
      <div className="flex gap-4 items-start max-w-xs">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pomme">Pomme</SelectItem>
            <SelectItem value="banane">Banane</SelectItem>
            <SelectItem value="cerise">Cerise</SelectItem>
            <SelectItem value="raisin">Raisin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec groupes et labels</h3>
      <div className="flex gap-4 items-start max-w-xs">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Europe</SelectLabel>
              <SelectItem value="fr">France</SelectItem>
              <SelectItem value="de">Allemagne</SelectItem>
              <SelectItem value="es">Espagne</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Amérique</SelectLabel>
              <SelectItem value="us">États-Unis</SelectItem>
              <SelectItem value="ca">Canada</SelectItem>
              <SelectItem value="br">Brésil</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Désactivé</h3>
      <div className="flex gap-4 items-start max-w-xs">
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Non disponible" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec option désactivée</h3>
      <div className="flex gap-4 items-start max-w-xs">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrateur</SelectItem>
            <SelectItem value="editor">Éditeur</SelectItem>
            <SelectItem value="viewer">Lecteur</SelectItem>
            <SelectItem value="owner" disabled>Propriétaire (non disponible)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
