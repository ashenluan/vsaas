# Digital Human VideoRetalk Runbook

## Scope

This runbook covers the upgraded single-video digital-human flow:

- `标准口播` -> `ims`
- `照片开口说话` -> `wan-photo`
- `已有视频重驱动` -> `videoretalk`
- `动作迁移` -> `wan-motion`

It focuses on runtime limits, persistence rules, and operator guidance for Aliyun-backed jobs.

## Runtime Rules

### Queue Concurrency

- `digital-human-video` worker concurrency is intentionally pinned to `1`.
- Reason:
  - Wan and VideoRetalk are remote async video jobs with stricter upstream capacity than local queue throughput.
  - Conservative concurrency reduces false timeouts, throttling, and provider-side backpressure.

### Provider-Aware Timeout

- `ims`: 15 minutes
- `wan-photo`: 20 minutes
- `wan-motion`: 20 minutes
- `videoretalk`: 25 minutes

These values are set in the processor to better reflect expected upstream completion windows.

## Output Persistence Policy

### Temporary URL Handling

- Aliyun/DashScope video outputs may be temporary.
- Temporary provider URLs must never be treated as the only durable result.

### Required Behavior

For `wan-photo`, `wan-motion`, and `videoretalk`:

1. Poll provider task until success.
2. Read provider result URL as `providerTempUrl`.
3. Copy the media into OSS.
4. Persist both:
   - `videoUrl`: signed OSS URL for playback
   - `durableVideoUrl`: unsigned OSS object URL
   - `providerTempUrl`: source provider URL for diagnostics

### Stored Output Metadata

The normalized `generation.output` payload may include:

- `engine`
- `resolvedModel`
- `videoUrl`
- `durableVideoUrl`
- `providerTempUrl`
- `providerTaskId`
- `providerRequestId`
- `duration`
- `aspectRatio`
- `fps`
- `size`
- `warnings`
- `fallbackSuggested`

## Media Preflight Rules

### Current Coverage

Server-side preflight currently validates:

- remote URL accessibility
- supported file extensions
- request contract compatibility

For `videoretalk`:

- video: `mp4`, `avi`, `mov`
- audio: `wav`, `mp3`, `aac`
- ref image: `jpeg`, `jpg`, `png`, `bmp`, `webp`

### Current Limitation

Deep probe is not yet enabled in the runtime environment, so the system currently warns instead of hard-validating:

- duration
- fps
- codec
- detailed resolution metadata

User-facing warning:

- `当前环境未启用深度媒体探测，已跳过时长、帧率和编码校验`

## Common Aliyun Failure Codes

### VideoRetalk

- `InvalidFile.FPS`
  - Meaning: source video FPS is out of range.
  - User-facing translation: input video must be `15-60fps`.

- `InvalidFile.Resolution`
  - Meaning: source video dimensions are unsupported.
  - User-facing translation: side length must be within provider-supported range.

- `InvalidFile.Duration`
  - Meaning: source video or audio duration is unsupported.
  - Operator action: verify uploaded source asset duration before retry.

- `InvalidFile.FaceNotMatch`
  - Meaning: reference image does not match the source video face.
  - Operator action: remove mismatched reference image or upload a better aligned face image.

- `InvalidURL.ConnectionRefused` / `InvalidURL.Timeout`
  - Meaning: provider cannot fetch remote media.
  - Operator action: verify the asset is public, reachable, and not time-limited.

### Wan

- `Throttling`
  - Meaning: upstream rate/concurrency pressure.
  - Operator action: avoid raising local queue concurrency; retry later.

- `DataInspectionFailed`
  - Meaning: provider moderation failed.
  - Operator action: replace non-compliant source media or audio.

- `Arrearage`
  - Meaning: Aliyun account balance issue.
  - Operator action: verify billing status before retrying jobs.

## Operational Checklist

### Before Release

- Verify OSS credentials are valid.
- Verify `OSS_REGION` matches the intended regional routing.
- Verify `DASHSCOPE_API_KEY` is configured.
- Verify `aliyun_videoretalk` provider toggle is enabled only when upstream access is confirmed.

### Manual E2E Cases

- `ims` text drive
- `ims` audio drive
- `wan-photo` text drive
- `wan-photo` audio drive
- `wan-motion` video drive
- `videoretalk` source video + audio drive
- invalid remote URL rejection
- unsupported VideoRetalk extension rejection
- expired or inaccessible provider asset handling

### Expected Result Checks

- Job status reaches `COMPLETED`.
- `generation.output.videoUrl` points to signed OSS playback URL.
- `generation.output.durableVideoUrl` is present for Wan/VideoRetalk jobs.
- `generation.output.providerTempUrl` is preserved for diagnostics.
- `generation.output.engine` and `resolvedModel` match the selected flow.

## Known Gaps

- No deep media probe yet for duration/fps/codec hard enforcement.
- No automated live Aliyun E2E in CI.
- Frontend preflight panel is local-summary only; it does not call backend preflight ahead of submit.
