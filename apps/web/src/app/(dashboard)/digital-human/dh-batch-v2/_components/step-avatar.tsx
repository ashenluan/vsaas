'use client';

import { useDhV2Store } from './use-dh-v2-store';
import { StepContainer } from './shared';
import { UserCircle, Globe, Play } from 'lucide-react';
import { useState } from 'react';

export function StepAvatar({
  customAvatars,
  builtinAvatars,
}: {
  customAvatars: any[];
  builtinAvatars: any[];
}) {
  const { channel, selectedAvatar, setSelectedAvatar, selectedBuiltinAvatar, setSelectedBuiltinAvatar } = useDhV2Store();
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  const canNext = channel === 'A' ? !!selectedBuiltinAvatar : !!selectedAvatar;

  if (channel === 'A') {
    return (
      <StepContainer title="选择内置数字人" description="选择阿里云 IMS 系统预置数字人形象" canNext={canNext}>
        {builtinAvatars.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <UserCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无可用内置数字人</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {builtinAvatars.map((avatar) => {
                const isSelected = selectedBuiltinAvatar === avatar.avatarId;
                return (
                  <button
                    key={avatar.avatarId}
                    onClick={() => setSelectedBuiltinAvatar(avatar.avatarId)}
                    className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary shadow-md'
                        : 'hover:border-primary/50 hover:shadow-sm'
                    }`}
                  >
                    {avatar.coverUrl ? (
                      <img src={avatar.coverUrl} alt={avatar.avatarName} className="aspect-[3/4] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center bg-muted text-xs text-muted-foreground">无预览</div>
                    )}
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{avatar.avatarName}</p>
                      <p className="text-[10px] text-muted-foreground">{avatar.width}×{avatar.height}</p>
                    </div>
                    {avatar.videoUrl && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewVideo(avatar.videoUrl); }}
                        className="absolute right-2 bottom-12 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play size={12} />
                      </button>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg">✓</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Video preview modal */}
            {previewVideo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewVideo(null)}>
                <div className="relative max-w-md rounded-2xl bg-card p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <video src={previewVideo} autoPlay loop controls className="max-h-[70vh] rounded-xl" />
                  <button onClick={() => setPreviewVideo(null)} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card border shadow text-xs">✕</button>
                </div>
              </div>
            )}
          </>
        )}
      </StepContainer>
    );
  }

  // Channel B — custom avatars
  return (
    <StepContainer title="选择数字人形象" description="选择一个已通过人脸检测的自定义形象" canNext={canNext}>
      {customAvatars.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <UserCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">暂无形象，请先到「我的数字人」页面上传</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {customAvatars.map((avatar: any) => {
            const isSelected = selectedAvatar === avatar.id;
            const hasFace = (avatar.metadata as any)?.faceDetect?.valid;
            return (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                disabled={!hasFace}
                className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                  !hasFace
                    ? 'opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-primary ring-2 ring-primary shadow-md'
                    : 'hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                {avatar.url ? (
                  <img src={avatar.url} alt={avatar.name} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center bg-muted text-xs text-muted-foreground">无图片</div>
                )}
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{avatar.name}</p>
                    {avatar.isPublic && <Globe size={12} className="text-blue-500 shrink-0" />}
                  </div>
                  {!hasFace && <p className="mt-0.5 text-[10px] text-red-500">未通过人脸检测</p>}
                </div>
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg">✓</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </StepContainer>
  );
}
