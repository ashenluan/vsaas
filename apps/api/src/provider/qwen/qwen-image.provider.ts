import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageProvider } from '../provider.registry';
import { retryFetch } from '../retry-fetch';

@Injectable()
export class QwenImageProvider implements ImageProvider {
  readonly providerId = 'qwen';
  readonly displayName = '通义万相';
  private readonly logger = new Logger(QwenImageProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('DASHSCOPE_API_KEY');
  }

  estimateCost(request: any): number {
    return (request.count ?? 1) * 5;
  }

  async generateImage(request: any): Promise<any> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY') || '';
    const baseUrl = this.config.get<string>(
      'DASHSCOPE_BASE_URL',
      'https://dashscope.aliyuncs.com/api/v1',
    ) || 'https://dashscope.aliyuncs.com/api/v1';

    // 高级图片类型路由到对应 API
    const advancedType = request.type as string | undefined;
    if (advancedType && ['STYLE_COPY', 'TEXT_EDIT', 'INPAINT', 'MULTI_FUSION', 'HANDHELD_PRODUCT', 'VIRTUAL_TRYON'].includes(advancedType)) {
      return this.generateAdvanced(apiKey, baseUrl, request);
    }

    const model = request.model || 'wan2.6-t2i';
    this.logger.log(`Generating image with ${model}: ${request.prompt?.slice(0, 80)}`);

    // wan2.6 supports sync call via multimodal-generation endpoint
    // wan2.5 and below only support async call via image-generation endpoint
    const isWan26 = model.startsWith('wan2.6');

