'use client';

import { useState } from 'react';
import { useComposeStore } from './use-compose-store';
import { StepContainer, Card } from './shared';
import { materialApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { ImagePlus, Music, Upload, X, Image as ImageIcon, Film } from 'lucide-react';
import { IMS_MEDIA_ACCEPT, IMS_AUDIO_ACCEPT, validateImsFile, getImsFormatHint } from '@/lib/ims-formats';

export function StepMaterials({ allMaterials, onMaterialAdd }: { allMaterials: any[]; onMaterialAdd: (m: any) => void }) {
  const { selectedMaterials, toggleMaterial, bgMusic, setBgMusic } = useComposeStore();

  /* ---- upload state ---- */
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formatError = validateImsFile(file, ['image', 'video']);
        if (formatError) {
          console.warn(`Skipped ${file.name}: ${formatError}`);
          continue;
        }
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        // 1. upload to OSS (handles presigned URL internally)
        const { url: fileUrl } = await uploadToOSS(file);

        // 2. create material record
        const created = await materialApi.upload({
          name: file.name,
          type: isImage ? 'IMAGE' : 'VIDEO',
          url: fileUrl,
          mimeType: file.type,
        });
        onMaterialAdd(created);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const imageVideoMaterials = allMaterials.filter((m: any) => m.type === 'IMAGE' || m.type === 'VIDEO');

  return (
    <StepContainer title="素材管理" description="添加图片/视频素材用于混剪，选择素材和背景音乐">
      {/* 拖拽上传区 */}
      <Card className="mb-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Upload size={14} /> 上传素材
        </h3>
        <div
          className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = IMS_MEDIA_ACCEPT;
            input.onchange = () => handleFileUpload(input.files);
            input.click();
          }}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              上传中...
            </div>
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">拖拽或点击上传图片/视频素材</p>
              <p className="text-[10px] text-muted-foreground/50">支持 {getImsFormatHint('media')}</p>
            </>
          )}
        </div>
      </Card>

      {/* 素材选择列表 */}
      <Card className="mb-5">
        <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
          <span>选择混剪素材 <span className="font-normal text-muted-foreground">（可选，已选 {selectedMaterials.length} 个）</span></span>
          {selectedMaterials.length > 0 && (
            <button
              onClick={() => selectedMaterials.forEach((id) => toggleMaterial(id))}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              清除选择
            </button>
          )}
        </h3>
        {imageVideoMaterials.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">暂无图片/视频素材</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {imageVideoMaterials.map((m: any) => {
              const isSelected = selectedMaterials.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMaterial(m.id)}
                  className={`group relative overflow-hidden rounded-lg border text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary shadow-sm'
                      : 'hover:border-primary/50'
                  }`}
                >
                  {m.type === 'IMAGE' && m.url ? (
                    <img src={m.thumbnailUrl || m.url} alt={m.name} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-muted">
                      {m.type === 'VIDEO' ? <Film size={20} className="text-muted-foreground/50" /> : <ImageIcon size={20} className="text-muted-foreground/50" />}
                    </div>
                  )}
                  <div className="p-1.5">
                    <p className="text-[11px] font-medium truncate">{m.name}</p>
                  </div>
                  {/* 选中badge */}
                  {isSelected && (
                    <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white shadow">✓</div>
                  )}
                  {/* 类型badge */}
                  <div className="absolute left-1 top-1 rounded bg-black/50 px-1 py-0.5 text-[9px] text-white">
                    {m.type === 'VIDEO' ? '视频' : '图片'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* 背景音乐 */}
      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Music size={14} /> 背景音乐
          <span className="font-normal text-muted-foreground">（可选）</span>
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={bgMusic}
            onChange={(e) => setBgMusic(e.target.value)}
            placeholder="输入背景音乐的 OSS 地址"
            className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {bgMusic && (
            <button onClick={() => setBgMusic('')} className="h-9 rounded-md border px-2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">支持 {getImsFormatHint('audio')}，音量可在输出配置中调整</p>
      </Card>
    </StepContainer>
  );
}
