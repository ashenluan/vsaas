import { Module } from '@nestjs/common';
import { ProviderRegistry } from './provider.registry';
import { QwenImageProvider } from './qwen/qwen-image.provider';
import { GrokImageProvider } from './grok/grok-image.provider';
import { GoogleImagenProvider } from './google-imagen/google-imagen.provider';
import { JimengImageProvider } from './jimeng/jimeng-image.provider';
import { SoraVideoProvider } from './sora/sora-video.provider';
import { GrokVideoProvider } from './grok/grok-video.provider';
import { JimengVideoProvider } from './jimeng/jimeng-video.provider';
import { VeoVideoProvider } from './veo/veo-video.provider';
import { QwenVoiceProvider } from './qwen/qwen-voice.provider';
import { WanS2VProvider } from './aliyun-wan/wan-s2v.provider';
import { WanR2VProvider } from './aliyun-wan/wan-r2v.provider';
import { AliyunIMSProvider } from './aliyun-ims/ims-compose.provider';

@Module({
  providers: [
    ProviderRegistry,
    // 图像生成
    QwenImageProvider,
    GrokImageProvider,
    GoogleImagenProvider,
    JimengImageProvider,
    // 视频生成
    SoraVideoProvider,
    GrokVideoProvider,
    JimengVideoProvider,
    VeoVideoProvider,
    // 声音克隆 & TTS
    QwenVoiceProvider,
    // 数字人视频
    WanS2VProvider,
    // 参考生视频
    WanR2VProvider,
    // 批量混剪
    AliyunIMSProvider,
  ],
  exports: [ProviderRegistry],
})
export class ProviderModule {}
