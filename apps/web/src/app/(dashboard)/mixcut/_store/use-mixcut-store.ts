import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ========== Types ========== */

export interface ShotMaterial {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
  duration?: number; // seconds
}

export interface ShotSubtitle {
  text: string;
  voiceId?: string; // TTS voice
}

export interface ShotGroup {
  id: string;
  name: string;
  enabled: boolean; // 是否参与混剪
  materials: ShotMaterial[];
  subtitles: ShotSubtitle[];
  subHeadings: string[]; // 副标题
  keepOriginalAudio: boolean;
  volume: number; // 分组素材音量 0-2, 默认1
  // per-shot config overrides
  effectEnabled: boolean;
  effectList: string[];
  stickerEnabled: boolean;
  stickers: { url: string; x: number; y: number; width: number; height: number }[];
  smartTrim: boolean; // 智能混剪: auto-trim video to match audio duration
}

export interface SubtitleStyle {
  font: string;
  fontSize: number;
  fontColor: string;
  fontColorOpacity: number;
  alignment: string;
  y: number;
  outline: number;
  outlineColour: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  effectColorStyleId: string; // 花字
  bubbleStyleId: string; // 气泡字
}

export interface TitleStyle {
  enabled: boolean;
  text: string;
  font: string;
  fontSize: number;
  fontColor: string;
  y: number;
}

export interface DedupConfig {
  smartCrop: boolean;    // 智能截取: 随机截取不同片段
  smartZoom: boolean;    // 智能缩放: 随机缩放裁剪画面
  smartMirror: boolean;  // 智能镜像: 左右镜像处理
  transparentMask: boolean; // 透明蒙版: 抽取部分区域作蒙版
  randomSpeed: boolean;  // 随机变速: 轻微变速
}

export interface GlobalConfig {
  bgMusic: string;
  bgMusicVolume: number;
  mediaVolume: number;
  speechVolume: number;
  speechRate: number;
  transitionEnabled: boolean;
  transitionDuration: number;
  transitionList: string[];
  useUniformTransition: boolean;
  filterEnabled: boolean;
  filterList: string[];
  // VFX effects
  vfxEffectEnabled: boolean;
  vfxEffectProbability: number; // 0-100
  vfxFirstClipEffectList: string[];
  vfxNotFirstClipEffectList: string[];
  bgType: 'none' | 'color' | 'blur' | 'image';
  bgColor: string;
  bgImage: string; // 自定义背景图 URL
  aspectRatio: string; // '9:16' | '16:9' | '1:1' | '4:3' | '3:4' | custom
  resolution: string; // e.g. '1080x1920'
  coverType: 'auto' | 'custom' | 'smart';
  coverUrl: string;
  coverTitle: string;
  coverTitleFont: string;
  coverTitleColor: string;
  coverTitleSize: number;
  coverTitlePosition: 'top' | 'center' | 'bottom';
  voiceId?: string;
  voiceType?: 'builtin' | 'cloned';
  watermarkText: string;
  watermarkPosition: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  watermarkOpacity: number;
  // Video quality
  maxDuration: number; // 0 = no limit
  fixedDuration: number; // 0 = not used, 与 maxDuration 互斥
  crf: number; // 0 = default
  // 素材处理
  singleShotDuration: number; // 0 = default(3s), 镜头切片时长
  imageDuration: number; // 0 = default(3s), 图片展示时长
  alignmentMode: string; // '' | 'AutoSpeed' | 'Cut', 对齐模式
  // 二创去重
  dedupConfig: DedupConfig;
}

export type MixcutView = 'list' | 'editor';

export interface ForbiddenWord {
  word: string;
  soundReplaceMode: 'mute' | 'beep';
}

export interface MixcutProject {
  id?: string;
  name: string;
  shotGroups: ShotGroup[];
  subtitleStyle: SubtitleStyle;
  titleStyle: TitleStyle;
  globalConfig: GlobalConfig;
  highlightWords: { word: string; fontColor: string; bold: boolean }[];
  forbiddenWords: ForbiddenWord[];
  scheduledAt?: string; // ISO date string for scheduled publishing
  publishPlatforms?: string[]; // 矩阵发布目标平台
  createdAt?: string;
  updatedAt?: string;
}

/* ========== Defaults ========== */

const defaultSubtitleStyle: SubtitleStyle = {
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
};

const defaultTitleStyle: TitleStyle = {
  enabled: false,
  text: '',
  font: 'Alibaba PuHuiTi 2.0 95 ExtraBold',
  fontSize: 56,
  fontColor: '#ffffff',
  y: 0.08,
};

const defaultGlobalConfig: GlobalConfig = {
  bgMusic: '',
  bgMusicVolume: 0.2,
  mediaVolume: 1.0,
  speechVolume: 1.0,
  speechRate: 1.0,
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
};

