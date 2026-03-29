import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VoiceProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  cloneVoice(audioUrl: string, name: string): Promise<{ voiceId: string; status: string }>;
  synthesizeSpeech(text: string, voiceId: string): Promise<{ audioUrl: string }>;
}

@Injectable()
export class QwenVoiceProvider implements VoiceProvider {
  readonly providerId = 'qwen-voice';
  readonly displayName = 'CosyVoice 声音克隆';
  private readonly logger = new Logger(QwenVoiceProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('DASHSCOPE_API_KEY');
  }

  async cloneVoice(audioUrl: string, preferredName: string): Promise<{ voiceId: string; status: string }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY') || '';

    this.logger.log(`Cloning voice: ${preferredName}`);

    // CosyVoice voice cloning API
    // Docs: https://help.aliyun.com/zh/model-studio/cosyvoice-clone-design-api
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'voice-enrollment',
          input: {
            action: 'create_voice',
            target_model: 'cosyvoice-v3.5-plus',
            prefix: preferredName,
            url: audioUrl,
          },
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(`Voice cloning error: ${data.message || data.code || response.statusText}`);
    }

    return {
      voiceId: data.output?.voice || data.output?.voice_id || '',
      status: data.output?.status || 'processing',
    };
  }

  async synthesizeSpeech(text: string, voiceId: string): Promise<{ audioUrl: string }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY') || '';

    this.logger.log(`Synthesizing speech with voice ${voiceId}: ${text.slice(0, 50)}...`);

    // CosyVoice TTS API
    // Docs: https://help.aliyun.com/zh/model-studio/cosyvoice-tts-api
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/generation',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'cosyvoice-v3.5-plus',
          input: { text },
          parameters: { voice: voiceId },
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(`TTS error: ${data.message || data.code || response.statusText}`);
    }

    // Async call returns task_id, need to poll for result
    if (data.output?.task_id) {
      return this.pollTtsResult(apiKey, data.output.task_id);
    }

    return {
      audioUrl: data.output?.audio_url || '',
    };
  }

  private async pollTtsResult(apiKey: string, taskId: string): Promise<{ audioUrl: string }> {
    const maxAttempts = 30;
    const interval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      const response = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } },
      );

      const data: any = await response.json();
      const status = data.output?.task_status;

      if (status === 'SUCCEEDED') {
        return { audioUrl: data.output?.audio_url || '' };
      }
      if (status === 'FAILED') {
        throw new Error(`TTS task failed: ${data.output?.message || 'Unknown error'}`);
      }
    }

    throw new Error('TTS task timed out');
  }
}
