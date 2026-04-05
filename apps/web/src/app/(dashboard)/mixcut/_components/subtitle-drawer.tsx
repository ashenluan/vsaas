'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SubtitleContent } from './subtitle-drawer/subtitle-content';
import { SubtitleStyleTab } from './subtitle-drawer/subtitle-style-tab';
import { TitleTab } from './subtitle-drawer/title-tab';

export function SubtitleDrawer({
  shotId,
  options,
  onClose,
}: {
  shotId: string;
  options: any;
  onClose: () => void;
}) {
  const {
    project, addSubtitleToShot, updateSubtitleInShot, removeSubtitleFromShot,
    subtitleStyle, updateSubtitleStyle,
    titleStyle, updateTitleStyle,
    highlightWords, setHighlightWords,
    forbiddenWords, setForbiddenWords,
    openDrawer,
  } = useMixcutStore(
    useShallow((s) => ({
      project: s.project, addSubtitleToShot: s.addSubtitleToShot,
      updateSubtitleInShot: s.updateSubtitleInShot, removeSubtitleFromShot: s.removeSubtitleFromShot,
      subtitleStyle: s.subtitleStyle, updateSubtitleStyle: s.updateSubtitleStyle,
      titleStyle: s.titleStyle, updateTitleStyle: s.updateTitleStyle,
      highlightWords: s.highlightWords, setHighlightWords: s.setHighlightWords,
      forbiddenWords: s.forbiddenWords, setForbiddenWords: s.setForbiddenWords,
      openDrawer: s.openDrawer,
    })),
  );

  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'title'>('content');

  const shotGroup = project.shotGroups.find((g) => g.id === shotId);
  if (!shotGroup) return null;

  const subtitleStyles = options?.subtitleStyles || [];
  const bubbleStyles = options?.bubbleStyles || [];
  const currentIdx = project.shotGroups.findIndex((g) => g.id === shotId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[680px] max-w-full animate-in slide-in-from-right duration-300">
        {/* Phone preview */}
        <div className="flex w-[220px] shrink-0 flex-col items-center justify-center bg-gray-900 p-4">
          <div
            className="relative w-full overflow-hidden rounded-xl border border-gray-700 bg-black"
            style={{ aspectRatio: '9/16' }}
          >
            {/* Title preview */}
            {titleStyle.enabled && titleStyle.text && (
              <div
                className="absolute left-2 right-2 text-center pointer-events-none"
                style={{ top: `${titleStyle.y * 100}%` }}
              >
                <span
                  className="drop-shadow-lg"
                  style={{
                    fontSize: Math.max(8, titleStyle.fontSize / 5),
                    color: titleStyle.fontColor,
                    fontWeight: 'bold',
                  }}
                >
                  {titleStyle.text}
                </span>
              </div>
            )}

            {/* Subtitle preview with actual styling */}
            <div
              className="absolute left-2 right-2 text-center pointer-events-none"
              style={{ top: `${subtitleStyle.y * 100}%` }}
            >
              <span
                className="inline-block rounded px-1"
                style={{
                  fontSize: Math.max(8, subtitleStyle.fontSize / 5),
                  color: subtitleStyle.fontColor,
                  opacity: subtitleStyle.fontColorOpacity,
                  fontWeight: subtitleStyle.bold ? 'bold' : 'normal',
                  fontStyle: subtitleStyle.italic ? 'italic' : 'normal',
                  textDecoration: subtitleStyle.underline ? 'underline' : 'none',
                  textShadow: subtitleStyle.outline > 0
                    ? `0 0 ${subtitleStyle.outline}px ${subtitleStyle.outlineColour}, 1px 1px ${subtitleStyle.outline}px ${subtitleStyle.outlineColour}`
                    : 'none',
                }}
              >
                {shotGroup.subtitles[0]?.text || '字幕预览'}
              </span>
            </div>

            {/* Effect badges */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-0.5">
              {subtitleStyle.effectColorStyleId && (
                <span className="rounded bg-pink-500/70 px-1 py-0.5 text-[7px] text-white">花字</span>
              )}
              {subtitleStyle.bubbleStyleId && (
                <span className="rounded bg-cyan-500/70 px-1 py-0.5 text-[7px] text-white">气泡</span>
              )}
            </div>
          </div>
          <p className="mt-2 text-[10px] text-gray-400">实时字幕预览</p>
        </div>

        {/* Config panel */}
        <div className="flex flex-1 flex-col bg-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">添加字幕配音&标题-{shotGroup.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              {currentIdx > 0 && (
                <button
                  onClick={() => openDrawer('subtitle', project.shotGroups[currentIdx - 1].id)}
                  className="rounded border px-2 py-1 text-[11px] hover:bg-accent transition-colors flex items-center gap-0.5"
                >
                  <ChevronLeft size={12} /> 上一个
                </button>
              )}
              {currentIdx < project.shotGroups.length - 1 && (
                <button
                  onClick={() => openDrawer('subtitle', project.shotGroups[currentIdx + 1].id)}
                  className="rounded border px-2 py-1 text-[11px] hover:bg-accent transition-colors flex items-center gap-0.5"
                >
                  下一个 <ChevronRight size={12} />
                </button>
              )}
              <button onClick={onClose} className="rounded p-1 hover:bg-accent">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { key: 'content' as const, label: '文案设置' },
              { key: 'style' as const, label: '字幕设置' },
              { key: 'title' as const, label: '标题设置' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-[12px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'content' && (
              <SubtitleContent
                shotId={shotId}
                subtitles={shotGroup.subtitles}
                onAdd={() => addSubtitleToShot(shotId, { text: '' })}
                onUpdate={(i, data) => updateSubtitleInShot(shotId, i, data)}
                onRemove={(i) => removeSubtitleFromShot(shotId, i)}
                highlightWords={highlightWords}
                setHighlightWords={setHighlightWords}
                forbiddenWords={forbiddenWords}
                setForbiddenWords={setForbiddenWords}
              />
            )}
            {activeTab === 'style' && (
              <SubtitleStyleTab
                style={subtitleStyle}
                onUpdate={updateSubtitleStyle}
                subtitleStyles={subtitleStyles}
                bubbleStyles={bubbleStyles}
              />
            )}
            {activeTab === 'title' && (
              <TitleTab
                titleStyle={titleStyle}
                onUpdate={updateTitleStyle}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <button onClick={onClose} className="rounded-md border px-4 py-1.5 text-sm hover:bg-accent transition-colors">
              取消
            </button>
            <button onClick={onClose} className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors">
              确定
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
