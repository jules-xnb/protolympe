import {
  BarChart3,
  Table,
  CreditCard,
  Link2,
  Clock,
  Calendar,
  Puzzle,
} from 'lucide-react';

export type WidgetTypeKey = 'stats_card' | 'chart' | 'table' | 'quick_links' | 'recent_items' | 'calendar' | 'custom';

export interface WidgetDefinition {
  type: WidgetTypeKey;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultWidth: number;
  defaultHeight: number;
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: 'stats_card',
    label: 'Carte statistique',
    description: 'Affiche un compteur ou métrique',
    icon: CreditCard,
    defaultWidth: 1,
    defaultHeight: 1,
  },
  {
    type: 'chart',
    label: 'Graphique',
    description: 'Graphique (bar, line, pie)',
    icon: BarChart3,
    defaultWidth: 2,
    defaultHeight: 2,
  },
  {
    type: 'table',
    label: 'Tableau',
    description: 'Mini-tableau de données',
    icon: Table,
    defaultWidth: 2,
    defaultHeight: 2,
  },
  {
    type: 'quick_links',
    label: 'Liens rapides',
    description: 'Raccourcis vers des vues',
    icon: Link2,
    defaultWidth: 1,
    defaultHeight: 1,
  },
  {
    type: 'recent_items',
    label: 'Éléments récents',
    description: 'Dernières modifications',
    icon: Clock,
    defaultWidth: 2,
    defaultHeight: 2,
  },
  {
    type: 'calendar',
    label: 'Calendrier',
    description: 'Vue calendrier par date',
    icon: Calendar,
    defaultWidth: 2,
    defaultHeight: 2,
  },
  {
    type: 'custom',
    label: 'Widget personnalisé',
    description: 'Contenu libre',
    icon: Puzzle,
    defaultWidth: 1,
    defaultHeight: 1,
  },
];
