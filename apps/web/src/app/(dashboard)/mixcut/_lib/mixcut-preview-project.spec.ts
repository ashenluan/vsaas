import { describe, expect, it } from 'vitest';
import { summarizeMixcutPreviewProject } from './mixcut-preview-project';

describe('summarizeMixcutPreviewProject', () => {
  it('counts tracks and clips from an IMS preview timeline', () => {
    const summary = summarizeMixcutPreviewProject({
      projectId: 'preview-project-1',
      duration: 18.5,
      timeline: {
        VideoTracks: [
          {
            VideoTrackClips: [{ MediaId: 'media-1' }, { MediaId: 'media-2' }],
          },
          {
            VideoTrackClips: [{ MediaId: 'media-3' }],
          },
        ],
        AudioTracks: [{ AudioTrackClips: [{ MediaId: 'audio-1' }] }],
        SubtitleTracks: [{ SubtitleTrackClips: [{ Text: '字幕' }] }],
      },
    } as any);

    expect(summary).toEqual({
      hasTimeline: true,
      videoTrackCount: 2,
      audioTrackCount: 1,
      subtitleTrackCount: 1,
      clipCount: 3,
      duration: 18.5,
    });
  });

  it('returns an empty summary when preview data is missing', () => {
    const summary = summarizeMixcutPreviewProject(null);

    expect(summary).toEqual({
      hasTimeline: false,
      videoTrackCount: 0,
      audioTrackCount: 0,
      subtitleTrackCount: 0,
      clipCount: 0,
      duration: 0,
    });
  });
});
