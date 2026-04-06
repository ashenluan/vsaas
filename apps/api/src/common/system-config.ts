export const MIXCUT_GLOBAL_SPEECH_ENABLED_KEY = 'mixcut.globalSpeechEnabled';

export type SystemCapabilities = {
  mixcutGlobalSpeechEnabled: boolean;
};

export const DEFAULT_SYSTEM_CAPABILITIES: SystemCapabilities = {
  mixcutGlobalSpeechEnabled: false,
};

export function readBooleanSystemConfigValue(
  value: unknown,
  fallback = false,
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const maybeEnabled = (value as { enabled?: unknown }).enabled;
    if (typeof maybeEnabled === 'boolean') {
      return maybeEnabled;
    }

    const maybeValue = (value as { value?: unknown }).value;
    if (typeof maybeValue === 'boolean') {
      return maybeValue;
    }
  }

  return fallback;
}
