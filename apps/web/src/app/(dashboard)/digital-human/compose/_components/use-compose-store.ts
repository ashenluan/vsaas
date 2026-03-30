import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Step =
  | 'voice'
  | 'avatar'
  | 'script'
  | 'materials'
  | 'subtitle'
  | 'effects'
  | 'config'
  | 'preview'
  | 'submit';

export const STEPS: { key: Step; label: string; num: number }[] = [
  { key: 'voice', label: '选择声音', num: 1 },
  { key: 'avatar', label: '选择形象', num: 2 },
  { key: 'script', label: '选择脚本', num: 3 },
  { key: 'materials', label: '素材管理', num: 4 },
  { key: 'subtitle', label: '字幕设置', num: 5 },
  { key: 'effects', label: '特效转场', num: 6 },
  { key: 'config', label: '输出配置', num: 7 },
  { key: 'preview', label: '效果预览', num: 8 },
  { key: 'submit', label: '确认提交', num: 9 },
];

/* ---------- subtitle ---------- */
export interface SubtitleConfig {
  enabled: boolean;
  font: string;
  fontSize: number;
  fontColor: string;
  fontColorOpacity: number;
  alignment: string;
  y: number;
  adaptMode: string;
  outline: number;
  outlineColour: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  effectColorStyleId: string;
  bubbleStyleId: string;
}

/* ---------- title (overlay) ---------- */
export interface TitleConfig {
  enabled: boolean;
  titles: string[];
  font: string;
  fontSize: number;
  fontColor: string;
  alignment: string;
  y: number;
  effectColorStyleId: string;
}

/* ---------- effects ---------- */
export interface EffectsConfig {
  allowEffects: boolean;
  vfxEffectProbability: number;
  vfxFirstClipEffectList: string[];
  vfxNotFirstClipEffectList: string[];
}

/* ---------- transition ---------- */
export interface TransitionConfig {
  allowTransition: boolean;
  transitionDuration: number;
  transitionList: string[];
  useUniformTransition: boolean;
}

/* ---------- filter ---------- */
export interface FilterConfig {
  allowFilter: boolean;
  filterList: string[];
}

/* ---------- highlight keywords ---------- */
export interface HighlightWord {
  word: string;
  fontColor: string;
  outlineColour: string;
  bold: boolean;
}

/* ---------- background ---------- */
export interface BackgroundConfig {
  type: 'none' | 'blur' | 'color' | 'image';
  blurRadius: number;
  color: string;
  imageUrls: string[];
}

/* ---------- sticker ---------- */
export interface StickerItem {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

/* ---------- advanced output ---------- */
export interface OutputConfig {
  videoCount: number;
  resolution: string;
  maxDuration: number;
  crf: number;
  speechRate: number;
  mediaVolume: number;
  bgMusicVolume: number;
  speechVolume: number;
}

/* ========== Store ========== */
interface ComposeState {
  /* navigation */
  step: Step;
  setStep: (s: Step) => void;
  nextStep: () => void;
  prevStep: () => void;

  /* selections */
  selectedVoice: string | null;
  setSelectedVoice: (v: string | null) => void;
  selectedAvatar: string | null;
  setSelectedAvatar: (a: string | null) => void;
  selectedScripts: string[];
  toggleScript: (id: string) => void;
  selectedMaterials: string[];
  toggleMaterial: (id: string) => void;
  bgMusic: string;
  setBgMusic: (url: string) => void;

  /* subtitle */
  subtitle: SubtitleConfig;
  updateSubtitle: (partial: Partial<SubtitleConfig>) => void;

  /* title overlay */
  title: TitleConfig;
  updateTitle: (partial: Partial<TitleConfig>) => void;

  /* effects / transition / filter */
  effects: EffectsConfig;
  updateEffects: (partial: Partial<EffectsConfig>) => void;
  transition: TransitionConfig;
  updateTransition: (partial: Partial<TransitionConfig>) => void;
  filter: FilterConfig;
  updateFilter: (partial: Partial<FilterConfig>) => void;

  /* highlight keywords */
  highlightWords: HighlightWord[];
  setHighlightWords: (words: HighlightWord[]) => void;

  /* background */
  background: BackgroundConfig;
  updateBackground: (partial: Partial<BackgroundConfig>) => void;

  /* stickers */
  stickers: StickerItem[];
  setStickers: (items: StickerItem[]) => void;

  /* output */
  output: OutputConfig;
  updateOutput: (partial: Partial<OutputConfig>) => void;

