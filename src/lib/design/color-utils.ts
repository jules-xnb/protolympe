/**
 * Color utilities for the client design config system.
 * Used for WCAG luminance calculation, hex ↔ HSL conversion,
 * and font loading.
 */

// ---------------------------------------------------------------------------
// Hex → RGB
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// ---------------------------------------------------------------------------
// WCAG relative luminance (IEC 61966-2-1)
// ---------------------------------------------------------------------------

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

/**
 * Returns '#ffffff' or '#000000' based on WCAG contrast against the given color.
 * L > 0.179 → light background → black text
 * L ≤ 0.179 → dark background → white text
 */
export function getTextOnColor(hex: string): '#ffffff' | '#000000' {
  return getRelativeLuminance(hex) > 0.179 ? '#000000' : '#ffffff';
}

// ---------------------------------------------------------------------------
// Hex → HSL string (format expected by CSS custom properties)
// e.g. "#4E3BD7" → "248 65% 54%"
// ---------------------------------------------------------------------------

export function hexToHslString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '0 0% 0%';

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Validates a hex color string (#RRGGBB).
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

// ---------------------------------------------------------------------------
// Default design values matching the current design system
// ---------------------------------------------------------------------------

export const DEFAULT_DESIGN_CONFIG = {
  primary_color: '#4E3BD7',
  secondary_color: '#E8E9F2',
  text_on_primary: '#ffffff',
  text_on_secondary: '#000000',
  border_radius: 0.5,      // rem
  font_family: 'Raleway',
  font_size_base: '16px',
  font_weight_main: '400',
} as const;

// ---------------------------------------------------------------------------
// Google Fonts — pre-approved list
// ---------------------------------------------------------------------------

export const APPROVED_GOOGLE_FONTS = [
  { label: 'Raleway (défaut)', value: 'Raleway' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Nunito', value: 'Nunito' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans' },
] as const;

export type ApprovedFontFamily = typeof APPROVED_GOOGLE_FONTS[number]['value'];

/**
 * Returns the Google Fonts URL for a given font family.
 * Returns null for the default Raleway (already loaded in index.html).
 */
export function getGoogleFontsUrl(fontFamily: string): string | null {
  if (fontFamily === 'Raleway') return null;
  const encoded = fontFamily.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700&display=swap`;
}

/**
 * Dynamically load a Google Font into the document.
 * Idempotent — won't load the same font twice.
 */
export function loadGoogleFont(fontFamily: string): void {
  if (fontFamily === 'Raleway') return; // already loaded in index.html
  const url = getGoogleFontsUrl(fontFamily);
  if (!url) return;
  const id = `gfont-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

// ---------------------------------------------------------------------------
// Border radius presets
// ---------------------------------------------------------------------------

export const BORDER_RADIUS_PRESETS = [
  { label: 'Sharp', value: 0, px: '0px' },
  { label: 'Slight', value: 0.25, px: '4px' },
  { label: 'Medium', value: 0.5, px: '8px' },
  { label: 'Rounded', value: 1, px: '16px' },
  { label: 'Pill', value: 9999, px: '9999px' },
] as const;
