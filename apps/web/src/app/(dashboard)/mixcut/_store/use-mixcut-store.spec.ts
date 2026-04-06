import { afterEach, describe, expect, it } from 'vitest';
import { useMixcutStore } from './use-mixcut-store';

describe('useMixcutStore speech state', () => {
  afterEach(() => {
    useMixcutStore.getState().resetProject();
  });

  it('updates explicit speech mode and global speech texts on the current project', () => {
    const store = useMixcutStore.getState() as ReturnType<typeof useMixcutStore.getState> & {
      setSpeechMode?: (mode: 'global' | 'group') => void;
      setSpeechTexts?: (texts: string[]) => void;
    };

    expect(typeof store.setSpeechMode).toBe('function');
    expect(typeof store.setSpeechTexts).toBe('function');

    store.setSpeechMode?.('global');
    store.setSpeechTexts?.(['全局口播一', '全局口播二']);

    const project = useMixcutStore.getState().project as any;

    expect(project.speechMode).toBe('global');
    expect(project.speechTexts).toEqual(['全局口播一', '全局口播二']);
  });

  it('normalizes missing speech fields when loading an older project', () => {
    const store = useMixcutStore.getState();
    const currentProject = store.project as any;

    store.loadProject({
      ...currentProject,
      name: '旧项目',
      speechMode: undefined,
      speechTexts: undefined,
    });

    const project = useMixcutStore.getState().project as any;

    expect(project.speechMode).toBe('global');
    expect(project.speechTexts).toEqual([]);
  });

  it('stores preview project snapshots and clears them on reset', () => {
    const store = useMixcutStore.getState() as ReturnType<typeof useMixcutStore.getState> & {
      setPreviewProject?: (previewProject: any) => void;
      previewProject?: any;
    };

    expect(typeof store.setPreviewProject).toBe('function');

    store.setPreviewProject?.({
      projectId: 'preview-project-1',
      title: '云端预览',
      timeline: {
        VideoTracks: [],
      },
    });

    expect(useMixcutStore.getState().previewProject).toEqual(
      expect.objectContaining({
        projectId: 'preview-project-1',
      }),
    );

    useMixcutStore.getState().resetProject();

    expect(useMixcutStore.getState().previewProject).toBeNull();
  });
});
