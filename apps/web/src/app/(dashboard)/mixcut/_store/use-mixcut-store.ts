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
  materials: ShotMaterial[];
  subtitles: ShotSubtitle[];
  keepOriginalAudio: boolean;
  // per-shot config overrides
  effectEnabled: boolean;
  effectList: string[];
  stickerEnabled: boolean;
  stickers: { url: string; x: number; y: number; width: number; height: number }[];
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

export interface GlobalConfig {
  bgMusic: string;
  bgMusicVolume: number;
  transitionEnabled: boolean;
  transitionDuration: number;
  transitionList: string[];
  useUniformTransition: boolean;
  filterEnabled: boolean;
  filterList: string[];
  bgType: 'none' | 'color' | 'blur';
  bgColor: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  resolution: '1080x1920' | '720x1280' | '1920x1080' | '1280x720' | '1080x1080' | '720x720';
  coverType: 'auto' | 'custom';
  coverUrl: string;
  voiceId?: string;
}

export type MixcutView = 'list' | 'editor';

export interface MixcutProject {
  id?: string;
  name: string;
  shotGroups: ShotGroup[];
  subtitleStyle: SubtitleStyle;
  titleStyle: TitleStyle;
  globalConfig: GlobalConfig;
  highlightWords: { word: string; fontColor: string; bold: boolean }[];
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
  transitionEnabled: false,
  transitionDuration: 0.5,
  transitionList: [],
  useUniformTransition: true,
  filterEnabled: false,
  filterList: [],
  bgType: 'none',
  bgColor: '#000000',
  aspectRatio: '9:16',
  resolution: '1080x1920',
  coverType: 'auto',
  coverUrl: '',
};

let shotIdCounter = 0;
export function createShotGroup(name?: string): ShotGroup {
  shotIdCounter++;
  return {
    id: `shot_${Date.now()}_${shotIdCounter}`,
    name: name || `视频组_${shotIdCounter}`,
    materials: [],
    subtitles: [],
    keepOriginalAudio: false,
    effectEnabled: false,
    effectList: [],
    stickerEnabled: false,
    stickers: [],
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
            id: `shot_${Date.now()}_dup`,
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

      // Subtitle style
      subtitleStyle: { ...defaultSubtitleStyle },
      updateSubtitleStyle: (partial) =>
        set((s) => ({ subtitleStyle: { ...s.subtitleStyle, ...partial } })),

      // Title style
      titleStyle: { ...defaultTitleStyle },
      updateTitleStyle: (partial) =>
        set((s) => ({ titleStyle: { ...s.titleStyle, ...partial } })),

      // Global config
      globalConfig: { ...defaultGlobalConfig },
      updateGlobalConfig: (partial) =>
        set((s) => ({ globalConfig: { ...s.globalConfig, ...partial } })),

      // Highlight words
      highlightWords: [],
      setHighlightWords: (words) => set({ highlightWords: words }),

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
          },
          subtitleStyle: { ...defaultSubtitleStyle },
          titleStyle: { ...defaultTitleStyle },
          globalConfig: { ...defaultGlobalConfig },
          highlightWords: [],
          activeDrawer: null,
        }),
      loadProject: (project) =>
        set({
          project,
          subtitleStyle: project.subtitleStyle,
          titleStyle: project.titleStyle,
          globalConfig: project.globalConfig,
          highlightWords: project.highlightWords,
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
      }),
    },
  ),
);