    if (isWan26) {
      return this.generateSync(apiKey, baseUrl, model, request);
    } else {
      return this.generateAsync(apiKey, baseUrl, model, request);
    }
  }

  private async generateSync(apiKey: string, baseUrl: string, model: string, request: any) {
    const response = await retryFetch(
      `${baseUrl}/services/aigc/multimodal-generation/generation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: {
            messages: [
              {
                role: 'user',
                content: [{ text: request.prompt }],
              },
            ],
          },
          parameters: {
            negative_prompt: request.negativePrompt || undefined,
            size: request.width && request.height
              ? `${request.width}*${request.height}`
              : '1280*1280',
            n: request.count ?? 1,
            seed: request.seed || undefined,
            prompt_extend: true,
            watermark: false,
          },
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(`Qwen API error: ${data.message || data.code || response.statusText}`);
    }

    // Sync response returns images directly in output.choices
    const images = data.output?.choices?.map((choice: any) => ({
      url: choice.message?.content?.find((c: any) => c.type === 'image')?.image,
    })).filter((img: any) => img.url) ?? [];

    return {
      images,
      provider: this.providerId,
      modelId: model,
      requestId: data.request_id,
      usage: data.usage,
    };
  }

  private async generateAsync(apiKey: string, baseUrl: string, model: string, request: any) {
    const response = await retryFetch(
      `${baseUrl}/services/aigc/image-generation/generation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model,
          input: {
            messages: [
              {
                role: 'user',
                content: [{ text: request.prompt }],
              },
            ],
          },
          parameters: {
            negative_prompt: request.negativePrompt || undefined,
            size: request.width && request.height
              ? `${request.width}*${request.height}`
              : '1280*1280',
            n: request.count ?? 1,
            seed: request.seed || undefined,
            prompt_extend: true,
            watermark: false,
          },
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(`Qwen API error: ${data.message || data.code || response.statusText}`);
    }

    return {
      taskId: data.output?.task_id,
      status: data.output?.task_status,
      provider: this.providerId,
      modelId: model,
      requestId: data.request_id,
    };
  }

  /**
   * 高级图片生成：使用 wanx2.1-imageedit 和其他专用 API
   * 支持：一键仿图、无损改字/水印去除、局部编辑、多图融合、手持产品、一键换装
   */
  private async generateAdvanced(apiKey: string, baseUrl: string, request: any): Promise<any> {
    const advancedType = request.type as string;
    this.logger.log(`Advanced image generation (${advancedType}): ${(request.prompt || '').slice(0, 80)}`);

    // 映射高级类型到 wanx2.1-imageedit 的 function 参数
    const typeMapping: Record<string, { model: string; fn: string; buildInput: () => any }> = {
      STYLE_COPY: {
        model: 'wanx2.1-imageedit',
        fn: 'stylization_all',
        buildInput: () => ({
          prompt: request.prompt || '保持原图风格',
          function: 'stylization_all',
          base_image_url: request.referenceImage || request.sourceImage,
        }),
      },
      TEXT_EDIT: {
        model: 'wanx2.1-imageedit',
        fn: 'remove_watermark',
        buildInput: () => ({
          prompt: request.textEdits?.map((e: any) => `将"${e.original}"替换为"${e.replacement}"`).join('；') || request.prompt || '修改文字',
          function: 'description_edit',
          base_image_url: request.sourceImage || request.referenceImage,
        }),
      },
      INPAINT: {
        model: 'wanx2.1-imageedit',
        fn: 'description_edit_with_mask',
        buildInput: () => ({
          prompt: request.prompt || '修复该区域',
          function: request.maskImage ? 'description_edit_with_mask' : 'description_edit',
          base_image_url: request.sourceImage || request.referenceImage,
          ...(request.maskImage && { mask_image_url: request.maskImage }),
        }),
      },
      MULTI_FUSION: {
        model: 'wanx2.1-imageedit',
        fn: 'description_edit',
        buildInput: () => ({
          prompt: request.prompt || '将多张图片融合',
          function: 'description_edit',
          base_image_url: request.images?.[0] || request.referenceImage,
          ...(request.images?.length > 1 && { ref_image_url: request.images[1] }),
        }),
      },
      HANDHELD_PRODUCT: {
        model: 'wanx2.1-imageedit',
        fn: 'description_edit',
        buildInput: () => ({
          prompt: request.prompt || '将产品自然地放在人物手中',
          function: 'description_edit',
          base_image_url: request.personImage || request.referenceImage,
          ref_image_url: request.productImage,
        }),
      },
      VIRTUAL_TRYON: {
        model: 'wanx2.1-imageedit',
        fn: 'description_edit',
        buildInput: () => ({
          prompt: request.prompt || '将服装穿在人物身上，保持自然',
          function: 'description_edit',
          base_image_url: request.personImage || request.referenceImage,
          ref_image_url: request.clothingImage,
        }),
      },
    };

    const mapping = typeMapping[advancedType];
    if (!mapping) {
      throw new Error(`Unsupported advanced image type: ${advancedType}`);
    }

    const inputData = mapping.buildInput();

    const response = await retryFetch(
      `${baseUrl}/services/aigc/image2image/image-synthesis`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: mapping.model,
          input: inputData,
          parameters: {
            n: request.count ?? 1,
            ...(request.strength !== undefined && { strength: request.strength }),
          },
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(`Qwen advanced image API error: ${data.message || data.code || response.statusText}`);
    }

    return {
      taskId: data.output?.task_id,
      status: data.output?.task_status,
      provider: this.providerId,
      modelId: mapping.model,
      requestId: data.request_id,
    };
  }

  async checkTaskStatus(taskId: string): Promise<any> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY') || '';
    const baseUrl = this.config.get<string>(
      'DASHSCOPE_BASE_URL',
      'https://dashscope.aliyuncs.com/api/v1',
    ) || 'https://dashscope.aliyuncs.com/api/v1';

    const response = await retryFetch(`${baseUrl}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data: any = await response.json();
    const status = data.output?.task_status;

    // Extract images from completed task
    const images = data.output?.choices?.map((choice: any) => ({
      url: choice.message?.content?.find((c: any) => c.type === 'image')?.image,
    })).filter((img: any) => img.url) ?? [];

    return {
      taskId,
      status,
      images: status === 'SUCCEEDED' ? images : [],
      usage: data.usage,
      requestId: data.request_id,
    };
  }
}
