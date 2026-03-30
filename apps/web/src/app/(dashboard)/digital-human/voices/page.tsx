'use client';

import { useState, useEffect, useRef } from 'react';
import { voiceApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { useWs } from '@/components/ws-provider';

export default function VoicesPage() {
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClone, setShowClone] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewText, setPreviewText] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket 声音克隆状态监听
  const { subscribe } = useWs();

  useEffect(() => {
    return subscribe('voice:status', (data: any) => {
      setVoices((prev) =>
        prev.map((v) =>
          v.id === data.voiceId
            ? { ...v, status: data.status }
            : v,
        ),
      );
    });
  }, [subscribe]);

  const loadVoices = () => {
    setLoading(true);
    voiceApi.list().then((data: any) => {
      setVoices(Array.isArray(data) ? data : data.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadVoices(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { setError('请上传音频文件'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('音频文件不能超过20MB'); return; }
    setError('');
    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
  };

  const handleClone = async () => {
    if (!cloneName.trim()) { setError('请输入声音名称'); return; }
    if (!audioFile) { setError('请上传音频样本'); return; }
    setError('');
    setCloning(true);
    try {
      setUploadProgress(0);
      const { url } = await uploadToOSS(audioFile, (p) => setUploadProgress(p));
      await voiceApi.clone({ name: cloneName.trim(), sampleUrl: url });
      setShowClone(false);
      setCloneName('');
      setAudioFile(null);
      setAudioPreview(null);
      loadVoices();
    } catch (err: any) {
      setError(err.message || '克隆失败');
    } finally {
      setCloning(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此声音？')) return;
    try {
      await voiceApi.delete(id);
      loadVoices();
    } catch {}
  };

  const handlePreview = async (voiceId: string) => {
    if (!previewText.trim()) return;
    setPreviewingId(voiceId);
    try {
      const result = await voiceApi.preview(voiceId, previewText.trim());
      if (result?.audioUrl) setPreviewAudio(result.audioUrl);
    } catch {} finally {
      setPreviewingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">声音管理</h1>
        <button
          onClick={() => setShowClone(true)}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          上传音频克隆
        </button>
      </div>

      {/* 克隆弹窗 */}
      {showClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowClone(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">声音克隆</h3>
              <button onClick={() => setShowClone(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">声音名称 *</label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="例如：我的声音"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">音频样本 *</label>
                <p className="mb-2 text-xs text-muted-foreground">上传10-20秒清晰语音，无背景噪音效果最佳</p>
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                {audioPreview ? (
                  <div className="space-y-2">
                    <audio src={audioPreview} controls className="w-full" />
                    <button
                      onClick={() => { setAudioFile(null); setAudioPreview(null); }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-full items-center justify-center rounded-lg border-2 border-dashed border-input text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    点击上传音频文件
                  </button>
                )}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleClone}
                disabled={cloning}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {cloning ? (uploadProgress < 100 ? `上传中 ${uploadProgress}%...` : '克隆中...') : '开始克隆'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 声音列表 */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>
      ) : voices.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          暂无已克隆的声音，上传10-20秒的音频开始克隆
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((voice: any) => (
            <div key={voice.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{voice.name}</h3>
                  {voice.isPublic && (
                    <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">系统</span>
                  )}
                  {voice.gender && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 leading-none">{voice.gender === 'female' ? '女声' : '男声'}</span>
                  )}
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  voice.status === 'READY' ? 'bg-green-100 text-green-700' :
                  voice.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {voice.status === 'READY' ? '可用' : voice.status === 'FAILED' ? '失败' : '处理中'}
                </span>
              </div>
              {voice.sampleUrl && (
                <audio src={voice.sampleUrl} controls className="mb-3 w-full" />
              )}
              <p className="mb-3 text-xs text-muted-foreground">
                创建时间：{new Date(voice.createdAt).toLocaleString('zh-CN')}
              </p>
              {voice.status === 'READY' && (
                <div className="mb-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="输入试听文本..."
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      className="flex h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <button
                      onClick={() => handlePreview(voice.voiceId)}
                      disabled={previewingId === voice.voiceId}
                      className="h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      {previewingId === voice.voiceId ? '...' : '试听'}
                    </button>
                  </div>
                  {previewAudio && (
                    <audio src={previewAudio} controls autoPlay className="w-full" />
                  )}
                </div>
              )}
              {!voice.isPublic && (
                <button
                  onClick={() => handleDelete(voice.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
