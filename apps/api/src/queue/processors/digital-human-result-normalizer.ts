import { StorageService } from '../../storage/storage.service';

type NormalizationUsage = {
  videoDuration?: number;
  videoRatio?: string;
  size?: string;
  fps?: number;
};

export type NormalizeDigitalHumanVideoResultInput = {
  engine: 'wan-photo' | 'wan-motion' | 'videoretalk';
  providerTempUrl: string;
  providerTaskId: string;
  externalJobType: 'wan-s2v' | 'wan-animate' | 'videoretalk';
  resolvedModel?: string;
  providerRequestId?: string;
  audioUrl?: string;
  usage?: NormalizationUsage;
  warnings?: string[];
  fallbackSuggested?: string;
};

function inferFileExtension(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split('/').pop() || '';
    const extension = lastSegment.includes('.') ? lastSegment.split('.').pop()!.toLowerCase() : 'mp4';
    return extension || 'mp4';
  } catch {
    return 'mp4';
  }
}

export async function normalizeDigitalHumanVideoResult(
  storage: StorageService,
  input: NormalizeDigitalHumanVideoResultInput,
) {
  const durableVideoUrl = await storage.copyExternalToOss(
    input.providerTempUrl,
    `digital-human/results/${input.engine}`,
    inferFileExtension(input.providerTempUrl),
  );
  const signedVideoUrl = storage.ensureSignedUrl(durableVideoUrl);

  return {
    videoUrl: signedVideoUrl,
    output: {
      engine: input.engine,
      resolvedModel: input.resolvedModel,
      videoUrl: signedVideoUrl,
      durableVideoUrl,
      providerTempUrl: input.providerTempUrl,
      externalJobType: input.externalJobType,
      taskId: input.providerTaskId,
      providerTaskId: input.providerTaskId,
      ...(input.providerRequestId ? { providerRequestId: input.providerRequestId } : {}),
      ...(input.audioUrl ? { audioUrl: input.audioUrl } : {}),
      ...(input.usage?.videoDuration !== undefined ? { duration: input.usage.videoDuration } : {}),
      ...(input.usage?.videoRatio ? { aspectRatio: input.usage.videoRatio } : {}),
      ...(input.usage?.size ? { size: input.usage.size } : {}),
      ...(input.usage?.fps !== undefined ? { fps: input.usage.fps } : {}),
      ...(input.warnings?.length ? { warnings: input.warnings } : {}),
      ...(input.fallbackSuggested ? { fallbackSuggested: input.fallbackSuggested } : {}),
    },
  };
}
