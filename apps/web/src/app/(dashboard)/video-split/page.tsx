'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { materialApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import {
  Scissors, Upload, Play, Pause, Plus, Trash2, Loader2,
  ChevronLeft, ChevronRight, Film, CheckCircle, SkipForward, SkipBack,
} from 'lucide-react';

interface SplitPoint {
  id: string;
  time: number; // seconds
}

interface Segment {
  id: string;
  start: number;
  end: number;
  name: string;
}

export default function VideoSplitPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [splitMode, setSplitMode] = useState<'manual' | 'even'>('manual');
  const [evenCount, setEvenCount] = useState(3);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('video/')) {
      alert('请选择视频文件');
      return;
    }
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setSplitPoints([]);
    setSegments([]);
    setUploadedCount(0);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const addSplitPoint = () => {
    if (!duration) return;
    const exists = splitPoints.some((p) => Math.abs(p.time - currentTime) < 0.5);
    if (exists) return;
    const newPoint: SplitPoint = {
      id: `sp_${Date.now()}`,
      time: currentTime,
    };
    const updated = [...splitPoints, newPoint].sort((a, b) => a.time - b.time);
    setSplitPoints(updated);
  };

  const removeSplitPoint = (id: string) => {
    setSplitPoints((prev) => prev.filter((p) => p.id !== id));
  };

  const applyEvenSplit = () => {
    if (!duration || evenCount < 2) return;
    const interval = duration / evenCount;
    const points: SplitPoint[] = [];
    for (let i = 1; i < evenCount; i++) {
      points.push({ id: `sp_even_${i}`, time: interval * i });
    }
    setSplitPoints(points);
  };

  // Calculate segments from split points
  useEffect(() => {
    if (!duration) { setSegments([]); return; }
    const times = [0, ...splitPoints.map((p) => p.time), duration];
    const segs: Segment[] = [];
    for (let i = 0; i < times.length - 1; i++) {
      segs.push({
        id: `seg_${i}`,
        start: times[i],
        end: times[i + 1],
        name: `片段_${i + 1}`,
      });
    }
    setSegments(segs);
  }, [splitPoints, duration]);

  const handleUploadSegments = async () => {
    if (!videoFile || segments.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadedCount(0);

    try {
      // Upload the full video file first, then create material entries with segment metadata
      const { url: fileUrl } = await uploadToOSS(videoFile);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        await materialApi.upload({
          name: `${videoFile.name.replace(/\.[^.]+$/, '')}_${seg.name}`,
          type: 'VIDEO',
          url: fileUrl,
          mimeType: videoFile.type,
          metadata: {
            sourceFile: videoFile.name,
            segmentIndex: i,
            startTime: seg.start,
            endTime: seg.end,
            duration: seg.end - seg.start,
          },
        });
        setUploadedCount(i + 1);
        setUploadProgress(Math.round(((i + 1) / segments.length) * 100));
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Scissors size={22} className="text-primary" /> 视频拆分
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          将长视频拆分为多个片段，导入素材库用于混剪
        </p>
      </div>

      {!videoUrl ? (
        /* Upload area */
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/30 p-16 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Upload size={40} className="mb-4 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">点击或拖拽上传视频文件</p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">支持 MP4, MOV, AVI 等常见格式</p>
        </div>
      ) : (
        <>
          {/* Video Player */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="relative bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="mx-auto max-h-[400px] w-full object-contain"
              />
            </div>

            {/* Timeline with split points */}
            <div className="px-4 py-3">
              <div className="relative h-10 mb-2">
                {/* Timeline bar */}
                <div
                  className="absolute top-4 left-0 right-0 h-2 rounded-full bg-muted cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    seekTo(ratio * duration);
                  }}
                >
                  {/* Progress */}
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                {/* Split point markers */}
                {splitPoints.map((point) => (
                  <div
                    key={point.id}
                    className="absolute top-0 -translate-x-1/2 cursor-pointer group"
                    style={{ left: `${(point.time / duration) * 100}%` }}
                    onClick={() => seekTo(point.time)}
                  >
                    <div className="w-0.5 h-10 bg-red-500" />
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-1.5 py-0.5 text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(point.time)}
                    </div>
                  </div>
                ))}
                {/* Current time indicator */}
                <div
                  className="absolute top-2 -translate-x-1/2"
                  style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow" />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => seekTo(Math.max(0, currentTime - 5))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-accent transition-colors"
                  >
                    <SkipBack size={14} />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={() => seekTo(Math.min(duration, currentTime + 5))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-accent transition-colors"
                  >
                    <SkipForward size={14} />
                  </button>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <button
                  onClick={addSplitPoint}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-[12px] font-medium text-white shadow hover:bg-red-600 transition-colors"
                >
                  <Scissors size={12} /> 在此处分割
                </button>
              </div>
            </div>
          </div>

          {/* Split modes */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSplitMode('manual')}
                className={`flex-1 rounded-lg border py-2 text-[12px] transition-all ${
                  splitMode === 'manual'
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                手动分割
              </button>
              <button
                onClick={() => setSplitMode('even')}
                className={`flex-1 rounded-lg border py-2 text-[12px] transition-all ${
                  splitMode === 'even'
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                均匀分割
              </button>
            </div>

            {splitMode === 'even' && (
              <div className="flex items-center gap-3 mb-3">
                <label className="text-[11px] text-muted-foreground">分割数量</label>
                <input
                  type="range"
                  min={2}
                  max={20}
                  value={evenCount}
                  onChange={(e) => setEvenCount(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="w-8 text-right text-[12px] font-medium tabular-nums">{evenCount}</span>
                <button
                  onClick={applyEvenSplit}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[11px] text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  应用
                </button>
              </div>
            )}

            {/* Split points list */}
            {splitPoints.length > 0 && (
              <div className="mb-3">
                <label className="mb-1.5 block text-[10px] font-medium text-muted-foreground">分割点 ({splitPoints.length})</label>
                <div className="flex flex-wrap gap-1.5">
                  {splitPoints.map((point) => (
                    <div
                      key={point.id}
                      className="group flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px]"
                    >
                      <span className="text-red-600 tabular-nums cursor-pointer hover:underline" onClick={() => seekTo(point.time)}>
                        {formatTime(point.time)}
                      </span>
                      <button
                        onClick={() => removeSplitPoint(point.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Segments preview */}
            <label className="mb-1.5 block text-[10px] font-medium text-muted-foreground">片段预览 ({segments.length})</label>
            <div className="space-y-1.5">
              {segments.map((seg, idx) => (
                <div
                  key={seg.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/30 transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <span className="text-[11px] font-medium">{seg.name}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {formatTime(seg.start)} → {formatTime(seg.end)}
                    </span>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {formatTime(seg.end - seg.start)}
                  </span>
                  <button
                    onClick={() => seekTo(seg.start)}
                    className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
                  >
                    <Play size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upload button */}
          <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
            <div>
              <p className="text-[12px] font-medium">
                {segments.length} 个片段准备导入素材库
              </p>
              <p className="text-[10px] text-muted-foreground">
                导入后可在混剪项目中使用这些片段
              </p>
            </div>
            <button
              onClick={handleUploadSegments}
              disabled={uploading || segments.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  导入中 {uploadedCount}/{segments.length}
                </>
              ) : uploadedCount === segments.length && uploadedCount > 0 ? (
                <>
                  <CheckCircle size={14} /> 已导入
                </>
              ) : (
                <>
                  <Upload size={14} /> 导入素材库
                </>
              )}
            </button>
          </div>

          {/* Change video */}
          <button
            onClick={() => {
              setVideoUrl('');
              setVideoFile(null);
              setSplitPoints([]);
              setSegments([]);
              setUploadedCount(0);
            }}
            className="w-full rounded-lg border py-2 text-[12px] text-muted-foreground hover:bg-accent transition-colors"
          >
            更换视频
          </button>
        </>
      )}
    </div>
  );
}
