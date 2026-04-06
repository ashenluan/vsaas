import { describe, expect, it } from 'vitest';
import {
  canSwitchToGlobalSpeech,
  isMixcutGlobalSpeechEnabled,
  shouldForceGroupSpeechMode,
} from './mixcut-capabilities';

describe('mixcut capabilities helpers', () => {
  it('treats mixcut global speech as disabled when options are missing', () => {
    expect(isMixcutGlobalSpeechEnabled(undefined)).toBe(false);
    expect(isMixcutGlobalSpeechEnabled(null)).toBe(false);
  });

  it('reads the mixcut global speech capability from options', () => {
    expect(
      isMixcutGlobalSpeechEnabled({
        capabilities: {
          mixcutGlobalSpeechEnabled: true,
        },
      }),
    ).toBe(true);
  });

  it('forces empty global projects back to group mode when the capability is disabled', () => {
    expect(
      shouldForceGroupSpeechMode(
        {
          capabilities: {
            mixcutGlobalSpeechEnabled: false,
          },
        },
        'global',
        [],
      ),
    ).toBe(true);
  });

  it('keeps existing global projects in place when they already contain global speech texts', () => {
    expect(
      shouldForceGroupSpeechMode(
        {
          capabilities: {
            mixcutGlobalSpeechEnabled: false,
          },
        },
        'global',
        ['这是历史全局口播文案'],
      ),
    ).toBe(false);
  });

  it('prevents switching into global speech when the capability is disabled', () => {
    expect(
      canSwitchToGlobalSpeech(
        {
          capabilities: {
            mixcutGlobalSpeechEnabled: false,
          },
        },
        'group',
      ),
    ).toBe(false);
    expect(
      canSwitchToGlobalSpeech(
        {
          capabilities: {
            mixcutGlobalSpeechEnabled: false,
          },
        },
        'global',
      ),
    ).toBe(true);
  });
});
