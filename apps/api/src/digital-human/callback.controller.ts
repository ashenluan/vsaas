import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';

/**
 * 处理阿里云 IMS 异步回调通知
 * IMS 在任务完成/失败时会 POST 到此端点
 * 无需 JWT 鉴权（由阿里云服务端调用），但使用 token 验证来源
 */
@Controller('callbacks')
export class CallbackController {
  private readonly logger = new Logger(CallbackController.name);
  private readonly callbackToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: WsGateway,
    private readonly config: ConfigService,
  ) {
    this.callbackToken = this.config.get<string>('IMS_CALLBACK_TOKEN') || '';
  }

  /**
   * IMS 批量成片回调
   * 阿里云通过 UserData.NotifyAddress 配置的 URL 回调
   */
  @Post('ims')
  @HttpCode(200)
  async handleImsCallback(
    @Body() body: any,
    @Headers('x-callback-token') headerToken?: string,
  ) {
    this.logger.log(`IMS callback received: ${JSON.stringify(body).slice(0, 500)}`);

    // IMS wraps actual data inside MessageBody
    const msg = body.MessageBody || body;

    // Extract token from UserData JSON string inside MessageBody
    let userData: any = {};
    try {
      if (typeof msg.UserData === 'string') {
        userData = JSON.parse(msg.UserData);
      }
    } catch { /* ignore parse errors */ }

    // 验证回调来源（如果配置了 token）
    if (this.callbackToken) {
      const incomingToken = headerToken || userData.CallbackToken || body.CallbackToken || body.Token;
      if (incomingToken !== this.callbackToken) {
        this.logger.warn('IMS callback rejected: invalid token');
        throw new ForbiddenException('Invalid callback token');
      }
    }

    try {
      const eventType = msg.EventType || body.EventType || body.Type;
      const jobId = msg.JobId || body.JobId || body.MediaProduceJobId;
      const status = msg.Status || body.Status;

      if (!jobId) {
        this.logger.warn('IMS callback missing JobId');
        return { success: true };
      }

      // Find the generation record by externalId (supports both BATCH_COMPOSE and MIXCUT)
      const generation = await this.prisma.generation.findFirst({
        where: {
          externalId: jobId,
        },
      });

      if (!generation) {
        this.logger.warn(`No generation found for IMS jobId: ${jobId}`);
        return { success: true };
      }

      // 防止轮询已完成后回调再次覆盖
      if (generation.status === 'COMPLETED' || generation.status === 'FAILED') {
        this.logger.log(`IMS callback ignored: generation ${generation.id} already ${generation.status}`);
        return { success: true };
      }

      // Parse sub-jobs if available (can be in MessageBody or top-level)
      const subJobs = msg.SubJobList || body.SubJobList || body.SubJobs || [];
      const outputVideos = subJobs
        .filter((sj: any) => sj.Status === 'Success')
        .map((sj: any) => ({
          mediaId: sj.MediaId,
          mediaURL: sj.MediaURL,
          duration: sj.Duration,
        }));

      if (status === 'Finished' || status === 'Success') {
        await this.prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            output: {
              ...((generation.output as any) || {}),
              imsStatus: 'Finished',
              imsCallback: body,
              outputVideos,
            },
          },
        });

        // Use correct WS event based on generation mode
        const wsEvent = (generation.input as any)?.mode === 'mixcut' ? 'mixcut:progress' : 'compose:progress';
        this.ws.sendToUser(generation.userId, wsEvent, {
          jobId: generation.id,
          status: 'COMPLETED',
          progress: 100,
          message: `批量成片完成，生成 ${outputVideos.length} 个视频`,
          outputVideos,
        });

        this.logger.log(`IMS job ${jobId} completed: ${outputVideos.length} videos`);
      } else if (status === 'Failed') {
        const errorMsg = body.ErrorMessage || body.Message || 'IMS job failed';

        await this.prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMsg,
            output: {
              ...((generation.output as any) || {}),
              imsStatus: 'Failed',
              imsCallback: body,
            },
          },
        });

        const failWsEvent = (generation.input as any)?.mode === 'mixcut' ? 'mixcut:progress' : 'compose:progress';
        this.ws.sendToUser(generation.userId, failWsEvent, {
          jobId: generation.id,
          status: 'FAILED',
          progress: 0,
          message: `批量成片失败: ${errorMsg}`,
        });

        this.logger.error(`IMS job ${jobId} failed: ${errorMsg}`);
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(`IMS callback processing error: ${error.message}`, error.stack);
      return { success: true }; // Always return 200 to avoid retries
    }
  }
}