let shotIdCounter = 0;
export function createShotGroup(name?: string): ShotGroup {
  shotIdCounter++;
  return {
    id: crypto.randomUUID(),
    name: name || `视频组_${shotIdCounter}`,
    enabled: true,
    materials: [],
    subtitles: [],
    subHeadings: [],
    keepOriginalAudio: false,
    volume: 1,
    effectEnabled: false,
    effectList: [],
    stickerEnabled: false,
    stickers: [],
    smartTrim: false,
  };
}

/* ========== Store ========== */

interface MixcutState {
  view: MixcutView;
  setView: (v: MixcutView) => void;

  // Current project
  project: MixcutProject;
  setProjectName: (name: string) => void;
  setProjectId: (id: string) => void;
  setScheduledAt: (scheduledAt?: string) => void;
  setPublishPlatforms: (platforms: string[]) => void;

  // Shot groups
  addShotGroup: () => void;
  removeShotGroup: (id: string) => void;
  updateShotGroup: (id: string, partial: Partial<ShotGroup>) => void;
  addMaterialToShot: (shotId: string, material: ShotMaterial) => void;
  removeMaterialFromShot: (shotId: string, materialId: string) => void;
  reorderShotGroups: (fromIndex: number, toIndex: number) => void;
  duplicateShotGroup: (id: string) => void;
  reorderMaterialsInShot: (shotId: string, fromIndex: number, toIndex: number) => void;
  addSubtitleToShot: (shotId: string, subtitle: ShotSubtitle) => void;
  updateSubtitleInShot: (shotId: string, index: number, subtitle: Partial<ShotSubtitle>) => void;
  removeSubtitleFromShot: (shotId: string, index: number) => void;

  // Subtitle style
  subtitleStyle: SubtitleStyle;
  updateSubtitleStyle: (partial: Partial<SubtitleStyle>) => void;

  // Title style
  titleStyle: TitleStyle;
  updateTitleStyle: (partial: Partial<TitleStyle>) => void;

  // Global config
  globalConfig: GlobalConfig;
  updateGlobalConfig: (partial: Partial<GlobalConfig>) => void;

  // Highlight words
  highlightWords: { word: string; fontColor: string; bold: boolean }[];
  setHighlightWords: (words: { word: string; fontColor: string; bold: boolean }[]) => void;

  // Forbidden words
  forbiddenWords: ForbiddenWord[];
  setForbiddenWords: (words: ForbiddenWord[]) => void;

  // Active drawer
  activeDrawer: null | { type: 'subtitle' | 'effect' | 'sticker'; shotId: string };
  openDrawer: (type: 'subtitle' | 'effect' | 'sticker', shotId: string) => void;
  closeDrawer: () => void;

  // Reset
  resetProject: () => void;
  loadProject: (project: MixcutProject) => void;
}

const initialProject: MixcutProject = {
  name: '未命名项目',
  shotGroups: [createShotGroup('视频组_1')],
  subtitleStyle: { ...defaultSubtitleStyle },
  titleStyle: { ...defaultTitleStyle },
  globalConfig: { ...defaultGlobalConfig },
  highlightWords: [],
  forbiddenWords: [],
};

