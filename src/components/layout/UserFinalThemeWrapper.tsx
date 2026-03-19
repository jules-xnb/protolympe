import { useEffect, type CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useClientDesignConfig, getEffectiveDesignConfig } from '@/hooks/useClientDesignConfig';
import { hexToHslString, loadGoogleFont } from '@/lib/design/color-utils';
import { TranslationProvider } from '@/contexts/TranslationContext';

/**
 * Wraps all user-final routes.
 * Fetches the client design config and injects CSS custom properties
 * as inline styles on a wrapper div, scoping the theme exclusively
 * to the user-final content area without polluting admin/integrator UIs.
 */
export function UserFinalThemeWrapper() {
  const { selectedClient } = useViewMode();
  const { data: config } = useClientDesignConfig(selectedClient?.id);
  const effective = getEffectiveDesignConfig(config);

  // Dynamically load Google Font if needed
  useEffect(() => {
    loadGoogleFont(effective.font_family);
  }, [effective.font_family]);

  const cssVars: CSSProperties = buildCssVars(effective);

  return (
    <TranslationProvider>
      <div data-space="user-final" style={cssVars} className="h-full">
        <Outlet />
      </div>
    </TranslationProvider>
  );
}

/**
 * Convert effective design config to CSS custom properties (inline style object).
 * Overrides the global Tailwind CSS variable tokens for primary/secondary/radius/font.
 */
export function buildCssVars(config: {
  primary_color: string;
  secondary_color: string;
  text_on_primary: string;
  text_on_secondary: string;
  border_radius: number;
  font_family: string;
}): CSSProperties {
  const primaryHsl = hexToHslString(config.primary_color);
  const secondaryHsl = hexToHslString(config.secondary_color);
  const textOnPrimaryHsl = hexToHslString(config.text_on_primary);
  const textOnSecondaryHsl = hexToHslString(config.text_on_secondary);

  // border_radius > 100 is the "pill" preset — use px directly, else treat as rem
  const radiusValue = config.border_radius >= 9999
    ? '9999px'
    : `${config.border_radius}rem`;

  return {
    '--primary': primaryHsl,
    '--primary-foreground': textOnPrimaryHsl,
    '--primary-highlight': primaryHsl,
    '--primary-deep': primaryHsl,
    '--ring': primaryHsl,
    '--secondary': secondaryHsl,
    '--secondary-foreground': textOnSecondaryHsl,
    '--radius': radiusValue,
    fontFamily: `'${config.font_family}', system-ui, sans-serif`,
  } as CSSProperties;
}
