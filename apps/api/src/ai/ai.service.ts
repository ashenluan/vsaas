import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('LLM_API_KEY', '');
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
      this.logger.warn('LLM_API_KEY not configured');
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

  async polishPrompt(
    prompt: string,
    type: 'image' | 'video' = 'image',
  ): Promise<{ polished: string }> {
    if (!this.apiKey) {
      this.logger.warn('LLM_API_KEY not configured, returning original prompt');
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
