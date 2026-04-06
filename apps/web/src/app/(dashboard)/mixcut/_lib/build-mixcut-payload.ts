import type { MixcutProject, SubtitleStyle, TitleStyle, GlobalConfig, ForbiddenWord } from '../_store/use-mixcut-store';
import { getMixcutSpeechMode } from './mixcut-compatibility';
import { parseMixcutPoolText } from './mixcut-random-pools';

export function buildMixcutPayload({
  project,
  subtitleStyle,
  titleStyle,
  globalConfig,
  highlightWords,
  forbiddenWords,
  estimatedCount,
  previewOnly,
}: {
  project: MixcutProject;
  subtitleStyle: SubtitleStyle;
  titleStyle: TitleStyle;
  globalConfig: GlobalConfig;
  highlightWords: { word: string; fontColor: string; bold: boolean }[];
  forbiddenWords: ForbiddenWord[];
  estimatedCount: number;
  previewOnly: boolean;
}) {
  const enabledGroups = project.shotGroups.filter((g) => g.enabled !== false);
  const speechMode = getMixcutSpeechMode(project);
  const globalSpeechTexts = (project.speechTexts || []).map((text) => text.trim()).filter(Boolean);
  const bgMusicList = parseMixcutPoolText(globalConfig.bgMusic);
  const bgImageList = parseMixcutPoolText(globalConfig.bgImage);
  const titleList = parseMixcutPoolText(titleStyle.text);
  const subtitleAdaptMode = globalConfig.speechLanguage === 'en' && subtitleStyle.adaptMode === 'AutoWrap'
    ? 'AutoWrapAtSpaces'
    : subtitleStyle.adaptMode;

  return {
    name: project.name,
    shotGroups: enabledGroups.map((g) => {
      const speechTexts = speechMode === 'group'
        ? g.subtitles.map((s) => s.text.trim()).filter(Boolean)
        : [];

      return {
        name: g.name,
        materialUrls: g.materials.map((m) => m.url),
        materials: g.materials.map((m) => ({
          url: m.url,
          ...(m.trimIn !== undefined && { trimIn: m.trimIn }),
          ...(m.trimOut !== undefined && { trimOut: m.trimOut }),
        })),
        ...(speechMode === 'group' && speechTexts.length > 0 && {
          speechTexts,
        }),
        ...(g.subHeadings?.length > 0 && { subHeadings: g.subHeadings }),
        keepOriginalAudio: g.keepOriginalAudio,
        ...(!g.keepOriginalAudio ? { volume: 0 } : g.volume !== 1 ? { volume: g.volume } : {}),
        ...(g.smartTrim && { splitMode: 'AverageSplit' as const }),
      };
    }),
    ...(speechMode === 'group' && { speechMode: 'group' as const }),
    ...(speechMode === 'global' && globalSpeechTexts.length > 0 && {
      speechMode: 'global' as const,
      speechTexts: globalSpeechTexts,
    }),
    videoCount: estimatedCount,
    resolution: globalConfig.resolution,
    // Voice
    ...((globalConfig as any).voiceId && { voiceId: (globalConfig as any).voiceId }),
    ...((globalConfig as any).voiceType && { voiceType: (globalConfig as any).voiceType }),
    // Background music
    ...(bgMusicList.length === 1 && { bgMusic: bgMusicList[0] }),
    ...(bgMusicList.length > 1 && { bgMusicList }),
    ...(globalConfig.bgMusicVolume !== 0.2 && { bgMusicVolume: globalConfig.bgMusicVolume }),
    // Audio volumes
    ...(globalConfig.mediaVolume !== 1.0 && { mediaVolume: globalConfig.mediaVolume }),
    ...(globalConfig.speechVolume !== 1.0 && { speechVolume: globalConfig.speechVolume }),
    ...(globalConfig.speechRate !== 1.0 && { speechRate: globalConfig.speechRate }),
    ...(globalConfig.speechLanguage && { speechLanguage: globalConfig.speechLanguage }),
    // Subtitle
    subtitleConfig: {
      font: subtitleStyle.font,
      fontSize: subtitleStyle.fontSize,
      fontColor: subtitleStyle.fontColor,
      fontColorOpacity: subtitleStyle.fontColorOpacity,
      alignment: subtitleStyle.alignment,
      y: subtitleStyle.y,
      outline: subtitleStyle.outline,
      outlineColour: subtitleStyle.outlineColour,
      bold: subtitleStyle.bold,
      italic: subtitleStyle.italic,
      underline: subtitleStyle.underline,
      ...(subtitleAdaptMode && { adaptMode: subtitleAdaptMode }),
      ...(subtitleStyle.textWidth && { textWidth: subtitleStyle.textWidth }),
      ...(subtitleStyle.effectColorStyleId && { effectColorStyleId: subtitleStyle.effectColorStyleId }),
      ...(subtitleStyle.bubbleStyleId && { bubbleStyleId: subtitleStyle.bubbleStyleId }),
    },
    // Title
    ...(titleStyle.enabled && {
      titleConfig: {
        enabled: true,
        titles: titleList,
        font: titleStyle.font,
        fontSize: titleStyle.fontSize,
        fontColor: titleStyle.fontColor,
        y: titleStyle.y,
      },
    }),
    // Highlight words
    ...(highlightWords.filter((hw) => hw.word).length > 0 && {
      highlightWords: highlightWords.filter((hw) => hw.word).map((hw) => ({
        word: hw.word,
        fontColor: hw.fontColor,
        bold: hw.bold,
      })),
    }),
    // Forbidden words
    ...(forbiddenWords.filter((fw) => fw.word).length > 0 && {
      forbiddenWords: forbiddenWords.filter((fw) => fw.word).map((fw) => ({
        word: fw.word,
        soundReplaceMode: fw.soundReplaceMode,
      })),
    }),
    // Transition
    ...(globalConfig.transitionEnabled && {
      transitionEnabled: true,
      transitionDuration: globalConfig.transitionDuration,
      transitionList: globalConfig.transitionList,
      useUniformTransition: globalConfig.useUniformTransition,
    }),
    // Filter
    ...(globalConfig.filterEnabled && {
      filterEnabled: true,
      filterList: globalConfig.filterList,
    }),
    // VFX Effects
    ...(() => {
      const groupEffects = enabledGroups.flatMap((g) => g.effectList || []);
      const hasGlobal = globalConfig.vfxEffectEnabled;
      const hasGroup = groupEffects.length > 0;
      if (!hasGlobal && !hasGroup) return {};
      const mergedNotFirst = [...new Set([...globalConfig.vfxNotFirstClipEffectList, ...groupEffects])];
      return {
        vfxEffectEnabled: true,
        vfxEffectProbability: globalConfig.vfxEffectProbability || 50,
        ...(globalConfig.vfxFirstClipEffectList.length > 0 && { vfxFirstClipEffectList: globalConfig.vfxFirstClipEffectList }),
        ...(mergedNotFirst.length > 0 && { vfxNotFirstClipEffectList: mergedNotFirst }),
      };
    })(),
    // Video quality
    ...(globalConfig.maxDuration > 0 && { maxDuration: globalConfig.maxDuration }),
    ...(globalConfig.fixedDuration > 0 && { fixedDuration: globalConfig.fixedDuration }),
    ...(globalConfig.crf > 0 && { crf: globalConfig.crf }),
    // 素材处理
    ...(globalConfig.singleShotDuration > 0 && { singleShotDuration: globalConfig.singleShotDuration }),
    ...(globalConfig.imageDuration > 0 && { imageDuration: globalConfig.imageDuration }),
    ...(globalConfig.alignmentMode && { alignmentMode: globalConfig.alignmentMode }),
    // 快速预览
    ...(previewOnly && {
      videoCount: 1,
      resolution: (() => {
        const parts = globalConfig.resolution.split('x').map(Number);
        if (parts.length === 2) {
          const scale = 0.5;
          return `${Math.round(parts[0] * scale)}x${Math.round(parts[1] * scale)}`;
        }
        return '540x960';
      })(),
    }),
    // Background
    ...(globalConfig.bgType !== 'none' && { bgType: globalConfig.bgType }),
    ...(globalConfig.bgType === 'color' && { bgColor: globalConfig.bgColor }),
    ...(globalConfig.bgType === 'blur' && globalConfig.bgBlurRadius && { bgBlurRadius: globalConfig.bgBlurRadius }),
    ...(globalConfig.bgType === 'image' && bgImageList.length === 1 && { bgImage: bgImageList[0] }),
    ...(globalConfig.bgType === 'image' && bgImageList.length > 1 && { bgImageList }),
    // 封面
    ...(globalConfig.coverType !== 'auto' && { coverType: globalConfig.coverType }),
    ...(globalConfig.coverType === 'custom' && globalConfig.coverUrl && { coverUrl: globalConfig.coverUrl }),
    ...(globalConfig.coverType === 'smart' && {
      coverConfig: {
        coverTitle: globalConfig.coverTitle || undefined,
        coverTitleFont: globalConfig.coverTitleFont,
        coverTitleColor: globalConfig.coverTitleColor,
        coverTitleSize: globalConfig.coverTitleSize,
        coverTitlePosition: globalConfig.coverTitlePosition,
      },
    }),
    // 水印
    ...(globalConfig.watermarkText && {
      watermarkText: globalConfig.watermarkText,
      watermarkPosition: globalConfig.watermarkPosition,
      watermarkOpacity: globalConfig.watermarkOpacity,
    }),
    // 二创去重
    ...(Object.values(globalConfig.dedupConfig).some(Boolean) && {
      dedupConfig: globalConfig.dedupConfig,
    }),
    // Scheduled publishing
    ...(project.scheduledAt && { scheduledAt: project.scheduledAt }),
    // 矩阵发布
    ...(project.publishPlatforms?.length && { publishPlatforms: project.publishPlatforms }),
    // 贴纸
    ...(() => {
      const allStickers = enabledGroups.flatMap((g) => g.stickers || []).filter((s) => s.url?.startsWith('http'));
      if (allStickers.length === 0) return {};
      const [w, h] = globalConfig.resolution.split('x').map(Number);
      const pw = w || 1080;
      const ph = h || 1920;
      return {
        stickers: allStickers.map((s) => ({
          url: s.url,
          x: Math.round(s.x * pw),
          y: Math.round(s.y * ph),
          width: Math.round(s.width * pw),
          height: Math.round(s.height * ph),
          ...(s.opacity !== undefined && { opacity: s.opacity }),
          ...(s.dyncFrames !== undefined && { dyncFrames: s.dyncFrames }),
        })),
      };
    })(),
  };
}
