'use client';

import { useComposeStore } from './use-compose-store';
import { StepContainer } from './shared';
import { UserCircle, Globe } from 'lucide-react';

export function StepAvatar({ avatars }: { avatars: any[] }) {
  const { selectedAvatar, setSelectedAvatar } = useComposeStore();

  return (
    <StepContainer title="选择数字人形象" description="选择一个已通过人脸检测的数字人形象" canNext={!!selectedAvatar}>
      {avatars.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <UserCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">暂无形象，请先到「我的数字人」页面上传</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {avatars.map((avatar: any) => {
            const isSelected = selectedAvatar === avatar.id;
            const hasFace = (avatar.metadata as any)?.faceDetect?.valid;
            const isPublic = avatar.isPublic;
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
                    {isPublic && <Globe size={12} className="text-blue-500 shrink-0" />}
                  </div>
                  {!hasFace && (
                    <p className="mt-0.5 text-[10px] text-red-500">未通过人脸检测</p>
                  )}
                </div>
                {/* 选中覆盖层 */}
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
