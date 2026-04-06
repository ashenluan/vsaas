import { describe, expect, it } from 'vitest';
import type { GlobalConfig, MixcutProject } from '../_store/use-mixcut-store';
import { createShotGroup } from '../_store/use-mixcut-store';
import { buildMixcutPayload } from './build-mixcut-payload';
import { getMixcutCompatibilityErrors, getMixcutSpeechMode } from './mixcut-compatibility';

type ExtendedMixcutProject = MixcutProject & {
  speechMode?: 'global' | 'group';
  speechTexts?: string[];
};

function createProject(overrides?: Partial<ExtendedMixcutProject>): ExtendedMixcutProject {
  const firstGroup = createShotGroup('视频组_1');

  return {
    name: '测试项目',
    shotGroups: [firstGroup],
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

function createGlobalConfig(overrides?: Partial<GlobalConfig>): GlobalConfig {
  return {
    bgMusic: '',
    bgMusicVolume: 0.2,
    mediaVolume: 1,
    speechVolume: 1,
    speechRate: 1,
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
    voiceId: undefined,
    voiceType: undefined,
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

describe('getMixcutSpeechMode', () => {
  it('prefers explicit global speech mode even when shot groups contain subtitles', () => {
    const group = createShotGroup('视频组_1');
    group.subtitles = [{ text: '这是预留的分组文案' }];

    const project = createProject({
      shotGroups: [group],
      speechMode: 'global',
      speechTexts: ['显式全局口播'],
    });

    expect(getMixcutSpeechMode(project as MixcutProject)).toBe('global');
  });

  it('returns group when any enabled shot group contains non-empty subtitles', () => {
    const group = createShotGroup('视频组_1');
    group.subtitles = [{ text: '这是分组口播文案' }];

    const project = createProject({ shotGroups: [group], speechMode: undefined });

    expect(getMixcutSpeechMode(project)).toBe('group');
  });

  it('returns global when all enabled shot groups have empty subtitles', () => {
    const group = createShotGroup('视频组_1');
    group.subtitles = [{ text: '   ' }];

    const project = createProject({ shotGroups: [group] });

    expect(getMixcutSpeechMode(project)).toBe('global');
  });
});

describe('getMixcutCompatibilityErrors', () => {
  it('rejects max duration, fixed duration and alignment mode in group speech mode', () => {
    const group = createShotGroup('视频组_1');
    group.subtitles = [{ text: '第一段' }];
    const project = createProject({ shotGroups: [group], speechMode: undefined });

    const errors = getMixcutCompatibilityErrors({
      project,
      globalConfig: createGlobalConfig({
        maxDuration: 30,
        fixedDuration: 20,
        alignmentMode: 'AutoSpeed',
      }),
    });

    expect(errors).toContain('当前项目已进入分组口播模式，不能设置最大时长。');
    expect(errors).toContain('当前项目已进入分组口播模式，不能设置固定时长。');
    expect(errors).toContain('当前项目已进入分组口播模式，不能设置对齐模式。');
  });

  it('rejects maxDuration and fixedDuration being set together', () => {
    const project = createProject();

    const errors = getMixcutCompatibilityErrors({
      project,
      globalConfig: createGlobalConfig({
        maxDuration: 30,
        fixedDuration: 20,
      }),
    });

    expect(errors).toContain('最大时长与固定时长不能同时设置。');
  });

  it('returns no errors for a valid global speech configuration', () => {
    const project = createProject();

    const errors = getMixcutCompatibilityErrors({
      project,
      globalConfig: createGlobalConfig({
        maxDuration: 30,
        fixedDuration: 0,
        alignmentMode: 'AutoSpeed',
      }),
    });

    expect(errors).toEqual([]);
  });

  it('rejects incomplete or inverted trim ranges before submit', () => {
    const group = createShotGroup('视频组_1');
    group.materials = [
      {
        id: 'material-1',
        name: '素材1',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        duration: 12,
        trimIn: 5,
      },
      {
        id: 'material-2',
        name: '素材2',
        type: 'VIDEO',
        url: 'https://example.com/video-2.mp4',
        duration: 10,
        trimIn: 7,
        trimOut: 3,
      },
    ] as any;

    const errors = getMixcutCompatibilityErrors({
      project: createProject({ shotGroups: [group] }),
      globalConfig: createGlobalConfig(),
    });

    expect(errors).toContain('存在未完成的素材裁剪区间，请同时填写开始和结束时间。');
    expect(errors).toContain('存在结束时间小于开始时间的素材裁剪区间，请修正后再提交。');
  });
});

describe('buildMixcutPayload', () => {
  it('does not treat blank subtitles as group speech mode input', () => {
    const group = createShotGroup('视频组_1');
    group.materials = [
      {
        id: 'material-1',
        name: '素材1',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        duration: 8,
      },
    ];
    group.subtitles = [{ text: '   ' }];

    const payload = buildMixcutPayload({
      project: createProject({ shotGroups: [group] }),
      subtitleStyle: createProject().subtitleStyle,
      titleStyle: createProject().titleStyle,
      globalConfig: createGlobalConfig(),
      highlightWords: [],
      forbiddenWords: [],
      estimatedCount: 1,
      previewOnly: false,
    });

    expect(payload.speechMode).toBeUndefined();
    expect(payload.shotGroups[0]?.speechTexts).toBeUndefined();
  });

  it('uses explicit global speech texts and omits group speech texts when global mode is selected', () => {
    const group = createShotGroup('视频组_1');
    group.materials = [
      {
        id: 'material-1',
        name: '素材1',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        duration: 8,
      },
    ];
    group.subtitles = [{ text: '分组文案不应进入全局 payload' }];

    const project = createProject({
      shotGroups: [group],
      speechMode: 'global',
      speechTexts: ['全局文案一', '全局文案二'],
    });

    const payload = buildMixcutPayload({
      project: project as MixcutProject,
      subtitleStyle: project.subtitleStyle,
      titleStyle: project.titleStyle,
      globalConfig: createGlobalConfig(),
      highlightWords: [],
      forbiddenWords: [],
      estimatedCount: 1,
      previewOnly: false,
    });

    expect(payload.speechMode).toBe('global');
    expect(payload.speechTexts).toEqual(['全局文案一', '全局文案二']);
    expect(payload.shotGroups[0]?.speechTexts).toBeUndefined();
  });

  it('converts multiline title, background music and background image inputs into IMS pools', () => {
    const group = createShotGroup('视频组_1');
    group.materials = [
      {
        id: 'material-1',
        name: '素材1',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        duration: 8,
      },
    ];

    const project = createProject({ shotGroups: [group] });

    const payload = buildMixcutPayload({
      project,
      subtitleStyle: project.subtitleStyle,
      titleStyle: {
        ...project.titleStyle,
        enabled: true,
        text: '标题一\n  \n标题二  ',
      },
      globalConfig: createGlobalConfig({
        bgMusic: 'https://example.com/a.mp3\nhttps://example.com/b.mp3',
        bgType: 'image',
        bgImage: 'https://example.com/a.png\nhttps://example.com/b.png',
      }),
      highlightWords: [],
      forbiddenWords: [],
      estimatedCount: 1,
      previewOnly: false,
    });

    expect(payload.titleConfig?.titles).toEqual(['标题一', '标题二']);
    expect(payload.bgMusicList).toEqual(['https://example.com/a.mp3', 'https://example.com/b.mp3']);
    expect(payload.bgImageList).toEqual(['https://example.com/a.png', 'https://example.com/b.png']);
  });

  it('includes per-material trim ranges in the mixcut payload', () => {
    const group = createShotGroup('视频组_1');
    group.materials = [
      {
        id: 'material-1',
        name: '素材1',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        duration: 12,
        trimIn: 1.25,
        trimOut: 6.75,
      },
    ] as any;

    const project = createProject({ shotGroups: [group] });

    const payload = buildMixcutPayload({
      project,
      subtitleStyle: project.subtitleStyle,
      titleStyle: project.titleStyle,
      globalConfig: createGlobalConfig(),
      highlightWords: [],
      forbiddenWords: [],
      estimatedCount: 1,
      previewOnly: false,
    });

    expect(payload.shotGroups[0]?.materialUrls).toEqual(['https://example.com/video.mp4']);
    expect(payload.shotGroups[0]?.materials).toEqual([
      expect.objectContaining({
        url: 'https://example.com/video.mp4',
        trimIn: 1.25,
        trimOut: 6.75,
      }),
    ]);
  });

  it('includes speechLanguage in the mixcut payload when configured', () => {
    const group = createShotGroup('视频组_1');
    group.materials = [
      {
        id: 'material-1',
        name: '素材1',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        duration: 8,
      },
    ];

    const project = createProject({ shotGroups: [group] });

    const payload = buildMixcutPayload({
      project,
      subtitleStyle: project.subtitleStyle,
      titleStyle: project.titleStyle,
      globalConfig: createGlobalConfig({
        speechLanguage: 'en',
      } as any),
      highlightWords: [],
      forbiddenWords: [],
      estimatedCount: 1,
      previewOnly: false,
    });

    expect(payload.speechLanguage).toBe('en');
  });
});
