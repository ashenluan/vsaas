import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, IsIn, MaxLength, MinLength } from 'class-validator';

class ReversePromptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsIn(['image', 'video'])
  type?: 'image' | 'video';
}

class PolishPromptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsIn(['image', 'video'])
  type?: 'image' | 'video';
}

class GenerateScriptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  topic!: string;

  @IsOptional()
  paragraphs?: number;
}

class RewriteCopyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  count?: number;
}

class TranscribeAudioDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  audioUrl!: string;
}

class DetectRiskWordsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('polish-prompt')
  polishPrompt(@Body() body: PolishPromptDto) {
    return this.aiService.polishPrompt(body.prompt, body.type || 'image');
  }

  @Post('reverse-prompt')
  reversePrompt(@Body() body: ReversePromptDto) {
    return this.aiService.reversePrompt(body.url, body.type || 'image');
  }

  @Post('generate-script')
  generateScript(@Body() body: GenerateScriptDto) {
    return this.aiService.generateScript(body.topic, body.paragraphs || 5);
  }

  @Post('rewrite-copy')
  rewriteCopy(@Body() body: RewriteCopyDto) {
    return this.aiService.rewriteCopy(body.text, body.count || 3);
  }

  @Post('detect-risk-words')
  detectRiskWords(@Body() body: DetectRiskWordsDto) {
    return this.aiService.detectRiskWords(body.text);
  }

  @Post('transcribe-audio')
  transcribeAudio(@Body() body: TranscribeAudioDto) {
    return this.aiService.transcribeAudio(body.audioUrl);
  }
}
