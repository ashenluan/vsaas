import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { QwenVoiceProvider } from './qwen-voice.provider';

describe('QwenVoiceProvider.synthesizeSpeech', () => {
  let provider: QwenVoiceProvider;
  let synthesizeViaWebSocket: ReturnType<typeof vi.spyOn>;
  let uploadAudioToOSS: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new QwenVoiceProvider(new ConfigService());
    synthesizeViaWebSocket = vi
      .spyOn(provider as any, 'synthesizeViaWebSocket')
      .mockResolvedValue(Buffer.from('audio'));
    uploadAudioToOSS = vi
      .spyOn(provider as any, 'uploadAudioToOSS')
      .mockResolvedValue('https://example.com/audio.mp3');
  });

  it('passes normalized voice options into websocket synthesis', async () => {
    const result = await provider.synthesizeSpeech('你好，世界', 'ava', {
      speechRate: 3,
      pitchRate: 0.1,
      volume: 120,
    });

    expect(synthesizeViaWebSocket).toHaveBeenCalledWith(
      'sambert-ava-v1',
      '你好，世界',
      'ava',
      {
        speechRate: 2,
        pitchRate: 0.5,
        volume: 100,
      },
    );
    expect(uploadAudioToOSS).toHaveBeenCalledWith(Buffer.from('audio'));
    expect(result).toEqual({ audioUrl: 'https://example.com/audio.mp3' });
  });

  it('uses default synthesis options when none are provided', async () => {
    await provider.synthesizeSpeech('自定义声音测试', 'custom-voice-id');

    expect(synthesizeViaWebSocket).toHaveBeenCalledWith(
      'cosyvoice-v3.5-plus',
      '自定义声音测试',
      'custom-voice-id',
      {
        speechRate: 1,
        pitchRate: 1,
        volume: 50,
      },
    );
  });
});
