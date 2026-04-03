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
    if (advancedType && ['STYLE_COPY', 'TEXT_EDIT', 'INPAINT', 'IMAGE_EDIT', 'MULTI_FUSION', 'HANDHELD_PRODUCT', 'VIRTUAL_TRYON'].includes(advancedType)) {
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
            prompt_extend: request.promptExtend !== undefined ? request.promptExtend : true,
            watermark: false,
          },
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(this.translateError(data.code, data.message || response.statusText));
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
            prompt_extend: request.promptExtend !== undefined ? request.promptExtend : true,
            watermark: false,
          },
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(this.translateError(data.code, data.message || response.statusText));
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

    // IMAGE_EDIT uses wan2.7 multimodal-generation endpoint (different from wanx2.1-imageedit)
    if (advancedType === 'IMAGE_EDIT') {
      return this.generateImageEdit(apiKey, baseUrl, request);
    }

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
        model: request.tryonModel || 'aitryon',
        fn: 'aitryon',
        buildInput: () => {
          const input: any = {
            person_image_url: request.personImage || request.referenceImage,
          };
          // Support new top/bottom garment slots, fall back to legacy clothingImage
          if (request.topGarmentUrl) input.top_garment_url = request.topGarmentUrl;
          if (request.bottomGarmentUrl) input.bottom_garment_url = request.bottomGarmentUrl;
          if (!request.topGarmentUrl && !request.bottomGarmentUrl && request.clothingImage) {
            input.top_garment_url = request.clothingImage;
          }
          return input;
        },
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
            ...(advancedType !== 'VIRTUAL_TRYON' && { n: request.count ?? 1 }),
            ...(request.strength !== undefined && { strength: request.strength }),
            ...(advancedType === 'VIRTUAL_TRYON' && request.resolution !== undefined && { resolution: request.resolution }),
            ...(advancedType === 'VIRTUAL_TRYON' && request.restoreFace !== undefined && { restore_face: request.restoreFace }),
          },
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(this.translateError(data.code, data.message || response.statusText));
    }

    return {
      taskId: data.output?.task_id,
      status: data.output?.task_status,
      provider: this.providerId,
      modelId: mapping.model,
      requestId: data.request_id,
    };
  }

  /**
   * 图像编辑：使用 wan2.7-image / wan2.7-image-pro
   * 通过 multimodal-generation 端点，支持文字指令编辑和 bbox 区域编辑
   */
  private async generateImageEdit(apiKey: string, baseUrl: string, request: any): Promise<any> {
    const model = request.editModel || 'wan2.7-image';
    this.logger.log(`Image edit with ${model}: ${(request.prompt || '').slice(0, 80)}`);

    const content: any[] = [];
    const sourceImg = request.sourceImage || request.referenceImage;
    if (sourceImg) {
      content.push({ image: sourceImg });
    }
    content.push({ text: request.prompt || '编辑这张图片' });

    const parameters: any = {
      n: request.count ?? 1,
      size: request.editSize || '2K',
      watermark: false,
    };
    if (request.bboxList?.length) {
      parameters.bbox_list = request.bboxList;
    }

    const response = await retryFetch(
      `${baseUrl}/services/aigc/multimodal-generation/generation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model,
          input: { messages: [{ role: 'user', content }] },
          parameters,
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(this.translateError(data.code, data.message || response.statusText));
    }

    return {
      taskId: data.output?.task_id,
      status: data.output?.task_status,
      provider: this.providerId,
      modelId: model,
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

    // Handle terminal non-success states
    if (status === 'CANCELED') {
      return {
        taskId,
        status,
        images: [],
        errorCode: 'CANCELED',
        errorMessage: '任务已被取消',
      };
    }
    if (status === 'UNKNOWN') {
      return {
        taskId,
        status,
        images: [],
        errorCode: 'UNKNOWN',
        errorMessage: '任务已过期或不存在',
      };
    }
    if (status === 'FAILED') {
      const errCode = data.output?.code || '';
      const errMsg = data.output?.message || '';
      return {
        taskId,
        status,
        images: [],
        errorCode: errCode,
        errorMessage: this.translateError(errCode, errMsg),
        usage: data.usage,
        requestId: data.request_id,
      };
    }

    // Extract images from completed task — handle multiple response formats
    let images: { url: string }[] = [];

    if (status === 'SUCCEEDED') {
      // Format 1: aitryon returns image_url directly in output
      if (data.output?.image_url) {
        images = [{ url: data.output.image_url }];
      }
      // Format 2: wanx2.1-imageedit returns in choices[].message.content[]
      else if (data.output?.choices) {
        images = data.output.choices.map((choice: any) => ({
          url: choice.message?.content?.find((c: any) => c.type === 'image')?.image,
        })).filter((img: any) => img.url);
      }
      // Format 3: some APIs return results array or result_url
      else if (data.output?.result_url) {
        images = [{ url: data.output.result_url }];
      } else if (data.output?.results) {
        const results = Array.isArray(data.output.results) ? data.output.results : [data.output.results];
        images = results.map((r: any) => ({ url: r.url || r.image_url })).filter((img: any) => img.url);
      }
    }

    return {
      taskId,
      status,
      images,
      imageUrl: images[0]?.url,
      usage: data.usage,
      requestId: data.request_id,
      errorCode: data.output?.code,
      errorMessage: data.output?.message,
    };
  }

  /** 翻译 DashScope 常见错误码为中文 */
  private translateError(code: string, message: string): string {
    if (code === 'DataInspectionFailed' || message.includes('DataInspectionFailed')) {
      return '内容审核未通过，请检查输入内容后重试。';
    }
    if (code === 'Throttling' || message.includes('Throttling')) {
      return '请求过于频繁，请稍后再试。';
    }
    if (code === 'Arrearage' || message.includes('Arrearage')) {
      return '阿里云账户余额不足，请充值后重试。';
    }
    if (code === 'BadRequest.TooLarge' || message.includes('TooLarge')) {
      return '文件过大，请压缩后重试。';
    }
    if (code === 'InvalidParameter' || message.includes('InvalidParameter')) {
      return `参数错误: ${message}`;
    }
    return message || code || '未知错误';
  }
}
