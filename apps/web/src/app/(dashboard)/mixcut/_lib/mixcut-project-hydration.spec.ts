import { describe, expect, it } from 'vitest';
import { createShotGroup, type GlobalConfig, type MixcutProject } from '../_store/use-mixcut-store';
import { hydrateMixcutProjectFromJob } from './mixcut-project-hydration';

type ExtendedMixcutProject = MixcutProject & {
  speechMode?: 'global' | 'group';
  speechTexts?: string[];
};

function createGlobalConfig(overrides?: Partial<GlobalConfig>): GlobalConfig {
  return {
    bgMusic: '',
    bgMusicVolume: 0.2,
    mediaVolume: 1,
    speechVolume: 1,
    speechRate: 1,
    speechLanguage: 'zh',
    transitionEnabled: false,
    transitionDuration: 0.5,
    transitionList: [],
    useUniformTransition: true,
    filterEnabled: false,
    filterList: [],
    vfxEffectEnabled: false,
    vfxEffectProbability: 50,
    vfxFirstClipEffectList: [],
    vfxNotFirstClipEffectList: [],
    bgType: 'none',
    bgColor: '#000000',
    bgImage: '',
    bgBlurRadius: 0.1,
    aspectRatio: '9:16',
    resolution: '1080x1920',
    coverType: 'auto',
    coverUrl: '',
    coverTitle: '',
    coverTitleFont: 'Alibaba PuHuiTi 2.0 95 ExtraBold',
    coverTitleColor: '#ffffff',
    coverTitleSize: 64,
    coverTitlePosition: 'center',
    watermarkText: '',
    watermarkPosition: 'bottomRight',
    watermarkOpacity: 0.5,
    maxDuration: 0,
    fixedDuration: 0,
    crf: 0,
    singleShotDuration: 0,
    imageDuration: 0,
    alignmentMode: '',
    dedupConfig: {
      smartCrop: false,
      smartZoom: false,
      smartMirror: false,
      transparentMask: false,
      randomSpeed: false,
    },
    ...overrides,
  };
}

function createFallbackProject(overrides?: Partial<ExtendedMixcutProject>): ExtendedMixcutProject {
  return {
    name: '未命名项目',
    shotGroups: [createShotGroup('视频组_1')],
    subtitleStyle: {
      font: 'Alibaba PuHuiTi 2.0 65 Medium',
      fontSize: 40,
      fontColor: '#ffffff',
      fontColorOpacity: 1,
      alignment: 'BottomCenter',
      y: 0.85,
      outline: 2,
      outlineColour: '#000000',
      bold: false,
      italic: false,
      underline: false,
      effectColorStyleId: '',
      bubbleStyleId: '',
      adaptMode: 'AutoWrap',
      textWidth: 0.8,
    },
    titleStyle: {
      enabled: false,
      text: '',
      font: 'Alibaba PuHuiTi 2.0 95 ExtraBold',
      fontSize: 56,
      fontColor: '#ffffff',
      y: 0.08,
    },
    globalConfig: createGlobalConfig(),
    highlightWords: [],
    forbiddenWords: [],
    speechMode: 'global',
    speechTexts: [],
    ...overrides,
  };
}

describe('hydrateMixcutProjectFromJob', () => {
  it('restores explicit global speech data from flat draft input', () => {
    const fallbackProject = createFallbackProject();
    const job = {
      id: 'job-1',
      status: 'PENDING',
      input: {
        isDraft: true,
        name: '全局口播草稿',
        shotGroups: [
          {
            name: '视频组_1',
            materialUrls: ['https://example.com/a.mp4'],
          },
        ],
        speechMode: 'global',
        speechTexts: ['第一条全局文案', '第二条全局文案'],
        globalConfig: createGlobalConfig(),
        subtitleStyle: fallbackProject.subtitleStyle,
        titleStyle: fallbackProject.titleStyle,
        highlightWords: [],
        forbiddenWords: [],
      },
    };

    const hydrated = hydrateMixcutProjectFromJob(job as any, fallbackProject as any);

    expect(hydrated.project.speechMode).toBe('global');
    expect(hydrated.project.speechTexts).toEqual(['第一条全局文案', '第二条全局文案']);
  });

  it('restores explicit global speech data from nested projectData drafts', () => {
    const fallbackProject = createFallbackProject();
    const job = {
      id: 'job-2',
      status: 'PENDING',
      input: {
        isDraft: true,
        name: '嵌套草稿',
        projectData: {
          shotGroups: [
            {
              name: '视频组_1',
              materials: [],
              subtitles: [],
            },
          ],
          subtitleStyle: fallbackProject.subtitleStyle,
          titleStyle: fallbackProject.titleStyle,
          globalConfig: createGlobalConfig(),
          highlightWords: [],
          forbiddenWords: [],
          speechMode: 'global',
          speechTexts: ['嵌套全局文案'],
        },
      },
    };

    const hydrated = hydrateMixcutProjectFromJob(job as any, fallbackProject as any);

    expect(hydrated.project.speechMode).toBe('global');
    expect(hydrated.project.speechTexts).toEqual(['嵌套全局文案']);
  });

  it('restores persisted preview project snapshots from completed jobs', () => {
    const fallbackProject = createFallbackProject();
    const job = {
      id: 'job-3',
      status: 'COMPLETED',
      input: {
        name: '预览工程任务',
        shotGroups: [],
      },
      output: {
        previewProject: {
          projectId: 'preview-project-1',
          title: '预览工程',
          duration: 18.5,
          timeline: {
            VideoTracks: [
              {
                VideoTrackClips: [{ MediaId: 'media-1' }],
              },
            ],
          },
        },
      },
    };

    const hydrated = hydrateMixcutProjectFromJob(job as any, fallbackProject as any);

    expect(hydrated.previewProject).toEqual(
      expect.objectContaining({
        projectId: 'preview-project-1',
        title: '预览工程',
        duration: 18.5,
      }),
    );
  });

  it('restores speech voice metadata from completed job input', () => {
    const fallbackProject = createFallbackProject();
    const job = {
      id: 'job-4',
      status: 'COMPLETED',
      input: {
        name: '英文口播任务',
        shotGroups: [],
        voiceId: 'ava',
        voiceType: 'builtin',
        speechLanguage: 'en',
      },
    };

    const hydrated = hydrateMixcutProjectFromJob(job as any, fallbackProject as any);

    expect(hydrated.project.globalConfig.voiceId).toBe('ava');
    expect(hydrated.project.globalConfig.voiceType).toBe('builtin');
    expect(hydrated.project.globalConfig.speechLanguage).toBe('en');
  });
});
