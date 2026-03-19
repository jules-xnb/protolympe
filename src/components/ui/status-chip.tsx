import { Chip } from '@/components/ui/chip';

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';

const STATUS_MAP: Record<string, { label: string; variant: ChipVariant }> = {
  actif:           { label: 'Actif',           variant: 'success'  },
  inactif:         { label: 'Inactif',          variant: 'error'    },
  pret_a_activer:  { label: 'Prêt à activer',   variant: 'warning'  },
  a_configurer:    { label: 'Inactif',            variant: 'default'  },
  sans_profil:     { label: 'Sans profil',      variant: 'default'  },
  archive:         { label: 'Archivé',          variant: 'default'  },
  entite_inactive: { label: 'Entité inactive',  variant: 'default'  },
};

interface StatusChipProps {
  status: keyof typeof STATUS_MAP;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const config = STATUS_MAP[status];
  if (!config) return null;
  return (
    <Chip variant={config.variant} className={className}>
      {config.label}
    </Chip>
  );
}