export const useMixcutStore = create<MixcutState>()(
  persist(
    (set, get) => ({
      view: 'list',
      setView: (v) => set({ view: v }),

      project: { ...initialProject },
      setProjectName: (name) =>
        set((s) => ({ project: { ...s.project, name } })),
      setProjectId: (id) =>
        set((s) => ({ project: { ...s.project, id } })),
      setScheduledAt: (scheduledAt) =>
        set((s) => ({ project: { ...s.project, scheduledAt } })),
      setPublishPlatforms: (platforms) =>
        set((s) => ({ project: { ...s.project, publishPlatforms: platforms } })),

      // Shot groups
      addShotGroup: () =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: [...s.project.shotGroups, createShotGroup(`视频组_${s.project.shotGroups.length + 1}`)],
          },
        })),
      removeShotGroup: (id) =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: s.project.shotGroups.filter((g) => g.id !== id),
          },
        })),
      updateShotGroup: (id, partial) =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: s.project.shotGroups.map((g) =>
              g.id === id ? { ...g, ...partial } : g,
            ),
          },
        })),
      addMaterialToShot: (shotId, material) =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: s.project.shotGroups.map((g) =>
              g.id === shotId
                ? { ...g, materials: [...g.materials, material] }
                : g,
            ),
          },
        })),
      removeMaterialFromShot: (shotId, materialId) =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: s.project.shotGroups.map((g) =>
              g.id === shotId
                ? { ...g, materials: g.materials.filter((m) => m.id !== materialId) }
                : g,
            ),
          },
        })),
      reorderShotGroups: (fromIndex, toIndex) =>
        set((s) => {
          const groups = [...s.project.shotGroups];
          const [moved] = groups.splice(fromIndex, 1);
          groups.splice(toIndex, 0, moved);
          return { project: { ...s.project, shotGroups: groups } };
        }),
      duplicateShotGroup: (id) =>
        set((s) => {
          const idx = s.project.shotGroups.findIndex((g) => g.id === id);
          if (idx === -1) return s;
          const orig = s.project.shotGroups[idx];
          const copy: ShotGroup = {
            ...orig,
            id: crypto.randomUUID(),
            name: `${orig.name}_副本`,
            materials: orig.materials.map((m) => ({ ...m })),
            subtitles: orig.subtitles.map((sub) => ({ ...sub })),
            stickers: orig.stickers.map((st) => ({ ...st })),
          };
          const groups = [...s.project.shotGroups];
          groups.splice(idx + 1, 0, copy);
          return { project: { ...s.project, shotGroups: groups } };
        }),
      reorderMaterialsInShot: (shotId, fromIndex, toIndex) =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: s.project.shotGroups.map((g) => {
              if (g.id !== shotId) return g;
              const mats = [...g.materials];
              const [moved] = mats.splice(fromIndex, 1);
              mats.splice(toIndex, 0, moved);
              return { ...g, materials: mats };
            }),
          },
        })),
      addSubtitleToShot: (shotId, subtitle) =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: s.project.shotGroups.map((g) =>
              g.id === shotId
                ? { ...g, subtitles: [...g.subtitles, subtitle] }
                : g,
            ),
          },
        })),
      updateSubtitleInShot: (shotId, index, subtitle) =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: s.project.shotGroups.map((g) =>
              g.id === shotId
                ? {
                    ...g,
                    subtitles: g.subtitles.map((sub, i) =>
                      i === index ? { ...sub, ...subtitle } : sub,
                    ),
                  }
                : g,
            ),
          },
        })),
      removeSubtitleFromShot: (shotId, index) =>
        set((s) => ({
          project: {
            ...s.project,
            shotGroups: s.project.shotGroups.map((g) =>
              g.id === shotId
                ? { ...g, subtitles: g.subtitles.filter((_, i) => i !== index) }
                : g,
            ),
          },
        })),

      // Subtitle style (synced with project)
      subtitleStyle: { ...defaultSubtitleStyle },
      updateSubtitleStyle: (partial) =>
        set((s) => {
          const updated = { ...s.subtitleStyle, ...partial };
          return {
            subtitleStyle: updated,
            project: { ...s.project, subtitleStyle: updated },
          };
        }),

      // Title style (synced with project)
      titleStyle: { ...defaultTitleStyle },
      updateTitleStyle: (partial) =>
        set((s) => {
          const updated = { ...s.titleStyle, ...partial };
          return {
            titleStyle: updated,
            project: { ...s.project, titleStyle: updated },
          };
        }),

      // Global config (synced with project)
      globalConfig: { ...defaultGlobalConfig },
      updateGlobalConfig: (partial) =>
        set((s) => {
          const updated = { ...s.globalConfig, ...partial };
          return {
            globalConfig: updated,
            project: { ...s.project, globalConfig: updated },
          };
        }),

      // Highlight words (synced with project)
      highlightWords: [],
      setHighlightWords: (words) =>
        set((s) => ({
          highlightWords: words,
          project: { ...s.project, highlightWords: words },
        })),

      // Forbidden words (synced with project)
      forbiddenWords: [],
      setForbiddenWords: (words) =>
        set((s) => ({
          forbiddenWords: words,
          project: { ...s.project, forbiddenWords: words },
        })),

      // Drawer
      activeDrawer: null,
      openDrawer: (type, shotId) => set({ activeDrawer: { type, shotId } }),
      closeDrawer: () => set({ activeDrawer: null }),

      // Reset
      resetProject: () =>
        set({
          project: {
            name: '未命名项目',
            shotGroups: [createShotGroup('视频组_1')],
            subtitleStyle: { ...defaultSubtitleStyle },
            titleStyle: { ...defaultTitleStyle },
            globalConfig: { ...defaultGlobalConfig },
            highlightWords: [],
            forbiddenWords: [],
          },
          subtitleStyle: { ...defaultSubtitleStyle },
          titleStyle: { ...defaultTitleStyle },
          globalConfig: { ...defaultGlobalConfig },
          highlightWords: [],
          forbiddenWords: [],
          activeDrawer: null,
        }),
      loadProject: (project) =>
        set({
          project,
          subtitleStyle: project.subtitleStyle,
          titleStyle: project.titleStyle,
          globalConfig: project.globalConfig,
          highlightWords: project.highlightWords,
          forbiddenWords: project.forbiddenWords || [],
          view: 'editor',
        }),
    }),
    {
      name: 'vsaas-mixcut-draft',
      partialize: (state) => ({
        project: state.project,
        subtitleStyle: state.subtitleStyle,
        titleStyle: state.titleStyle,
        globalConfig: state.globalConfig,
        highlightWords: state.highlightWords,
        forbiddenWords: state.forbiddenWords,
      }),
    },
  ),
);
