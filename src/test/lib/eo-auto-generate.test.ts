import { describe, it, expect } from 'vitest';
import { getAutoGenerateConfig } from '@/lib/eo/eo-auto-generate';

describe('getAutoGenerateConfig', () => {
  it('returns null when settings is null', () => {
    expect(getAutoGenerateConfig(null)).toBeNull();
  });

  it('returns null when settings is undefined', () => {
    expect(getAutoGenerateConfig(undefined)).toBeNull();
  });

  it('returns null when auto_generate is missing entirely', () => {
    expect(getAutoGenerateConfig({})).toBeNull();
    expect(getAutoGenerateConfig({ other_key: 'value' })).toBeNull();
  });

  it('returns null when auto_generate.enabled is false', () => {
    const settings = {
      auto_generate: {
        enabled: false,
        mode: 'counter',
        config: { padding: 4 },
      },
    };
    expect(getAutoGenerateConfig(settings)).toBeNull();
  });

  it('returns the config when enabled is true', () => {
    const settings = {
      auto_generate: {
        enabled: true,
        mode: 'prefix_counter',
        config: { prefix: 'EMP-', padding: 5 },
      },
    };
    const result = getAutoGenerateConfig(settings);
    expect(result).not.toBeNull();
    expect(result!.enabled).toBe(true);
    expect(result!.mode).toBe('prefix_counter');
    expect(result!.config.prefix).toBe('EMP-');
  });
});
