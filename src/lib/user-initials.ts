export interface InitialsConfig {
  source: 'first_last' | 'first_only' | 'last_only';
  chars_per_part: number;
  case_style: 'upper' | 'lower' | 'capitalize';
  separator: string;
  include_compound: boolean;
}

export const DEFAULT_INITIALS_CONFIG: InitialsConfig = {
  source: 'first_last',
  chars_per_part: 1,
  case_style: 'upper',
  separator: '',
  include_compound: true,
};

export function computeInitials(fullName: string, config: Partial<InitialsConfig> = {}): string {
  const cfg: InitialsConfig = { ...DEFAULT_INITIALS_CONFIG, ...config };

  if (!fullName || !fullName.trim()) return '';

  const trimmed = fullName.trim();

  // Split into parts: always split on spaces
  // If include_compound, also split on hyphens to get each part of compound names
  let allParts: string[];
  if (cfg.include_compound) {
    allParts = trimmed.split(/[\s]+/).flatMap(part => part.split(/-/)).filter(Boolean);
  } else {
    allParts = trimmed.split(/[\s]+/).filter(Boolean);
  }

  if (allParts.length === 0) return '';

  // Determine which parts to use based on source
  let selectedParts: string[];
  if (cfg.source === 'first_only') {
    // Take just the first word (or compound parts if include_compound)
    if (cfg.include_compound) {
      const firstWord = trimmed.split(/[\s]+/)[0] || '';
      selectedParts = firstWord.split(/-/).filter(Boolean);
    } else {
      selectedParts = [trimmed.split(/[\s]+/)[0] || ''];
    }
  } else if (cfg.source === 'last_only') {
    const words = trimmed.split(/[\s]+/).filter(Boolean);
    const lastWord = words[words.length - 1] || '';
    if (cfg.include_compound) {
      selectedParts = lastWord.split(/-/).filter(Boolean);
    } else {
      selectedParts = [lastWord];
    }
  } else {
    // first_last: use all parts
    selectedParts = allParts;
  }

  // Take N chars from each part
  const fragments = selectedParts.map(part => part.substring(0, cfg.chars_per_part));

  // Apply case
  const cased = fragments.map(f => {
    switch (cfg.case_style) {
      case 'upper': return f.toUpperCase();
      case 'lower': return f.toLowerCase();
      case 'capitalize': return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
      default: return f;
    }
  });

  return cased.join(cfg.separator);
}
