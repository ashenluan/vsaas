import { describe, expect, it } from 'vitest';
import { resolveGoogleImagenKey, resolveLlmApiKey } from './env-resolver';

describe('env resolver', () => {
  it('falls back from LLM_API_KEY to DASHSCOPE_API_KEY', () => {
    expect(
      resolveLlmApiKey({
        LLM_API_KEY: '',
        DASHSCOPE_API_KEY: 'dashscope-key',
      }),
    ).toBe('dashscope-key');
  });

  it('falls back from GOOGLE_IMAGEN_API_KEY to GOOGLE_API_KEY', () => {
    expect(
      resolveGoogleImagenKey({
        GOOGLE_API_KEY: 'google-key',
      }),
    ).toBe('google-key');
  });

  it('returns undefined when optional feature keys are missing', () => {
    expect(resolveLlmApiKey({})).toBeUndefined();
    expect(resolveGoogleImagenKey({})).toBeUndefined();
  });
});
