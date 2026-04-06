import type { MixcutPreviewProject } from '../_store/use-mixcut-store';

export function summarizeMixcutPreviewProject(previewProject: MixcutPreviewProject | null) {
  const timeline = previewProject?.timeline || {};
  const videoTracks = Array.isArray(timeline.VideoTracks) ? timeline.VideoTracks : [];
  const audioTracks = Array.isArray(timeline.AudioTracks) ? timeline.AudioTracks : [];
  const subtitleTracks = Array.isArray(timeline.SubtitleTracks) ? timeline.SubtitleTracks : [];

  const clipCount = videoTracks.reduce((total: number, track: any) => {
    const clips = Array.isArray(track?.VideoTrackClips) ? track.VideoTrackClips : [];
    return total + clips.length;
  }, 0);

  return {
    hasTimeline: videoTracks.length > 0 || audioTracks.length > 0 || subtitleTracks.length > 0,
    videoTrackCount: videoTracks.length,
    audioTrackCount: audioTracks.length,
    subtitleTrackCount: subtitleTracks.length,
    clipCount,
    duration: previewProject?.duration || 0,
  };
}
