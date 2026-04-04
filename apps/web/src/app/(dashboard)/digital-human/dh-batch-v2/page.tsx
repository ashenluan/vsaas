'use client';

import { useState, useEffect } from 'react';
import { voiceApi, materialApi, scriptApi, dhBatchV2Api } from '@/lib/api';
import { useDhV2Store } from './_components/use-dh-v2-store';
import { StepIndicator } from './_components/shared';
import { StepChannel } from './_components/step-channel';
import { StepVoice } from './_components/step-voice';
import { StepAvatar } from './_components/step-avatar';
import { StepScript } from './_components/step-script';
import { StepMaterials } from './_components/step-materials';
import { StepConfig } from './_components/step-config';
import { StepSubmit } from './_components/step-submit';
import { DhV2Result } from './_components/dh-v2-result';

export default function DhBatchV2Page() {
  const step = useDhV2Store((s) => s.step);
  const [voices, setVoices] = useState<any[]>([]);
  const [customAvatars, setCustomAvatars] = useState<any[]>([]);
  const [builtinAvatars, setBuiltinAvatars] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      voiceApi.list().catch(() => []),
      materialApi.list('IMAGE').catch(() => []),
      materialApi.list().catch(() => []),
      scriptApi.list().catch(() => []),
      dhBatchV2Api.listBuiltinAvatars().catch(() => ({ avatars: [], totalCount: 0 })),
      dhBatchV2Api.list().catch(() => []),
    ]).then(([v, imgMats, allMats, s, builtinRes, jobs]) => {
      setVoices(Array.isArray(v) ? v : (v as any)?.items || []);
      setCustomAvatars(Array.isArray(imgMats) ? imgMats : (imgMats as any)?.items || []);
      setAllMaterials(Array.isArray(allMats) ? allMats : (allMats as any)?.items || []);
      setScripts(Array.isArray(s) ? s : (s as any)?.items || []);
      setBuiltinAvatars((builtinRes as any)?.avatars || []);

      // Restore active job
      const jobList = Array.isArray(jobs) ? jobs : (jobs as any)?.items || [];
      const activeJob = jobList.find((j: any) => j.status === 'PENDING' || j.status === 'PROCESSING');
      if (activeJob) setResult(activeJob);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  if (result) {
    return <DhV2Result result={result} onNewTask={() => setResult(null)} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">数字人交错混剪</h1>
      <StepIndicator />

      {step === 'channel' && <StepChannel />}
      {step === 'voice' && <StepVoice voices={voices} />}
      {step === 'avatar' && <StepAvatar customAvatars={customAvatars} builtinAvatars={builtinAvatars} />}
      {step === 'script' && <StepScript scripts={scripts} />}
      {step === 'materials' && <StepMaterials allMaterials={allMaterials} />}
      {step === 'config' && <StepConfig />}
      {step === 'submit' && (
        <StepSubmit
          voices={voices}
          customAvatars={customAvatars}
          builtinAvatars={builtinAvatars}
          onResult={setResult}
        />
      )}
    </div>
  );
}
