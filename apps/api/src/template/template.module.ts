import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { AdminTemplateController } from './admin-template.controller';

@Module({
  controllers: [TemplateController, AdminTemplateController],
})
export class TemplateModule {}
