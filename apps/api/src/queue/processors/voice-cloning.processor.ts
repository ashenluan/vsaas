import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { UserService } from '../../user/user.service';
import { WsGateway } from '../../ws/ws.gateway';

interface VoiceCloneJobData {
  voiceId: string;
  userId: string;
  sampleUrl: string;
}

@Processor('voice-cloning', { concurrency: 3 })
export class VoiceCloningProcessor extends WorkerHost {
  private readonly logger = new Logger(VoiceCloningProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<VoiceCloneJobData>): Promise<any> {
    const { voiceId, userId, sampleUrl } = job.data;
    this.logger.log(`Processing voice cloning ${voiceId}`);

    this.ws.sendToUser(userId, 'voice:status', {
      voiceId,
      status: 'PROCESSING',
      message: '正在克隆声音...',
    });

    try {
      const voiceProvider = this.providers.voiceProvider;
      const result = await voiceProvider.cloneVoice(sampleUrl, `voice_${voiceId}`);

      if (!result.voiceId) {
        throw new Error('CosyVoice API 未返回有效的 voice_id');
      }

      await this.prisma.voice.update({
        where: { id: voiceId },
        data: {
          voiceId: result.voiceId,
          status: 'READY',
          metadata: result,
        },
      });

      this.ws.sendToUser(userId, 'voice:status', {
        voiceId,
        status: 'READY',
        message: '声音克隆完成',
      });

      this.logger.log(`Voice cloning completed: ${voiceId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Voice cloning failed: ${voiceId}: ${error.message}`);

      await this.prisma.voice.update({
        where: { id: voiceId },
        data: {
          status: 'FAILED',
          metadata: { error: error.message },
        },
      });

      this.ws.sendToUser(userId, 'voice:status', {
        voiceId,
        status: 'FAILED',
        message: `声音克隆失败: ${error.message}`,
      });

      // 退款：声音克隆扣费 10 积分
      try {
        await this.userService.addCredits(
          userId,
          10,
          'REFUND',
          `退款: 声音克隆失败 - ${error.message.slice(0, 100)}`,
          voiceId,
        );
      } catch (refundErr: any) {
        this.logger.error(`Voice clone refund failed for ${voiceId}: ${refundErr.message}`);
      }

      throw error;
    }
  }
}