  /* reset */
  reset: () => void;
}

const defaultSubtitle: SubtitleConfig = {
  enabled: true,
  font: 'Alibaba PuHuiTi 2.0 65 Medium',
  fontSize: 40,
  fontColor: '#ffffff',
  fontColorOpacity: 1,
  alignment: 'BottomCenter',
  y: 0.85,
  adaptMode: 'AutoWrap',
  outline: 2,
  outlineColour: '#000000',
  bold: false,
  italic: false,
  underline: false,
  effectColorStyleId: '',
  bubbleStyleId: '',
};

const defaultTitle: TitleConfig = {
  enabled: false,
  titles: [],
  font: 'Alibaba PuHuiTi 2.0 95 ExtraBold',
  fontSize: 56,
  fontColor: '#ffffff',
  alignment: 'TopCenter',
  y: 0.08,
  effectColorStyleId: '',
};

const defaultEffects: EffectsConfig = {
  allowEffects: false,
  vfxEffectProbability: 0.5,
  vfxFirstClipEffectList: [],
  vfxNotFirstClipEffectList: [],
};

const defaultTransition: TransitionConfig = {
  allowTransition: false,
  transitionDuration: 0.5,
  transitionList: [],
  useUniformTransition: true,
};

const defaultFilter: FilterConfig = {
  allowFilter: false,
  filterList: [],
};

const defaultBackground: BackgroundConfig = {
  type: 'none',
  blurRadius: 0.3,
  color: '#000000',
  imageUrls: [],
};

const defaultOutput: OutputConfig = {
  videoCount: 5,
  resolution: '1080x1920',
  maxDuration: 60,
  crf: 27,
  speechRate: 0,
  mediaVolume: 1,
  bgMusicVolume: 0.2,
  speechVolume: 1,
};

export const useComposeStore = create<ComposeState>()(
  persist(
    (set, get) => ({
      step: 'voice',
      setStep: (s) => set({ step: s }),
      nextStep: () => {
        const idx = STEPS.findIndex((s) => s.key === get().step);
        if (idx < STEPS.length - 1) set({ step: STEPS[idx + 1].key });
      },
      prevStep: () => {
        const idx = STEPS.findIndex((s) => s.key === get().step);
        if (idx > 0) set({ step: STEPS[idx - 1].key });
      },

      selectedVoice: null,
      setSelectedVoice: (v) => set({ selectedVoice: v }),
      selectedAvatar: null,
      setSelectedAvatar: (a) => set({ selectedAvatar: a }),
      selectedScripts: [],
      toggleScript: (id) =>
        set((s) => ({
          selectedScripts: s.selectedScripts.includes(id)
            ? s.selectedScripts.filter((x) => x !== id)
            : [...s.selectedScripts, id],
        })),
      selectedMaterials: [],
      toggleMaterial: (id) =>
        set((s) => ({
          selectedMaterials: s.selectedMaterials.includes(id)
            ? s.selectedMaterials.filter((x) => x !== id)
            : [...s.selectedMaterials, id],
        })),
      bgMusic: '',
      setBgMusic: (url) => set({ bgMusic: url }),

      subtitle: { ...defaultSubtitle },
      updateSubtitle: (p) => set((s) => ({ subtitle: { ...s.subtitle, ...p } })),
      title: { ...defaultTitle },
      updateTitle: (p) => set((s) => ({ title: { ...s.title, ...p } })),

      effects: { ...defaultEffects },
      updateEffects: (p) => set((s) => ({ effects: { ...s.effects, ...p } })),
      transition: { ...defaultTransition },
      updateTransition: (p) => set((s) => ({ transition: { ...s.transition, ...p } })),
      filter: { ...defaultFilter },
      updateFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p } })),

      highlightWords: [],
      setHighlightWords: (words) => set({ highlightWords: words }),

      background: { ...defaultBackground },
      updateBackground: (p) => set((s) => ({ background: { ...s.background, ...p } })),
      stickers: [],
      setStickers: (items) => set({ stickers: items }),

      output: { ...defaultOutput },
      updateOutput: (p) => set((s) => ({ output: { ...s.output, ...p } })),

      reset: () =>
        set({
          step: 'voice',
          selectedVoice: null,
          selectedAvatar: null,
          selectedScripts: [],
          selectedMaterials: [],
          bgMusic: '',
          subtitle: { ...defaultSubtitle },
          title: { ...defaultTitle },
          effects: { ...defaultEffects },
          transition: { ...defaultTransition },
          filter: { ...defaultFilter },
          highlightWords: [],
          background: { ...defaultBackground },
          stickers: [],
          output: { ...defaultOutput },
        }),
    }),
    {
      name: 'vsaas-compose-draft',
      partialize: (state) => ({
        selectedVoice: state.selectedVoice,
        selectedAvatar: state.selectedAvatar,
        selectedScripts: state.selectedScripts,
        selectedMaterials: state.selectedMaterials,
        bgMusic: state.bgMusic,
        subtitle: state.subtitle,
        title: state.title,
        effects: state.effects,
        transition: state.transition,
        filter: state.filter,
        highlightWords: state.highlightWords,
        background: state.background,
        stickers: state.stickers,
        output: state.output,
      }),
    },
  ),
);
