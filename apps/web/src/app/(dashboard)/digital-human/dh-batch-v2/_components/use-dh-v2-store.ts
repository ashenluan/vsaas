import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Step = 'channel' | 'voice' | 'avatar' | 'script' | 'materials' | 'config' | 'submit';

export const STEPS: { key: Step; label: string; num: number }[] = [
  { key: 'channel', label: '选择通道', num: 1 },
  { key: 'voice', label: '选择声音', num: 2 },
  { key: 'avatar', label: '选择形象', num: 3 },
  { key: 'script', label: '选择脚本', num: 4 },
  { key: 'materials', label: '素材管理', num: 5 },
  { key: 'config', label: '输出配置', num: 6 },
  { key: 'submit', label: '确认提交', num: 7 },
];

export interface SubtitleConfig {
  open: boolean;
  font: string;
  fontSize: number;
  fontColor: string;
}

export interface OutputConfig {
  videoCount: number;
  resolution: string;
  maxDuration: number;
  crf: number;
  speechRate: number;
  mediaVolume: number;
  speechVolume: number;
  bgMusicVolume: number;
}

interface DhV2State {
  step: Step;
  setStep: (s: Step) => void;
  nextStep: () => void;
  prevStep: () => void;

  channel: 'A' | 'B' | null;
  setChannel: (c: 'A' | 'B') => void;

  selectedVoice: string | null;
  setSelectedVoice: (v: string | null) => void;

  // Channel A
  selectedBuiltinAvatar: string | null;
  setSelectedBuiltinAvatar: (id: string | null) => void;

  // Channel B
  selectedAvatar: string | null;
  setSelectedAvatar: (id: string | null) => void;

  selectedScripts: string[];
  toggleScript: (id: string) => void;

  selectedMaterials: string[];
  toggleMaterial: (id: string) => void;

  bgMusic: string;
  setBgMusic: (url: string) => void;

  transitionId: string;
  setTransitionId: (id: string) => void;

  subtitle: SubtitleConfig;
  updateSubtitle: (partial: Partial<SubtitleConfig>) => void;

  output: OutputConfig;
  updateOutput: (partial: Partial<OutputConfig>) => void;

  reset: () => void;
}

const defaultSubtitle: SubtitleConfig = {
  open: true,
  font: 'alibaba-sans',
  fontSize: 28,
  fontColor: '#FFFFFF',
};

const defaultOutput: OutputConfig = {
  videoCount: 5,
  resolution: '1080x1920',
  maxDuration: 120,
  crf: 27,
  speechRate: 0,
  mediaVolume: 1,
  speechVolume: 1,
  bgMusicVolume: 0.2,
};

export const useDhV2Store = create<DhV2State>()(
  persist(
    (set, get) => ({
      step: 'channel',
      setStep: (s) => set({ step: s }),
      nextStep: () => {
        const idx = STEPS.findIndex((s) => s.key === get().step);
        if (idx < STEPS.length - 1) set({ step: STEPS[idx + 1].key });
      },
      prevStep: () => {
        const idx = STEPS.findIndex((s) => s.key === get().step);
        if (idx > 0) set({ step: STEPS[idx - 1].key });
      },

      channel: null,
      setChannel: (c) => set({ channel: c, selectedBuiltinAvatar: null, selectedAvatar: null }),

      selectedVoice: null,
      setSelectedVoice: (v) => set({ selectedVoice: v }),

      selectedBuiltinAvatar: null,
      setSelectedBuiltinAvatar: (id) => set({ selectedBuiltinAvatar: id }),

      selectedAvatar: null,
      setSelectedAvatar: (id) => set({ selectedAvatar: id }),

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

      transitionId: '',
      setTransitionId: (id) => set({ transitionId: id }),

      subtitle: { ...defaultSubtitle },
      updateSubtitle: (p) => set((s) => ({ subtitle: { ...s.subtitle, ...p } })),

      output: { ...defaultOutput },
      updateOutput: (p) => set((s) => ({ output: { ...s.output, ...p } })),

      reset: () =>
        set({
          step: 'channel',
          channel: null,
          selectedVoice: null,
          selectedBuiltinAvatar: null,
          selectedAvatar: null,
          selectedScripts: [],
          selectedMaterials: [],
          bgMusic: '',
          transitionId: '',
          subtitle: { ...defaultSubtitle },
          output: { ...defaultOutput },
        }),
    }),
    {
      name: 'vsaas-dh-v2-draft',
      partialize: (state) => ({
        channel: state.channel,
        selectedVoice: state.selectedVoice,
        selectedBuiltinAvatar: state.selectedBuiltinAvatar,
        selectedAvatar: state.selectedAvatar,
        selectedScripts: state.selectedScripts,
        selectedMaterials: state.selectedMaterials,
        bgMusic: state.bgMusic,
        transitionId: state.transitionId,
        subtitle: state.subtitle,
        output: state.output,
      }),
    },
  ),
);
