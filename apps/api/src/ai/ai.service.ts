import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveLlmApiKey } from '../config/env-resolver';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = resolveLlmApiKey({
      LLM_API_KEY: this.config.get<string>('LLM_API_KEY'),
      DASHSCOPE_API_KEY: this.config.get<string>('DASHSCOPE_API_KEY'),
    }) || '';
    this.apiEndpoint = this.config.get(
      'LLM_API_ENDPOINT',
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    );
    this.model = this.config.get('LLM_MODEL', 'qwen-plus');
  }

  async reversePrompt(
    mediaUrl: string,
    type: 'image' | 'video' = 'image',
  ): Promise<{ prompt: string }> {
    if (!this.apiKey) {
      this.logger.warn('LLM API key not configured (set LLM_API_KEY or DASHSCOPE_API_KEY)');
      return { prompt: '无法分析：未配置 LLM API Key' };
    }

    const visionModel = this.config.get('LLM_VISION_MODEL', 'qwen-vl-plus');

    const systemPrompt =
      type === 'image'
        ? `你是一个专业的AI图片分析助手。请仔细分析这张图片，生成一段详细的AI图片生成提示词（prompt），使AI模型能够还原生成类似的图片。

规则：
1. 描述主体内容（人物、物体、场景等）
2. 描述视觉风格（写实、插画、油画等）
3. 描述光线、色调、构图
4. 描述背景和环境细节
5. 只输出提示词本身，不要解释
6. 使用中文输出
7. 控制在200字以内`
        : `你是一个专业的AI视频分析助手。请仔细分析这个视频/截帧，生成一段详细的AI视频生成提示词（prompt），使AI模型能够还原生成类似的视频。

规则：
1. 描述主体内容和动作
2. 描述镜头运动（推拉摇移、跟随等）
3. 描述场景氛围和光线变化
4. 描述画面风格和色调
5. 只输出提示词本身，不要解释
6. 使用中文输出
7. 控制在300字以内`;

    try {
      const content: any[] = [
        { type: 'text', text: '请分析这张图片/视频，生成对应的AI生成提示词。' },
        { type: 'image_url', image_url: { url: mediaUrl } },
      ];

      const res = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: visionModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Vision LLM API error: ${res.status} ${err}`);
        return { prompt: '分析失败，请重试' };
      }

      const data: any = await res.json();
      const prompt =
        data.choices?.[0]?.message?.content?.trim() || '分析失败';
      return { prompt };
    } catch (err) {
      this.logger.error(`Vision LLM API call failed: ${err}`);
      return { prompt: '分析失败，请重试' };
    }
  }

  async generateScript(
    topic: string,
    paragraphs: number = 5,
  ): Promise<{ script: string[] }> {
    if (!this.apiKey) {
      return { script: ['未配置 LLM API Key'] };
    }

    const systemPrompt = `你是一个专业的短视频脚本写手。用户会给你一个主题或关键词，请你据此生成一个短视频混剪脚本。

规则：
1. 生成 ${paragraphs} 个段落（镜头组），每个段落是一个独立的画面描述+旁白文案
2. 每个段落用 --- 分隔
3. 每个段落格式为：第一行是旁白/字幕文案（口播内容），第二行开始是画面描述（给剪辑师参考）
4. 文案要有吸引力，适合抖音/快手等短视频平台
5. 控制每段旁白在30-60字
6. 使用中文
7. 只输出脚本内容，不要输出格式说明`;

    try {
      const res = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `主题：${topic}` },
          ],
          temperature: 0.8,
          max_tokens: 2000,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`LLM API error: ${res.status} ${err}`);
        return { script: ['生成失败，请重试'] };
      }

      const data: any = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim() || '';
      const parts = text.split(/---+/).map((p: string) => p.trim()).filter(Boolean);
      return { script: parts.length > 0 ? parts : [text] };
    } catch (err) {
      this.logger.error(`generateScript failed: ${err}`);
      return { script: ['生成失败，请重试'] };
    }
  }

  async rewriteCopy(
    text: string,
    count: number = 3,
  ): Promise<{ variants: string[] }> {
    if (!this.apiKey) {
      return { variants: [text] };
    }

    const systemPrompt = `你是一个专业的短视频文案改写助手。用户会给你一段文案，请你生成 ${count} 个改写变体。

规则：
1. 保持核心意思不变
2. 每个变体用 --- 分隔
3. 变换表达方式、句式、用词，使每个变体有明显差异
4. 适合短视频平台风格（有吸引力、有节奏感）
5. 只输出改写后的文案，不要编号，不要解释
6. 每个变体长度与原文相近`;

    try {
      const res = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.9,
          max_tokens: 2000,
        }),
      });

      if (!res.ok) {
        return { variants: [text] };
      }

      const data: any = await res.json();
      const result = data.choices?.[0]?.message?.content?.trim() || '';
      const variants = result.split(/---+/).map((v: string) => v.trim()).filter(Boolean);
      return { variants: variants.length > 0 ? variants : [result] };
    } catch (err) {
      this.logger.error(`rewriteCopy failed: ${err}`);
      return { variants: [text] };
    }
  }

  async detectRiskWords(
    text: string,
  ): Promise<{ safe: boolean; risks: { word: string; reason: string }[] }> {
    if (!this.apiKey) {
      return { safe: true, risks: [] };
    }

    const systemPrompt = `你是一个短视频内容合规审核助手。请检查用户提供的文案中是否包含以下类型的风险词：

1. 违禁词（极限用语如"最好"、"第一"、"国家级"等广告违禁词）
2. 敏感词（政治敏感、暴力、色情、歧视等）
3. 虚假宣传词（未经证实的功效声明等）
4. 平台违规词（各短视频平台限流词）

输出格式（JSON 数组）：
[{"word": "风险词", "reason": "原因"}]

如果没有风险词，输出空数组 []。
只输出 JSON，不要其他内容。`;

    try {
      const res = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        return { safe: true, risks: [] };
      }

      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '[]';
      try {
        const jsonMatch = content.match(/\[.*\]/s);
        const risks = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');
        return { safe: risks.length === 0, risks };
      } catch {
        return { safe: true, risks: [] };
      }
    } catch (err) {
      this.logger.error(`detectRiskWords failed: ${err}`);
      return { safe: true, risks: [] };
    }
  }

  async transcribeAudio(audioUrl: string): Promise<{ texts: string[] }> {
    if (!this.apiKey) {
      return { texts: ['未配置 API Key'] };
    }

    try {
      // Step 1: Submit transcription task
      const submitRes = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'X-DashScope-Async': 'enable',
          },
          body: JSON.stringify({
            model: 'paraformer-v2',
            input: { file_urls: [audioUrl] },
            parameters: {
              language_hints: ['zh', 'en'],
              disfluency_removal_enabled: true,
            },
          }),
        },
      );

      if (!submitRes.ok) {
        const err = await submitRes.text();
        this.logger.error(`ASR submit error: ${submitRes.status} ${err}`);
        return { texts: ['语音识别提交失败'] };
      }

      const submitData: any = await submitRes.json();
      const taskId = submitData.output?.task_id;
      if (!taskId) {
        this.logger.error('ASR submit returned no task_id');
        return { texts: ['语音识别提交失败'] };
      }

      // Step 2: Poll for result (max 120s)
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const queryRes = await fetch(
          `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${this.apiKey}` },
          },
        );

        if (!queryRes.ok) continue;

        const queryData: any = await queryRes.json();
        const status = queryData.output?.task_status;

        if (status === 'SUCCEEDED') {
          // Extract transcribed text from results
          const results = queryData.output?.results || [];
          const texts: string[] = [];
          for (const result of results) {
            const transcriptionUrl = result.transcription_url;
            if (!transcriptionUrl) continue;
            try {
              const transRes = await fetch(transcriptionUrl);
              const transData: any = await transRes.json();
              const transcripts = transData.transcripts || [];
              for (const t of transcripts) {
                const sentences = t.sentences || [];
                for (const s of sentences) {
                  if (s.text) texts.push(s.text);
                }
              }
            } catch (e) {
              this.logger.error(`Failed to fetch transcription result: ${e}`);
            }
          }
          return { texts: texts.length > 0 ? texts : ['识别完成但未获取到文字'] };
        }

        if (status === 'FAILED') {
          this.logger.error(`ASR task failed: ${JSON.stringify(queryData.output)}`);
          return { texts: ['语音识别失败'] };
        }
      }

      return { texts: ['语音识别超时'] };
    } catch (err) {
      this.logger.error(`transcribeAudio failed: ${err}`);
      return { texts: ['语音识别失败'] };
    }
  }

  async polishPrompt(
    prompt: string,
    type: 'image' | 'video' = 'image',
  ): Promise<{ polished: string }> {
    if (!this.apiKey) {
      this.logger.warn('LLM API key not configured (set LLM_API_KEY or DASHSCOPE_API_KEY), returning original prompt');
      return { polished: prompt };
    }

    const systemPrompt =
      type === 'image'
        ? `你是一个专业的AI图片生成提示词优化助手。用户会给你一段图片生成的描述，请你优化这段描述，使其更加详细、专业，能够让AI生成更高质量的图片。

规则：
1. 保持用户原始意图不变
2. 补充画面细节（光线、构图、色调、风格等）
3. 使用专业的绘画/摄影术语
4. 输出优化后的提示词，不要输出任何解释
5. 保持中文输出（除非用户原文是英文）
6. 控制在200字以内`
        : `你是一个专业的AI视频生成提示词优化助手。用户会给你一段视频生成的描述，请你优化这段描述，使其更加详细、专业，能够让AI生成更高质量的视频。

规则：
1. 保持用户原始意图不变
2. 补充运动细节（镜头运动、主体动作、节奏等）
3. 描述场景氛围（光线变化、环境细节等）
4. 输出优化后的提示词，不要输出任何解释
5. 保持中文输出（除非用户原文是英文）
6. 控制在300字以内`;

    try {
      const res = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`LLM API error: ${res.status} ${err}`);
        return { polished: prompt };
      }

      const data: any = await res.json();
      const polished =
        data.choices?.[0]?.message?.content?.trim() || prompt;
      return { polished };
    } catch (err) {
      this.logger.error(`LLM API call failed: ${err}`);
      return { polished: prompt };
    }
  }
}
