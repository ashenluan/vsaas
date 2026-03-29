'use client';

import { useState, useEffect, useRef } from 'react';
import { materialApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';

export default function AvatarsPage() {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
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
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('图片不能超过10MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setImageFile(file);
    setImageUrl(null);
  };

  const handleUpload = async () => {
    if (!name.trim()) { setError('请输入形象名称'); return; }
    if (!imageFile && !imageUrl) { setError('请上传图片'); return; }
    setError('');
    setUploading(true);
    try {
      let url = imageUrl;
      if (imageFile && !url) {
        setUploadProgress(0);
        const result = await uploadToOSS(imageFile, (p) => setUploadProgress(p));
        url = result.url;
      }
      await materialApi.upload({
        name: name.trim(),
        type: 'IMAGE',
        url: url!,
      });
      setShowUpload(false);
      setName('');
      setImagePreview(null);
      setImageFile(null);
      setImageUrl(null);
      loadAvatars();
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDetect = async (avatar: any) => {
    setDetecting(avatar.id);
    try {
      const result = await materialApi.detectFace(avatar.url, avatar.id);
      alert(result?.valid ? '人脸检测通过，可用于数字人视频' : '人脸检测未通过：' + (result?.reason || '请上传清晰正面照'));
    } catch (err: any) {
      alert(err.message || '检测失败');
    } finally {
      setDetecting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此形象？')) return;
    try {
      await materialApi.delete(id);
      loadAvatars();
    } catch {}
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">数字人形象</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          上传图片
        </button>
      </div>

      {/* 上传弹窗 */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowUpload(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">上传数字人形象</h3>
              <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">形象名称 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：主播形象A"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">人物图片 *</label>
                <p className="mb-2 text-xs text-muted-foreground">请上传清晰正面人物半身照，背景简洁效果最佳</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="预览" className="max-h-48 rounded-lg border" />
                    <button
                      onClick={() => { setImagePreview(null); setImageFile(null); setImageUrl(null); }}
                      className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-input text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    点击上传图片
                  </button>
                )}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? (uploadProgress < 100 ? `上传中 ${uploadProgress}%...` : '保存中...') : '上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 形象列表 */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>
      ) : avatars.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          暂无数字人形象，上传清晰正面人物照片开始创建
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {avatars.map((avatar: any) => (
            <div key={avatar.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {avatar.url ? (
                <img src={avatar.url} alt={avatar.name} className="aspect-[3/4] w-full object-cover" />
              ) : avatar.thumbnailUrl ? (
                <img src={avatar.thumbnailUrl} alt={avatar.name} className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-muted text-sm text-muted-foreground">
                  无图片
                </div>
              )}
              <div className="p-3">
                <h3 className="mb-1 font-medium text-sm">{avatar.name}</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  {new Date(avatar.createdAt).toLocaleDateString('zh-CN')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDetect(avatar)}
                    disabled={detecting === avatar.id}
                    className="flex-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                  >
                    {detecting === avatar.id ? '检测中...' : '人脸检测'}
                  </button>
                  <button
                    onClick={() => handleDelete(avatar.id)}
                    className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
