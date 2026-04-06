type MixcutCapabilityOptions = {
  capabilities?: {
    mixcutGlobalSpeechEnabled?: boolean;
  };
} | null | undefined;

export function isMixcutGlobalSpeechEnabled(
  options: MixcutCapabilityOptions,
): boolean {
  return options?.capabilities?.mixcutGlobalSpeechEnabled ?? false;
}

export function shouldForceGroupSpeechMode(
  options: MixcutCapabilityOptions,
  speechMode: 'global' | 'group' | undefined,
  speechTexts: string[] | undefined,
): boolean {
  return (
    !isMixcutGlobalSpeechEnabled(options) &&
    speechMode === 'global' &&
    (!speechTexts || speechTexts.length === 0)
  );
}

export function canSwitchToGlobalSpeech(
  options: MixcutCapabilityOptions,
  speechMode: 'global' | 'group' | undefined,
): boolean {
  return isMixcutGlobalSpeechEnabled(options) || speechMode === 'global';
}
