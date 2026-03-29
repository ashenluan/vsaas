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
}
