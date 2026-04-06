export type DigitalHumanEngineId = 'ims' | 'wan-photo' | 'wan-motion' | 'videoretalk';
export type DigitalHumanDriveModeId = 'text' | 'audio' | 'video';
export type DigitalHumanPreset = 'speed' | 'balanced' | 'quality';

export type DigitalHumanResolvedConstraints = {
  requestedResolution: string;
  outputResolution: string;
  outputResolutionMode: 'requested' | 'source' | 'profile';
  providerResolution?: string;
  sourceVideoRequired?: boolean;
};

type DigitalHumanCapability = {
  provider: 'aliyun-ims' | 'aliyun-wan' | 'aliyun-videoretalk';
  resolvedModel: string;
  defaultPreset: DigitalHumanPreset;
  supportedDriveModes: DigitalHumanDriveModeId[];
  allowedResolutions: string[];
};

export const DIGITAL_HUMAN_CAPABILITIES: Record<DigitalHumanEngineId, DigitalHumanCapability> = {
  ims: {
    provider: 'aliyun-ims',
    resolvedModel: 'ims-avatar',
    defaultPreset: 'balanced',
    supportedDriveModes: ['text', 'audio'],
    allowedResolutions: ['1080x1920', '1920x1080', '1080x1080', '2160x3840', '3840x2160'],
  },
  'wan-photo': {
    provider: 'aliyun-wan',
    resolvedModel: 'wan2.2-s2v',
    defaultPreset: 'balanced',
    supportedDriveModes: ['text', 'audio'],
    allowedResolutions: ['1080x1920', '1920x1080', '1080x1080'],
  },
  'wan-motion': {
    provider: 'aliyun-wan',
    resolvedModel: 'wan2.2-animate-move',
    defaultPreset: 'balanced',
    supportedDriveModes: ['video'],
    allowedResolutions: ['1080x1920', '1920x1080', '1080x1080'],
  },
  videoretalk: {
    provider: 'aliyun-videoretalk',
    resolvedModel: 'videoretalk',
    defaultPreset: 'balanced',
    supportedDriveModes: ['audio'],
    allowedResolutions: ['source'],
  },
};

export const VIDEORETALK_ONLY_FIELDS = ['refImageUrl', 'videoExtension', 'queryFaceThreshold'] as const;

export function getDigitalHumanCapability(engine: DigitalHumanEngineId) {
  return DIGITAL_HUMAN_CAPABILITIES[engine];
}

export function buildDigitalHumanResolvedConstraints(
  engine: DigitalHumanEngineId,
  resolution: string,
): DigitalHumanResolvedConstraints {
  if (engine === 'videoretalk') {
    return {
      requestedResolution: resolution,
      outputResolution: 'source',
      outputResolutionMode: 'source',
      sourceVideoRequired: true,
    };
  }

  if (engine === 'wan-photo') {
    return {
      requestedResolution: resolution,
      outputResolution: '720P',
      outputResolutionMode: 'profile',
      providerResolution: '720P',
    };
  }

  if (engine === 'wan-motion') {
    return {
      requestedResolution: resolution,
      outputResolution: resolution,
      outputResolutionMode: 'requested',
    };
  }

  return {
    requestedResolution: resolution,
    outputResolution: resolution,
    outputResolutionMode: 'requested',
  };
}
