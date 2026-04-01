import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import * as crypto from 'crypto';

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

  private getHeaders(): Record<string, string> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY') || '';
    const workspaceId = this.config.get<string>('DASHSCOPE_WORKSPACE_ID') || '';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (workspaceId) {
      headers['X-DashScope-WorkSpace'] = workspaceId;
    }
    return headers;
  }

  async cloneVoice(audioUrl: string, preferredName: string): Promise<{ voiceId: string; status: string }> {
    this.logger.log(`Cloning voice: ${preferredName}`);

    const headers = this.getHeaders();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization',
      {
        method: 'POST',
        headers,
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

  // CosyVoice v1 system voices (use cosyvoice-v2 model with _v2 suffix)
  private static readonly COSYVOICE_V1_VOICES = new Set([
    'longwan', 'longcheng', 'longhua', 'longxiaochun', 'longxiaoxia',
    'longxiaocheng', 'longxiaobai', 'longlaotie', 'longshu', 'longshuo',
    'longjing', 'longmiao', 'longyue', 'longyuan', 'longfei',
    'longjielidou', 'longtong', 'longxiang', 'loongstella', 'loongbella',
  ]);

  // CosyVoice v2 voices (use cosyvoice-v2 model, ID already has _v2 suffix)
  private static readonly COSYVOICE_V2_VOICES = new Set([
    'longcheng_v2', 'longhua_v2', 'longshu_v2', 'loongbella_v2',
    'longwan_v2', 'longxiaochun_v2', 'longxiaoxia_v2',
  ]);

  // IMS standard voices (use cosyvoice-v1 model, voice ID as-is)
  private static readonly IMS_STANDARD_VOICES = new Set([
    'zhimiao_emo', 'zhimi_emo', 'zhibei_emo', 'zhiyan_emo', 'zhitian_emo',
    'zhitian', 'zhiqing', 'zhichu', 'zhide', 'zhifei', 'zhijia', 'zhilun',
    'zhinan', 'zhiqi', 'zhiqian', 'zhiru', 'zhiwei', 'zhixiang',
    'abin', 'zhixiaobai', 'zhixiaoxia',
    'zhiya', 'aixia', 'aiyue', 'aiya', 'aijing', 'aimei', 'siyue', 'aina',
    'aishuo', 'aiyu', 'xiaomei', 'yina', 'sijing',
    'zhiyuan', 'zhiyue', 'zhistella', 'zhigui', 'zhishuo', 'zhida',
    'aiqi', 'aicheng', 'aijia', 'siqi', 'sijia', 'mashu', 'yuer', 'ruoxi',
    'aida', 'sicheng', 'ninger', 'xiaoyun', 'xiaogang', 'ruilin',
    'zhimao', 'laomei', 'laotie', 'xiaoxian', 'guijie', 'stella',
    'maoxiaomei', 'qiaowei', 'ailun', 'aifei', 'yaqun', 'stanley', 'kenny', 'rosa',
    'aitong', 'aiwei', 'jielidou', 'xiaobei', 'sitong', 'aibao',
    'perla', 'camila', 'masha', 'kyong', 'tien', 'tomoka', 'tomoya',
    'indah', 'farah', 'tala',
    'ava', 'luca', 'luna', 'emily', 'eric', 'annie', 'andy', 'abby',
    'lydia', 'olivia', 'wendy', 'harry',
    'cuijie', 'kelly', 'jiajia', 'dahu', 'aikan', 'taozi', 'qingqing',
    'xiaoze', 'shanshan', 'chuangirl',
  ]);

  async synthesizeSpeech(text: string, voiceId: string): Promise<{ audioUrl: string }> {
    let model: string;
    let wsVoiceId: string;

    if (QwenVoiceProvider.COSYVOICE_V2_VOICES.has(voiceId)) {
      // CosyVoice v2 voices: already have _v2 suffix
      model = 'cosyvoice-v2';
      wsVoiceId = voiceId;
    } else if (QwenVoiceProvider.COSYVOICE_V1_VOICES.has(voiceId)) {
      // CosyVoice v1 voices: add _v2 suffix for cosyvoice-v2 model
      model = 'cosyvoice-v2';
      wsVoiceId = `${voiceId}_v2`;
    } else if (QwenVoiceProvider.IMS_STANDARD_VOICES.has(voiceId)) {
      // IMS standard voices: use cosyvoice-v1 model with voice ID as-is
      model = 'cosyvoice-v1';
      wsVoiceId = voiceId;
    } else {
      // Cloned voices: use cosyvoice-v3.5-plus
      model = 'cosyvoice-v3.5-plus';
      wsVoiceId = voiceId;
    }

    this.logger.log(`Synthesizing speech via WebSocket (model: ${model}, voice: ${wsVoiceId}): ${text.slice(0, 50)}...`);

    const audioBuffer = await this.synthesizeViaWebSocket(model, text, wsVoiceId);
    this.logger.log(`TTS audio received: ${audioBuffer.length} bytes`);

    const audioUrl = await this.uploadAudioToOSS(audioBuffer);
    this.logger.log(`TTS audio uploaded: ${audioUrl.slice(0, 80)}...`);

    return { audioUrl };
  }

  // CosyVoice only supports WebSocket, not HTTP REST.
  // Docs: https://help.aliyun.com/zh/model-studio/cosyvoice-websocket-api
  private synthesizeViaWebSocket(model: string, text: string, voiceId: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const apiKey = this.config.get<string>('DASHSCOPE_API_KEY') || '';
      const workspaceId = this.config.get<string>('DASHSCOPE_WORKSPACE_ID') || '';
      const wsUrl = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
      };
      if (workspaceId) {
        headers['X-DashScope-WorkSpace'] = workspaceId;
      }

      const ws = new WebSocket(wsUrl, { headers });
      const taskId = crypto.randomUUID().replace(/-/g, '');
      const audioChunks: Buffer[] = [];
      let settled = false;

      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          reject(new Error('TTS WebSocket timeout (60s)'));
        }
      }, 60000);

      const cleanup = () => clearTimeout(timeoutId);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
          payload: {
            task_group: 'audio',
            task: 'tts',
            function: 'SpeechSynthesizer',
            model,
            parameters: {
              text_type: 'PlainText',
              voice: voiceId,
              format: 'mp3',
              sample_rate: 22050,
              volume: 50,
              rate: 1,
              pitch: 1,
            },
            input: {},
          },
        }));
      });

      ws.on('message', (data: Buffer, isBinary: boolean) => {
        if (isBinary) {
          audioChunks.push(Buffer.from(data));
          return;
        }

        try {
          const event = JSON.parse(data.toString());
          const eventType = event.header?.event;

          if (eventType === 'task-started') {
            // Send text
            ws.send(JSON.stringify({
              header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
              payload: { input: { text } },
            }));
            // Signal end of text
            ws.send(JSON.stringify({
              header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
              payload: { input: {} },
            }));
          } else if (eventType === 'task-finished') {
            cleanup();
            ws.close();
            if (!settled) {
              settled = true;
              const buffer = Buffer.concat(audioChunks);
              if (buffer.length === 0) {
                reject(new Error('TTS returned empty audio'));
              } else {
                resolve(buffer);
              }
            }
          } else if (eventType === 'task-failed') {
            cleanup();
            ws.close();
            if (!settled) {
              settled = true;
              reject(new Error(`TTS failed: ${event.header?.error_message || 'Unknown error'}`));
            }
          }
        } catch {
          // ignore JSON parse errors on binary-like frames
        }
      });

      ws.on('error', (err: Error) => {
        cleanup();
        if (!settled) {
          settled = true;
          reject(new Error(`TTS WebSocket error: ${err.message}`));
        }
      });

      ws.on('close', () => {
        cleanup();
        if (!settled) {
          settled = true;
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(new Error('TTS WebSocket closed before receiving audio'));
          }
        }
      });
    });
  }

  private async uploadAudioToOSS(audioBuffer: Buffer): Promise<string> {
    const bucket = this.config.get<string>('OSS_BUCKET', 'vsaas');
    const region = this.config.get<string>('OSS_REGION', 'oss-cn-hangzhou');
    const accessKeyId = this.config.get<string>('ALIYUN_ACCESS_KEY_ID', '');
    const accessKeySecret = this.config.get<string>('ALIYUN_ACCESS_KEY_SECRET', '');
    const host = `https://${bucket}.${region}.aliyuncs.com`;

    // Generate unique key
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const rand = crypto.randomBytes(8).toString('hex');
    const key = `tts/${dateStr}/${rand}.mp3`;

    // Signed PUT URL
    const contentType = 'audio/mpeg';
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const putSign = crypto
      .createHmac('sha1', accessKeySecret)
      .update(`PUT\n\n${contentType}\n${expires}\n/${bucket}/${key}`)
      .digest('base64');
    const putUrl = `${host}/${key}?OSSAccessKeyId=${encodeURIComponent(accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(putSign)}`;

    const resp = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: audioBuffer,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`OSS upload failed: ${resp.status} ${errText.slice(0, 200)}`);
    }

    // Bucket is public-read, return plain URL (no signature needed)
    // DashScope S2V API may reject URLs with query parameters
    return `${host}/${key}`;
  }
}
