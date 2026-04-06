import { createShotGroup, type MixcutPreviewProject, type MixcutProject, type MixcutSpeechMode, type OutputVideo, type ShotGroup } from '../_store/use-mixcut-store';
import { stringifyMixcutPool } from './mixcut-random-pools';

function normalizeSpeechTexts(speechTexts?: unknown) {
  if (!Array.isArray(speechTexts)) {
    return [];
  }

  return speechTexts
    .filter((text): text is string => typeof text === 'string')
    .map((text) => text.trim())
    .filter(Boolean);
}

function normalizeSpeechMode(projectData: any): MixcutSpeechMode {
  if (projectData?.speechMode === 'global' || projectData?.speechMode === 'group') {
    return projectData.speechMode;
  }

  if (normalizeSpeechTexts(projectData?.speechTexts).length > 0) {
    return 'global';
  }

  const hasGroupSpeech = (projectData?.shotGroups || []).some((group: any) =>
    (group?.subtitles || []).some((subtitle: any) => typeof subtitle?.text === 'string' && subtitle.text.trim().length > 0)
    || normalizeSpeechTexts(group?.speechTexts).length > 0,
  );

  return hasGroupSpeech ? 'group' : 'global';
}

function mapShotGroupMaterial(url: string, groupIndex: number, materialIndex: number): ShotGroup['materials'][number] {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);

  return {
    id: `m_${groupIndex}_${materialIndex}`,
    name: `素材_${materialIndex + 1}`,
    type: isImage ? 'IMAGE' : 'VIDEO',
    url,
  };
}

function mapShotGroup(group: any, index: number): ShotGroup {
  const baseGroup = createShotGroup(group?.name || `视频组_${index + 1}`);
  const speechTexts = normalizeSpeechTexts(group?.speechTexts);

  return {
    ...baseGroup,
    ...group,
    id: group?.id || baseGroup.id,
    name: group?.name || baseGroup.name,
    materials: Array.isArray(group?.materials)
      ? group.materials.map((material: any) => ({ ...material }))
      : (group?.materialUrls || []).map((url: string, materialIndex: number) =>
          mapShotGroupMaterial(url, index, materialIndex)),
    subtitles: Array.isArray(group?.subtitles)
      ? group.subtitles.map((subtitle: any) => ({ ...subtitle }))
      : speechTexts.map((text) => ({ text })),
    subHeadings: Array.isArray(group?.subHeadings) ? group.subHeadings : [],
  };
}

function getProjectData(input: any) {
  if (input?.projectData && typeof input.projectData === 'object') {
    return input.projectData;
  }

  return input || {};
}

export function hydrateMixcutProjectFromJob(
  job: {
    id: string;
    status?: string;
    input?: any;
    output?: { outputVideos?: OutputVideo[]; previewProject?: MixcutPreviewProject | null };
  },
  fallbackProject: MixcutProject,
) {
  const input = job.input || {};
  const projectData = getProjectData(input);
  const shotGroups = (projectData.shotGroups || []).map((group: any, index: number) =>
    mapShotGroup(group, index));

  const project: MixcutProject = {
    ...fallbackProject,
    id: job.id,
    name: input.name || projectData.name || fallbackProject.name,
    shotGroups: shotGroups.length ? shotGroups : [createShotGroup('视频组_1')],
    subtitleStyle: projectData.subtitleStyle || input.subtitleConfig || fallbackProject.subtitleStyle,
    titleStyle: projectData.titleStyle
      || (input.titleConfig
        ? {
            ...fallbackProject.titleStyle,
            ...input.titleConfig,
            text: input.titleConfig.titles?.length
              ? stringifyMixcutPool(input.titleConfig.titles)
              : input.titleConfig.text || fallbackProject.titleStyle.text,
          }
        : fallbackProject.titleStyle),
    globalConfig: projectData.globalConfig
      ? {
          ...fallbackProject.globalConfig,
          ...projectData.globalConfig,
        }
      : {
          ...fallbackProject.globalConfig,
          ...(input.bgType && { bgType: input.bgType }),
          ...(input.bgColor && { bgColor: input.bgColor }),
          ...(input.bgBlurRadius && { bgBlurRadius: input.bgBlurRadius }),
          ...(input.voiceId && { voiceId: input.voiceId }),
          ...(input.voiceType && { voiceType: input.voiceType }),
          ...(input.speechLanguage && { speechLanguage: input.speechLanguage }),
          ...((input.bgImageList?.length || input.bgImage) && {
            bgImage: input.bgImageList?.length ? stringifyMixcutPool(input.bgImageList) : input.bgImage,
          }),
          ...((input.bgMusicList?.length || input.bgMusic) && {
            bgMusic: input.bgMusicList?.length ? stringifyMixcutPool(input.bgMusicList) : input.bgMusic,
          }),
        },
    highlightWords: projectData.highlightWords || input.highlightWords || [],
    forbiddenWords: projectData.forbiddenWords || input.forbiddenWords || [],
    speechMode: normalizeSpeechMode(projectData),
    speechTexts: normalizeSpeechTexts(projectData.speechTexts || input.speechTexts),
    scheduledAt: projectData.scheduledAt || input.scheduledAt,
    publishPlatforms: projectData.publishPlatforms || input.publishPlatforms,
  };

  return {
    project,
    outputVideos: Array.isArray(job.output?.outputVideos) ? job.output.outputVideos : [],
    previewProject: job.output?.previewProject || null,
    jobStatus: input.isDraft ? '' : (job.status || ''),
  };
}
