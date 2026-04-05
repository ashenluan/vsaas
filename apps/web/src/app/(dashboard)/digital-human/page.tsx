'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { materialApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import {
  Plus,
  ImageIcon,
  Video as VideoIcon,
  Sparkles,
  ScanFace,
  Trash2,
  Wand2,
  ChevronRight,
  Upload,
  Camera,
  X,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function DigitalHumanPage() {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClone, setShowClone] = useState(false);
  const [cloneMode, setCloneMode] = useState<'photo' | 'video'>('photo');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detecting, setDetecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAvatars = () => {
    setLoading(true);
    materialApi.list('IMAGE').then((data: any) => {
      setAvatars(Array.isArray(data) ? data : data.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadAvatars(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = cloneMode === 'video';
    if (isVideo && !f.type.startsWith('video/')) { setError('请上传视频文件'); return; }
    if (!isVideo && !f.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (f.size > (isVideo ? 100 : 10) * 1024 * 1024) { setError(isVideo ? '视频不能超过100MB' : '图片不能超过10MB'); return; }
    setError('');
    setFile(f);
    if (!isVideo) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleClone = async () => {
    if (!name.trim()) { setError('请输入数字人名称'); return; }
    if (!file) { setError(cloneMode === 'photo' ? '请上传照片' : '请上传视频'); return; }
    setError('');
    setUploading(true);
    try {
      setUploadProgress(0);
      const { url } = await uploadToOSS(file, (p) => setUploadProgress(p));
      await materialApi.upload({
        name: name.trim(),
        type: 'IMAGE',
        url,
        mimeType: file.type,
      });
      setShowClone(false);
      resetCloneForm();
      loadAvatars();
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const resetCloneForm = () => {
    setName('');
    setFile(null);
    if (preview && cloneMode === 'video') URL.revokeObjectURL(preview);
    setPreview(null);
    setError('');
    setUploadProgress(0);
  };

  const handleDetect = async (avatar: any) => {
    setDetecting(avatar.id);
    try {
      const result = await materialApi.detectFace(avatar.url, avatar.id);
      alert(result?.valid ? '✅ 人脸检测通过，可用于数字人视频生成' : '❌ 人脸检测未通过：' + (result?.reason || '请上传清晰正面照'));
    } catch (err: any) {
      alert(err.message || '检测失败');
    } finally {
      setDetecting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此数字人形象？')) return;
    try {
      await materialApi.delete(id);
      loadAvatars();
    } catch {}
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">我的数字人</h1>
          <p className="mt-1 text-sm text-slate-500">管理您的数字人形象，上传照片或视频快速复刻专属数字分身</p>
        </div>
        <Button
          onClick={() => { resetCloneForm(); setShowClone(true); }}
          className="gap-2 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={16} /> 快速复刻
        </Button>
      </div>

      {/* 提示横幅 */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <Sparkles size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">只需一张照片或一段视频，即可快速复刻数字人</h3>
            <p className="mt-0.5 text-sm text-white/70">复刻完成后，输入文案即可自动对口型，生成数字人口播视频</p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 border-white/30 text-white hover:bg-white/10 rounded-xl font-bold"
            onClick={() => { resetCloneForm(); setShowClone(true); }}
          >
            开始复刻 <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>

      {/* 快速复刻弹窗 */}
      {showClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowClone(false)}>
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">快速复刻数字人</h3>
              <button onClick={() => setShowClone(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* 复刻模式选择 */}
            <div className="mb-5 flex gap-3">
              <button
                onClick={() => { setCloneMode('photo'); setFile(null); setPreview(null); setError(''); }}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all',
                  cloneMode === 'photo'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  cloneMode === 'photo' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  <Camera size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">照片生成</p>
                  <p className="text-xs text-slate-500">上传一张照片</p>
                </div>
              </button>
              <button
                onClick={() => { setCloneMode('video'); setFile(null); setPreview(null); setError(''); }}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all',
                  cloneMode === 'video'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  cloneMode === 'video' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  <VideoIcon size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">视频生成</p>
                  <p className="text-xs text-slate-500">上传5秒视频</p>
                </div>
              </button>
            </div>

            <div className="space-y-4">
              {/* 名称 */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">数字人名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入名称，便于区分不同数字人"
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              {/* 上传区域 */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  {cloneMode === 'photo' ? '人物照片' : '人物视频'}
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  {cloneMode === 'photo'
                    ? '请上传清晰正面半身照，背景简洁效果最佳'
                    : '上传5-15秒正面视频，画面中只有一个人，可同时克隆声音'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={cloneMode === 'photo' ? 'image/*' : 'video/*'}
                  onChange={handleFileChange}
                  className="hidden"
                />
                {preview ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden">
                    {cloneMode === 'photo' ? (
                      <img src={preview} alt="预览" className="max-h-56 w-full object-contain bg-slate-50" />
                    ) : (
                      <video src={preview} controls className="max-h-56 w-full bg-black" />
                    )}
                    <button
                      onClick={() => { setFile(null); setPreview(null); }}
                      className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary transition-all bg-slate-50/50"
                  >
                    <Upload size={24} />
                    <span className="text-sm font-medium">点击或拖拽上传{cloneMode === 'photo' ? '照片' : '视频'}</span>
                    <span className="text-xs">{cloneMode === 'photo' ? '支持 JPG/PNG，最大 10MB' : '支持 MP4，最大 100MB'}</span>
                  </button>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-500 border border-red-100">
                  {error}
                </div>
              )}

              <Button
                onClick={handleClone}
                disabled={uploading}
                className="h-11 w-full rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
              >
                {uploading ? (uploadProgress < 100 ? `上传中 ${uploadProgress}%...` : '生成中...') : '提交复刻'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 数字人形象列表 */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card overflow-hidden">
              <div className="aspect-[3/4] bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : avatars.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <UserCircle size={32} className="text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">还没有数字人形象</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">上传一张照片或一段视频，快速复刻专属数字分身</p>
          <Button onClick={() => { resetCloneForm(); setShowClone(true); }} className="rounded-xl font-bold gap-2">
            <Plus size={16} /> 快速复刻
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {/* 新建卡片 */}
          <button
            onClick={() => { resetCloneForm(); setShowClone(true); }}
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 aspect-[3/4] text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus size={32} className="mb-2" />
            <span className="text-sm font-bold">快速复刻</span>
          </button>

          {/* 数字人卡片 */}
          {avatars.map((avatar: any) => {
            const faceValid = avatar.metadata?.faceDetected === true;
            return (
              <div key={avatar.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                {/* 图片 */}
                <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
                  {avatar.url ? (
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon size={32} className="text-slate-300" />
                    </div>
                  )}
                  {/* 公共/系统标识 + 人脸检测状态 */}
                  <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {avatar.isPublic && (
                      <span className="inline-flex items-center rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        系统
                      </span>
                    )}
                    {faceValid && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        <ScanFace size={10} /> 已验证
                      </span>
                    )}
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                    <Link
                      href={`/digital-human/create?avatarId=${avatar.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-white transition-colors"
                    >
                      <Wand2 size={14} /> 去创作
                    </Link>
                  </div>
                </div>
                {/* 信息 */}
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{avatar.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(avatar.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    {!avatar.isPublic && (
                      <button
                        onClick={() => handleDetect(avatar)}
                        disabled={detecting === avatar.id}
                        className="flex-1 rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
                      >
                        {detecting === avatar.id ? '检测中...' : '人脸检测'}
                      </button>
                    )}
                    <Link
                      href={`/digital-human/create?avatarId=${avatar.id}`}
                      className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 text-center transition-colors"
                    >
                      去创作
                    </Link>
                    {!avatar.isPublic && (
                      <button
                        onClick={() => handleDelete(avatar.id)}
                        className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
