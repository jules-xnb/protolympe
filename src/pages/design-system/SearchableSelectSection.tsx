import { useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Building2, User, Shield } from "lucide-react";

export default function SearchableSelectSection() {
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");
  const [value3, setValue3] = useState("");

  const simpleOptions = [
    { value: "fr", label: "France" },
    { value: "de", label: "Allemagne" },
    { value: "es", label: "Espagne" },
    { value: "it", label: "Italie" },
    { value: "pt", label: "Portugal" },
    { value: "gb", label: "Royaume-Uni" },
  ];

  const optionsWithIcons = [
    { value: "admin", label: "Administrateur", icon: Shield },
    { value: "user", label: "Utilisateur", icon: User },
    { value: "org", label: "Organisation", icon: Building2 },
  ];

  const groupedOptions = [
    {
      label: "Europe",
      options: [
        { value: "fr", label: "France", secondaryLabel: "FR" },
        { value: "de", label: "Allemagne", secondaryLabel: "DE" },
        { value: "es", label: "Espagne", secondaryLabel: "ES" },
      ],
    },
    {
      label: "Amérique",
      options: [
        { value: "us", label: "États-Unis", secondaryLabel: "US" },
        { value: "ca", label: "Canada", secondaryLabel: "CA" },
      ],
    },
  ];

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Searchable Select
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Simple</h3>
      <div className="max-w-xs">
        <SearchableSelect
          value={value1}
          onValueChange={setValue1}
          options={simpleOptions}
          placeholder="Sélectionner un pays"
          searchPlaceholder="Rechercher un pays..."
        />
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec icônes</h3>
      <div className="max-w-xs">
        <SearchableSelect
          value={value2}
          onValueChange={setValue2}
          options={optionsWithIcons}
          placeholder="Sélectionner un rôle"
          searchPlaceholder="Rechercher..."
        />
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec groupes et labels secondaires</h3>
      <div className="max-w-xs">
        <SearchableSelect
          value={value3}
          onValueChange={setValue3}
          groups={groupedOptions}
          placeholder="Sélectionner un pays"
          searchPlaceholder="Rechercher..."
          emptyMessage="Aucun pays trouvé."
        />
      </div>
    </section>
  );
}
