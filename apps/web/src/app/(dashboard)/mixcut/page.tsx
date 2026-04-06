'use client';

import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from './_store/use-mixcut-store';
import { MixcutEditor } from './_components/mixcut-editor';
import { ProjectList } from './_components/project-list';
import { mixcutApi, materialApi } from '@/lib/api';
import { shouldForceGroupSpeechMode } from './_lib/mixcut-capabilities';

export default function MixcutPage() {
  const { view, speechMode, speechTexts, setSpeechMode } = useMixcutStore(
    useShallow((s) => ({
      view: s.view,
      speechMode: s.project.speechMode,
      speechTexts: s.project.speechTexts,
      setSpeechMode: s.setSpeechMode,
    })),
  );
  const [options, setOptions] = useState<any>(null);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      mixcutApi.getOptions().catch(() => null),
      materialApi.list().catch(() => []),
    ]).then(([opts, mats]) => {
      if (opts) setOptions(opts);
      setAllMaterials(Array.isArray(mats) ? mats : (mats as any)?.items || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (
      shouldForceGroupSpeechMode(options, speechMode, speechTexts)
    ) {
      setSpeechMode('group');
    }
  }, [options, speechMode, speechTexts, setSpeechMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-3 text-sm text-muted-foreground">加载中...</span>
      </div>
    );
  }

  if (view === 'editor') {
    return (
      <MixcutEditor
        options={options}
        allMaterials={allMaterials}
        onMaterialAdd={(m) => setAllMaterials((prev) => [m, ...prev])}
      />
    );
  }

  return <ProjectList />;
}
