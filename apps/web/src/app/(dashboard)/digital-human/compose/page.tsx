'use client';

import { useState, useEffect } from 'react';
import { voiceApi, materialApi, scriptApi, composeApi } from '@/lib/api';
import { useComposeStore } from './_components/use-compose-store';
import { StepIndicator } from './_components/shared';
import { StepVoice } from './_components/step-voice';
import { StepAvatar } from './_components/step-avatar';
import { StepScript } from './_components/step-script';
import { StepMaterials } from './_components/step-materials';
import { StepSubtitle } from './_components/step-subtitle';
import { StepEffects } from './_components/step-effects';
import { StepConfig } from './_components/step-config';
import { StepPreview } from './_components/step-preview';
import { StepSubmit } from './_components/step-submit';
import { ComposeResult } from './_components/compose-result';

export default function ComposePage() {
  const step = useComposeStore((s) => s.step);
  const [voices, setVoices] = useState<any[]>([]);
  const [avatars, setAvatars] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [options, setOptions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      voiceApi.list().catch(() => []),
      materialApi.list('IMAGE').catch(() => []),
      materialApi.list().catch(() => []),
      scriptApi.list().catch(() => []),
      composeApi.getOptions().catch(() => null),
      composeApi.list().catch(() => []),
    ]).then(([v, a, m, s, o, jobs]) => {
      setVoices(Array.isArray(v) ? v : (v as any)?.items || []);
      setAvatars(Array.isArray(a) ? a : (a as any)?.items || []);
      setAllMaterials(Array.isArray(m) ? m : (m as any)?.items || []);
      setScripts(Array.isArray(s) ? s : (s as any)?.items || []);
      if (o) setOptions(o);

      // Restore active job
      const jobList = Array.isArray(jobs) ? jobs : (jobs as any)?.items || [];
      const activeJob = jobList.find((j: any) => j.status === 'PENDING' || j.status === 'PROCESSING');
      if (activeJob) setResult(activeJob);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">加载素材中...</div>;
  }

  if (result) {
    return <ComposeResult result={result} onNewTask={() => setResult(null)} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">批量混剪</h1>
      <StepIndicator />

      {step === 'voice' && <StepVoice voices={voices} />}
      {step === 'avatar' && <StepAvatar avatars={avatars} />}
      {step === 'script' && <StepScript scripts={scripts} />}
      {step === 'materials' && (
        <StepMaterials
          allMaterials={allMaterials}
          onMaterialAdd={(m) => setAllMaterials((prev) => [m, ...prev])}
        />
      )}
      {step === 'subtitle' && <StepSubtitle options={options} />}
      {step === 'effects' && <StepEffects options={options} />}
      {step === 'config' && <StepConfig />}
      {step === 'preview' && <StepPreview voices={voices} avatars={avatars} scripts={scripts} />}
      {step === 'submit' && <StepSubmit voices={voices} avatars={avatars} onResult={setResult} />}
    </div>
  );
}
